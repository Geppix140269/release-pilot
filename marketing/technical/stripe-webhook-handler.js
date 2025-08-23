const Stripe = require('stripe');
const crypto = require('crypto');

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Your database connection (example with Supabase)
// const { createClient } = require('@supabase/supabase-js');
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Generates a unique license key for ReleasePilot
 */
function generateLicenseKey() {
  const prefix = 'RP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Determines the tier and limits based on the price ID
 */
function getTierFromPrice(priceId) {
  const tiers = {
    'price_1RzJbRQwo4eCAfOGMUUxMNUI': { tier: 'starter', repoLimit: 5, billing: 'monthly' },
    'price_1RzJbSQwo4eCAfOGU37DUcPk': { tier: 'starter', repoLimit: 5, billing: 'annual' },
    'price_1RzJbSQwo4eCAfOG8ynAYTvt': { tier: 'professional', repoLimit: 20, billing: 'monthly' },
    'price_1RzJbSQwo4eCAfOGoU0PqoA5': { tier: 'professional', repoLimit: 20, billing: 'annual' },
    'price_1RzJbTQwo4eCAfOG6p21rWez': { tier: 'enterprise', repoLimit: -1, billing: 'monthly' },
    'price_1RzJbTQwo4eCAfOGpC9XYYxr': { tier: 'enterprise', repoLimit: -1, billing: 'annual' }
  };
  return tiers[priceId] || { tier: 'starter', repoLimit: 5, billing: 'monthly' };
}

/**
 * Main webhook handler for Stripe events
 */
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
      
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutComplete(session) {
  // Check if this is a ReleasePilot purchase
  if (!session.metadata?.product || session.metadata.product !== 'releasepilot') {
    // This might be an Apulink purchase, ignore it
    return;
  }

  console.log('Processing ReleasePilot checkout:', session.id);

  // Get customer details
  const customer = await stripe.customers.retrieve(session.customer);
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const priceId = subscription.items.data[0].price.id;
  const tierInfo = getTierFromPrice(priceId);
  
  // Calculate expiration date
  const expiresAt = new Date(subscription.current_period_end * 1000);
  
  // Generate license key
  const licenseKey = generateLicenseKey();
  
  // Store license in database
  const licenseData = {
    key: licenseKey,
    email: customer.email,
    org: session.metadata?.org || customer.metadata?.github_org || '*',
    tier: tierInfo.tier,
    repo_limit: tierInfo.repoLimit,
    billing_period: tierInfo.billing,
    expires_at: expiresAt,
    stripe_customer_id: customer.id,
    stripe_subscription_id: subscription.id,
    status: 'active',
    created_at: new Date()
  };

  // TODO: Save to your database
  // await supabase.from('licenses').insert(licenseData);
  console.log('License created:', licenseData);
  
  // Send license email
  await sendLicenseEmail(customer.email, licenseKey, tierInfo.tier, expiresAt);
}

/**
 * Handle subscription renewal
 */
async function handlePaymentSucceeded(invoice) {
  // Check if this is a ReleasePilot subscription
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  
  if (!subscription.metadata?.product || subscription.metadata.product !== 'releasepilot') {
    return;
  }

  console.log('ReleasePilot subscription renewed:', subscription.id);
  
  // Update license expiration in database
  const newExpiresAt = new Date(subscription.current_period_end * 1000);
  
  // TODO: Update in your database
  // await supabase
  //   .from('licenses')
  //   .update({ expires_at: newExpiresAt, status: 'active' })
  //   .eq('stripe_subscription_id', subscription.id);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
  if (!subscription.metadata?.product || subscription.metadata.product !== 'releasepilot') {
    return;
  }

  console.log('ReleasePilot subscription cancelled:', subscription.id);
  
  // Mark license as cancelled (but keep it active until expiration)
  // TODO: Update in your database
  // await supabase
  //   .from('licenses')
  //   .update({ status: 'cancelled' })
  //   .eq('stripe_subscription_id', subscription.id);
  
  // Send cancellation email
  const customer = await stripe.customers.retrieve(subscription.customer);
  await sendCancellationEmail(customer.email);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  
  if (!subscription.metadata?.product || subscription.metadata.product !== 'releasepilot') {
    return;
  }

  console.log('ReleasePilot payment failed:', invoice.id);
  
  // Send payment failure email
  const customer = await stripe.customers.retrieve(invoice.customer);
  await sendPaymentFailedEmail(customer.email);
}

/**
 * Send license key email
 */
async function sendLicenseEmail(email, licenseKey, tier, expiresAt) {
  const emailContent = `
    Welcome to ReleasePilot!
    
    Your license key: ${licenseKey}
    Tier: ${tier}
    Expires: ${expiresAt.toLocaleDateString()}
    
    To activate:
    1. Add RELEASEPILOT_LICENSE as a secret in your GitHub repository
    2. Set the value to: ${licenseKey}
    3. Your action will now work with private repositories!
    
    Need help? Reply to this email or visit docs.releasepilot.io
  `;
  
  console.log('Sending license email to:', email);
  console.log(emailContent);
  
  // TODO: Integrate with your email service (SendGrid, Postmark, etc.)
  // await sendEmail({
  //   to: email,
  //   subject: 'Your ReleasePilot License Key',
  //   text: emailContent
  // });
}

/**
 * Send cancellation confirmation email
 */
async function sendCancellationEmail(email) {
  const emailContent = `
    Your ReleasePilot subscription has been cancelled.
    
    Your license will remain active until the end of your billing period.
    We're sorry to see you go! If you have feedback, please let us know.
    
    You can reactivate anytime at releasepilot.io
  `;
  
  console.log('Sending cancellation email to:', email);
  
  // TODO: Send actual email
}

/**
 * Send payment failure notification
 */
async function sendPaymentFailedEmail(email) {
  const emailContent = `
    We were unable to process your ReleasePilot payment.
    
    Please update your payment method to avoid service interruption:
    https://billing.stripe.com/p/login/xxx
    
    Your license will remain active for 7 days grace period.
  `;
  
  console.log('Sending payment failed email to:', email);
  
  // TODO: Send actual email
}

// Export for use in your API
module.exports = {
  handleStripeWebhook,
  generateLicenseKey,
  getTierFromPrice
};

// Example Express.js endpoint
/*
const express = require('express');
const app = express();

app.post('/api/stripe-webhook', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);
*/

// Example Next.js API route
/*
export default async function handler(req, res) {
  if (req.method === 'POST') {
    await handleStripeWebhook(req, res);
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
      raw: true,
    },
  },
};
*/