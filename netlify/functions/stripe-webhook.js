const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const fetch = require('node-fetch');

// Generate license key
function generateLicenseKey() {
  const prefix = 'RP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Get tier info from price ID
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

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        
        // Only process ReleasePilot purchases
        if (session.metadata?.product !== 'releasepilot') {
          console.log('Not a ReleasePilot purchase, skipping');
          return { statusCode: 200, body: 'OK' };
        }

        console.log('Processing ReleasePilot checkout:', session.id);

        // Get customer and subscription details
        const customer = await stripe.customers.retrieve(session.customer);
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0].price.id;
        const tierInfo = getTierFromPrice(priceId);
        
        // Generate license
        const licenseKey = generateLicenseKey();
        const expiresAt = new Date(subscription.current_period_end * 1000);
        
        // License data
        const licenseData = {
          key: licenseKey,
          email: customer.email,
          org: session.metadata?.org || customer.metadata?.github_org || '*',
          tier: tierInfo.tier,
          repoLimit: tierInfo.repoLimit,
          billing: tierInfo.billing,
          expiresAt: expiresAt.toISOString(),
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          status: 'active'
        };

        console.log('License created:', licenseData);

        // TODO: Save to database (Supabase, Fauna, or MongoDB)
        // For now, we'll send an email with the license
        
        // Send license email using Netlify Email Integration or external service
        await sendLicenseEmail(customer.email, licenseKey, tierInfo.tier, expiresAt);
        
        // Send Telegram notification
        await notifyTelegram({
          customer: {
            email: customer.email,
            name: customer.name,
            country: customer.address?.country
          },
          plan: tierInfo.tier.charAt(0).toUpperCase() + tierInfo.tier.slice(1),
          amount: session.amount_total,
          currency: session.currency,
          paymentMethod: 'Card',
          licenseKey: licenseKey
        });
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        
        if (subscription.metadata?.product !== 'releasepilot') {
          return { statusCode: 200, body: 'OK' };
        }

        console.log('ReleasePilot subscription cancelled:', subscription.id);
        
        // TODO: Update license status in database
        // await updateLicenseStatus(subscription.id, 'cancelled');
        
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        if (subscription.metadata?.product !== 'releasepilot') {
          return { statusCode: 200, body: 'OK' };
        }

        console.log('ReleasePilot payment successful:', invoice.id);
        
        // Update license expiration
        const newExpiresAt = new Date(subscription.current_period_end * 1000);
        
        // TODO: Update in database
        // await updateLicenseExpiration(subscription.id, newExpiresAt);
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        
        console.log('Payment failed for:', customer.email);
        
        // TODO: Send payment failed email
        // await sendPaymentFailedEmail(customer.email);
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: 'Success' };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

// Email sending function (implement based on your email service)
async function sendLicenseEmail(email, licenseKey, tier, expiresAt) {
  console.log(`
    Sending license to: ${email}
    License Key: ${licenseKey}
    Tier: ${tier}
    Expires: ${expiresAt.toLocaleDateString()}
  `);
  
  // TODO: Implement actual email sending
  // Options:
  // 1. SendGrid: Use @sendgrid/mail
  // 2. Postmark: Use postmark package
  // 3. Netlify Email Integration
  // 4. AWS SES
  
  // For now, just log it
  return true;
}

// Send Telegram notification for new sales
async function notifyTelegram(saleData) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured, skipping notification');
    return;
  }

  try {
    const baseUrl = process.env.URL || 'https://releasepilot.io';
    const response = await fetch(`${baseUrl}/.netlify/functions/telegram-notifier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });

    if (!response.ok) {
      console.error('Failed to send Telegram notification:', await response.text());
    } else {
      console.log('Telegram notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}