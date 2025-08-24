# ReleasePilot Deployment Guide

## 🚀 Complete Deployment Checklist

This guide will walk you through deploying ReleasePilot as a production-ready GitHub Action marketplace product.

## Prerequisites

- [ ] GitHub account with marketplace access
- [ ] Stripe account for payment processing
- [ ] MongoDB database (Atlas recommended)
- [ ] Domain name for license server
- [ ] SSL certificate for HTTPS

## Step 1: Deploy License Server

### Option A: Deploy to Heroku (Recommended for Quick Start)

```bash
# Clone the repository
git clone https://github.com/your-org/release-pilot.git
cd release-pilot/license-server

# Create Heroku app
heroku create releasepilot-license-api

# Add MongoDB
heroku addons:create mongolab:shared-cluster-1

# Set environment variables
heroku config:set STRIPE_SECRET_KEY="sk_live_..."
heroku config:set STRIPE_WEBHOOK_SECRET="whsec_..."
heroku config:set ADMIN_KEY="$(openssl rand -hex 32)"

# Deploy
git push heroku main

# Note the URL
echo "License API URL: https://releasepilot-license-api.herokuapp.com"
```

### Option B: Deploy to AWS/DigitalOcean

1. **Set up server:**
```bash
# Create Ubuntu 22.04 instance
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb

# Clone repository
git clone https://github.com/your-org/release-pilot.git
cd release-pilot/license-server

# Install dependencies
npm install

# Set up PM2 for process management
sudo npm install -g pm2

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Start server
pm2 start server.js --name releasepilot-license
pm2 save
pm2 startup
```

2. **Configure Nginx:**
```nginx
server {
    listen 80;
    server_name api.releasepilot.io;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Set up SSL with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.releasepilot.io
```

## Step 2: Update License Server URL

Edit `src/license.ts` and update the API URL:

```typescript
const LICENSE_API_URL = 'https://api.releasepilot.io/v1/license/verify';
```

Rebuild the action:
```bash
npm run build
```

## Step 3: Configure Stripe

1. **Create Products in Stripe Dashboard:**
   - Starter Plan: $19/month
   - Professional Plan: $49/month
   - Enterprise Plan: $199/month

2. **Set up Webhook:**
   - URL: `https://api.releasepilot.io/webhook/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`

3. **Update Payment Links in `index.html`:**
```javascript
const paymentLinks = {
  starter: 'https://buy.stripe.com/your-starter-link',
  professional: 'https://buy.stripe.com/your-professional-link'
};
```

## Step 4: Deploy Marketing Website

### Deploy to Netlify

1. **Connect GitHub Repository:**
   - Log in to Netlify
   - Click "New site from Git"
   - Select your repository

2. **Configure Build Settings:**
   - Build command: (leave empty)
   - Publish directory: `/`

3. **Set up Custom Domain:**
   - Add domain in Netlify settings
   - Update DNS records

4. **Environment Variables:**
   - Add any required environment variables in Netlify settings

## Step 5: Publish to GitHub Marketplace

1. **Prepare Repository:**
```bash
# Ensure action.yml is correct
# Ensure dist/index.js is built and committed
git add dist/index.js
git commit -m "Build production bundle"
git push origin main
```

2. **Create Release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

3. **Submit to Marketplace:**
   - Go to https://github.com/marketplace/actions/new
   - Select your repository
   - Choose pricing model (Free)
   - Add categories: "Continuous Integration", "Publishing"
   - Add description and screenshots
   - Submit for review

## Step 6: Test End-to-End

### Test Public Repository (Free)
```yaml
name: Test ReleasePilot
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/release-pilot@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Test Private Repository (Licensed)
```yaml
name: Test ReleasePilot Licensed
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/release-pilot@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          RELEASEPILOT_LICENSE: ${{ secrets.RELEASEPILOT_LICENSE }}
```

## Step 7: Generate Test Licenses

```bash
# Generate a test license via API
curl -X POST https://api.releasepilot.io/v1/license/generate \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "organization": "test-org",
    "email": "test@example.com",
    "plan": "professional",
    "maxRepos": 20,
    "expiresInDays": 30
  }'
```

## Step 8: Monitor and Maintain

### Set up Monitoring

1. **Application Monitoring (Sentry):**
```javascript
// Add to license-server/server.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "your-sentry-dsn" });
```

2. **Uptime Monitoring (UptimeRobot):**
   - Monitor: https://api.releasepilot.io/health
   - Alert: Email/Slack on downtime

3. **Analytics (Google Analytics):**
   - Add to marketing website
   - Track conversions and usage

### Database Backups

```bash
# Set up daily MongoDB backups
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Or use MongoDB Atlas automated backups
```

## Step 9: Customer Support

1. **Set up Support Email:**
   - support@releasepilot.io
   - Use help desk software (Freshdesk/Zendesk)

2. **Create Documentation:**
   - User guide
   - FAQ section
   - Video tutorials

3. **Community:**
   - GitHub Discussions
   - Discord server

## Step 10: Launch Strategy

### Soft Launch (Week 1)
- [ ] Test with 5-10 beta users
- [ ] Gather feedback
- [ ] Fix critical issues

### Public Launch (Week 2)
- [ ] Submit to GitHub Marketplace
- [ ] Announce on social media
- [ ] Post on relevant forums (dev.to, Reddit)
- [ ] Create Product Hunt launch

### Growth (Ongoing)
- [ ] Content marketing (blog posts)
- [ ] Partner with CI/CD tools
- [ ] Offer enterprise plans
- [ ] Add new features based on feedback

## Production Checklist

### Security
- [ ] HTTPS enabled on all endpoints
- [ ] Environment variables secured
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] SQL injection prevention
- [ ] XSS protection

### Performance
- [ ] CDN for static assets
- [ ] Database indexes created
- [ ] Caching implemented
- [ ] Minified JavaScript/CSS
- [ ] Optimized images

### Legal
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] License Agreement
- [ ] GDPR compliance
- [ ] Cookie policy

### Business
- [ ] Stripe account verified
- [ ] Tax configuration
- [ ] Refund policy
- [ ] Support channels ready
- [ ] Analytics tracking

## Troubleshooting

### Common Issues

1. **License validation fails:**
   - Check MongoDB connection
   - Verify API URL in action
   - Check license key format

2. **Stripe webhooks not working:**
   - Verify webhook secret
   - Check webhook logs in Stripe
   - Ensure server is accessible

3. **Action fails in workflow:**
   - Check GitHub token permissions
   - Verify dist/index.js is up to date
   - Check action logs for errors

## Revenue Projections

Based on market analysis:
- **Month 1:** 10-20 customers ($200-500)
- **Month 3:** 50-100 customers ($1,000-3,000)
- **Month 6:** 200-500 customers ($5,000-15,000)
- **Year 1:** 1000+ customers ($20,000-50,000)

## Support Contacts

- **Technical Issues:** dev@releasepilot.io
- **Sales:** sales@releasepilot.io
- **General:** support@releasepilot.io

---

🎉 **Congratulations!** You've successfully deployed ReleasePilot. Monitor your metrics, listen to user feedback, and iterate quickly to grow your customer base.