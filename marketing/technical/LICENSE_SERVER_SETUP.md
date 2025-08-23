# License Server Implementation Guide

## Quick Start: Vercel Deployment (Recommended)

### Step 1: Create Vercel Project

```bash
mkdir release-pilot-api
cd release-pilot-api
npm init -y
npm install @vercel/node @supabase/supabase-js stripe
```

### Step 2: License Validation Endpoint

Create `api/verify.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { org, repo, licenseKey } = req.body;

  if (!org || !repo || !licenseKey) {
    return res.status(400).json({ 
      valid: false, 
      message: 'Missing required parameters' 
    });
  }

  try {
    // Check license in database
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', licenseKey)
      .single();

    if (error || !license) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Invalid license key' 
      });
    }

    // Check if license is expired
    const now = new Date();
    const expiresAt = new Date(license.expires_at);
    
    if (expiresAt < now) {
      return res.status(200).json({ 
        valid: false, 
        message: 'License expired' 
      });
    }

    // Check if org matches (or license is universal)
    if (license.org && license.org !== org && license.org !== '*') {
      return res.status(200).json({ 
        valid: false, 
        message: 'License not valid for this organization' 
      });
    }

    // Check repo limit
    if (license.repo_limit && license.repo_limit !== -1) {
      const { count } = await supabase
        .from('license_usage')
        .select('*', { count: 'exact' })
        .eq('license_id', license.id)
        .eq('repo', repo);
      
      if (count >= license.repo_limit) {
        return res.status(200).json({ 
          valid: false, 
          message: 'Repository limit exceeded' 
        });
      }
    }

    // Log usage
    await supabase
      .from('license_usage')
      .upsert({ 
        license_id: license.id, 
        org, 
        repo, 
        last_used: new Date() 
      });

    // Return success
    return res.status(200).json({ 
      valid: true,
      expiresAt: license.expires_at,
      tier: license.tier
    });

  } catch (error) {
    console.error('License validation error:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Internal server error' 
    });
  }
}
```

### Step 3: Stripe Webhook for License Generation

Create `api/stripe-webhook.js`:

```javascript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateLicenseKey() {
  return 'RP-' + crypto.randomBytes(16).toString('hex').toUpperCase();
}

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Get customer details
    const customer = await stripe.customers.retrieve(session.customer);
    
    // Determine tier based on price
    let tier = 'starter';
    let repoLimit = 5;
    let expiryMonths = 1;
    
    if (session.amount_total >= 19900) { // $199
      tier = 'enterprise';
      repoLimit = -1; // unlimited
      expiryMonths = 1;
    } else if (session.amount_total >= 4900) { // $49
      tier = 'professional';
      repoLimit = 10;
      expiryMonths = 1;
    }
    
    // Generate license
    const licenseKey = generateLicenseKey();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);
    
    // Store in database
    const { data: license, error } = await supabase
      .from('licenses')
      .insert({
        key: licenseKey,
        email: customer.email,
        org: customer.metadata.org || '*',
        tier: tier,
        repo_limit: repoLimit,
        expires_at: expiresAt,
        stripe_customer_id: customer.id,
        stripe_subscription_id: session.subscription
      })
      .single();
    
    // Send email with license key
    await sendLicenseEmail(customer.email, licenseKey, tier, expiresAt);
  }

  res.json({ received: true });
}

async function sendLicenseEmail(email, licenseKey, tier, expiresAt) {
  // Use SendGrid, Postmark, or any email service
  console.log(`Sending license ${licenseKey} to ${email}`);
}
```

### Step 4: Database Schema (Supabase)

```sql
-- Licenses table
CREATE TABLE licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  org VARCHAR(255) DEFAULT '*',
  tier VARCHAR(50) NOT NULL,
  repo_limit INTEGER DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE license_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID REFERENCES licenses(id),
  org VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  last_used TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_id, org, repo)
);

-- Indexes for performance
CREATE INDEX idx_licenses_key ON licenses(key);
CREATE INDEX idx_licenses_email ON licenses(email);
CREATE INDEX idx_usage_license ON license_usage(license_id);
```

### Step 5: Environment Variables

Create `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
SENDGRID_API_KEY=SG...
```

### Step 6: Deploy to Vercel

```bash
npm install -g vercel
vercel

# Follow prompts, then:
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add STRIPE_SECRET_KEY
# Add all env vars

vercel --prod
```

Your API will be available at: `https://your-project.vercel.app/api/verify`

---

## Alternative: AWS Lambda Setup

### CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  LicenseTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: release-pilot-licenses
      AttributeDefinitions:
        - AttributeName: licenseKey
          AttributeType: S
        - AttributeName: email
          AttributeType: S
      KeySchema:
        - AttributeName: licenseKey
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: EmailIndex
          KeySchema:
            - AttributeName: email
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      BillingMode: PAY_PER_REQUEST

  VerifyLicenseFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: verify.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref LicenseTable
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref LicenseTable
      Events:
        Api:
          Type: Api
          Properties:
            Path: /verify
            Method: POST

  StripeWebhookFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: stripe.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref LicenseTable
          STRIPE_SECRET: !Ref StripeSecret
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref LicenseTable
```

---

## Simple PHP Version (Budget Option)

```php
<?php
// api/verify.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$input = json_decode(file_get_contents('php://input'), true);
$org = $input['org'] ?? '';
$repo = $input['repo'] ?? '';
$licenseKey = $input['licenseKey'] ?? '';

// Connect to MySQL
$db = new mysqli('localhost', 'user', 'pass', 'licenses');

$stmt = $db->prepare("
  SELECT * FROM licenses 
  WHERE license_key = ? 
  AND expires_at > NOW()
  AND (org = ? OR org = '*')
");

$stmt->bind_param("ss", $licenseKey, $org);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
  echo json_encode([
    'valid' => true,
    'expiresAt' => $row['expires_at']
  ]);
} else {
  echo json_encode([
    'valid' => false,
    'message' => 'Invalid or expired license'
  ]);
}
?>
```

---

## Testing Your License Server

```bash
# Test validation endpoint
curl -X POST https://your-api.vercel.app/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "org": "test-org",
    "repo": "test-repo",
    "licenseKey": "RP-TEST123"
  }'

# Expected response:
# {"valid": true, "expiresAt": "2025-12-31"}
```

---

## Update ReleasePilot Code

In `src/license.ts`, update the API URL:

```typescript
const LICENSE_API_URL = 'https://your-api.vercel.app/api/verify';
```

---

## Manual License Management (MVP)

For quick start without automation:

1. Use Google Sheets to track licenses
2. Manually add license keys after Gumroad purchase
3. Use Zapier to sync Sheet → Supabase
4. Send license keys via email manually

This gets you started immediately while you build automation!