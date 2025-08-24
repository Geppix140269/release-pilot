const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/releasepilot';
let db;

MongoClient.connect(mongoUri, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// License validation endpoint
app.post('/v1/license/verify', async (req, res) => {
  try {
    const { org, repo, licenseKey } = req.body;
    
    if (!org || !repo || !licenseKey) {
      return res.status(400).json({
        valid: false,
        message: 'Missing required fields: org, repo, licenseKey'
      });
    }
    
    // Look up license in database
    const license = await db.collection('licenses').findOne({ 
      key: licenseKey,
      active: true 
    });
    
    if (!license) {
      return res.status(200).json({
        valid: false,
        message: 'Invalid or expired license key'
      });
    }
    
    // Check if license is expired
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return res.status(200).json({
        valid: false,
        message: 'License has expired',
        expiresAt: license.expiresAt
      });
    }
    
    // Check organization match (license can be for specific org or universal)
    if (license.organization && license.organization !== '*' && license.organization !== org) {
      return res.status(200).json({
        valid: false,
        message: 'License is not valid for this organization'
      });
    }
    
    // Check repository limit
    if (license.maxRepos && license.maxRepos !== -1) {
      const repoCount = await db.collection('license_usage').countDocuments({
        licenseKey: licenseKey,
        org: org
      });
      
      if (repoCount >= license.maxRepos) {
        // Check if this specific repo is already registered
        const existingRepo = await db.collection('license_usage').findOne({
          licenseKey: licenseKey,
          org: org,
          repo: repo
        });
        
        if (!existingRepo) {
          return res.status(200).json({
            valid: false,
            message: `License limit reached (${license.maxRepos} repositories)`
          });
        }
      } else {
        // Register this repo
        await db.collection('license_usage').updateOne(
          { licenseKey: licenseKey, org: org, repo: repo },
          { 
            $set: { 
              lastUsed: new Date(),
              licenseKey: licenseKey,
              org: org,
              repo: repo
            }
          },
          { upsert: true }
        );
      }
    }
    
    // Update last used timestamp
    await db.collection('licenses').updateOne(
      { key: licenseKey },
      { $set: { lastUsed: new Date() } }
    );
    
    return res.status(200).json({
      valid: true,
      expiresAt: license.expiresAt || null,
      plan: license.plan || 'professional',
      organization: license.organization || org
    });
    
  } catch (error) {
    console.error('License verification error:', error);
    return res.status(500).json({
      valid: false,
      message: 'Internal server error'
    });
  }
});

// License generation endpoint (protected - for admin use)
app.post('/v1/license/generate', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { 
      organization, 
      email, 
      plan = 'professional',
      maxRepos = 20,
      expiresInDays = 365,
      stripeCustomerId,
      stripeSubscriptionId
    } = req.body;
    
    // Generate license key
    const licenseKey = generateLicenseKey();
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Store in database
    await db.collection('licenses').insertOne({
      key: licenseKey,
      organization: organization || '*',
      email: email,
      plan: plan,
      maxRepos: maxRepos,
      active: true,
      createdAt: new Date(),
      expiresAt: expiresAt,
      stripeCustomerId: stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId
    });
    
    return res.status(200).json({
      success: true,
      licenseKey: licenseKey,
      expiresAt: expiresAt
    });
    
  } catch (error) {
    console.error('License generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe webhook handler for automatic license generation
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Get customer details
        const customer = await stripe.customers.retrieve(session.customer);
        
        // Determine plan based on price
        let plan = 'starter';
        let maxRepos = 5;
        
        if (session.amount_total === 4900) {
          plan = 'professional';
          maxRepos = 20;
        } else if (session.amount_total === 19900) {
          plan = 'enterprise';
          maxRepos = -1; // Unlimited
        }
        
        // Generate license
        const licenseKey = generateLicenseKey();
        
        await db.collection('licenses').insertOne({
          key: licenseKey,
          organization: customer.metadata?.organization || '*',
          email: customer.email,
          plan: plan,
          maxRepos: maxRepos,
          active: true,
          createdAt: new Date(),
          expiresAt: null, // No expiration for now
          stripeCustomerId: session.customer,
          stripeSessionId: session.id
        });
        
        // TODO: Send license key via email
        console.log(`Generated license ${licenseKey} for ${customer.email}`);
        
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        
        // Deactivate license
        await db.collection('licenses').updateMany(
          { stripeSubscriptionId: subscription.id },
          { $set: { active: false, deactivatedAt: new Date() } }
        );
        
        console.log(`Deactivated licenses for subscription ${subscription.id}`);
        break;
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'ReleasePilot License Server',
    timestamp: new Date().toISOString()
  });
});

// Generate a secure license key
function generateLicenseKey() {
  const prefix = 'RP';
  const randomBytes = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '');
  
  // Format: RP-XXXX-XXXX-XXXX-XXXX
  const chunks = randomBytes.match(/.{1,4}/g) || [];
  return `${prefix}-${chunks.slice(0, 4).join('-')}`.toUpperCase();
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});

module.exports = app;