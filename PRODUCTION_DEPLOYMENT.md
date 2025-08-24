# ReleasePilot Production Deployment Guide

## Overview
Complete guide for deploying ReleasePilot to production with Netlify, Stripe, and Telegram integrations.

## Prerequisites
- Netlify account
- Stripe account (with verified business)
- Telegram Bot Token
- MongoDB Atlas account (optional, for analytics)
- Domain name (optional)

## Step 1: Stripe Configuration

### 1.1 Create Stripe Products
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Products > Add Product
3. Create three products:
   - **Starter Plan** ($19/month)
   - **Professional Plan** ($49/month)
   - **Enterprise Plan** ($199/month)

### 1.2 Configure Webhook
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.netlify.app/.netlify/functions/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

### 1.3 Get API Keys
- Copy your **Publishable key** (starts with `pk_`)
- Copy your **Secret key** (starts with `sk_`)

## Step 2: Telegram Bot Setup

### 2.1 Create Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Choose bot name: `ReleasePilot Notifications`
4. Choose username: `releasepilot_notify_bot`
5. Copy the bot token

### 2.2 Get Chat ID
1. Add your bot to a group or start a conversation
2. Send a test message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find and copy your chat ID

## Step 3: MongoDB Setup (Optional)

### 3.1 Create MongoDB Atlas Cluster
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Add database user
4. Whitelist IP: `0.0.0.0/0` (for Netlify functions)
5. Get connection string

## Step 4: Netlify Deployment

### 4.1 Deploy from GitHub
1. Push code to GitHub repository
2. Log into [Netlify](https://app.netlify.com)
3. Click "New site from Git"
4. Connect GitHub and select repository
5. Build settings:
   - Build command: `npm run build` (if applicable)
   - Publish directory: `/`

### 4.2 Environment Variables
Go to Site Settings > Environment Variables and add:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY

# Telegram Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# MongoDB (Optional)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/releasepilot
ANALYTICS_DB=releasepilot

# Site URL
URL=https://your-domain.netlify.app
```

### 4.3 Function Dependencies
Create `netlify/functions/package.json`:

```json
{
  "name": "netlify-functions",
  "version": "1.0.0",
  "dependencies": {
    "stripe": "^14.0.0",
    "node-fetch": "^2.6.9",
    "mongodb": "^6.0.0"
  }
}
```

## Step 5: Configure Daily Reports

### 5.1 Netlify Scheduled Functions
Create `netlify.toml` configuration:

```toml
[build]
  functions = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[functions."daily-report"]
  schedule = "0 9 * * *"  # Daily at 9 AM UTC
```

### 5.2 Manual Trigger
You can manually trigger the daily report:
```bash
curl -X POST https://your-domain.netlify.app/.netlify/functions/daily-report
```

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain
1. Go to Domain Settings in Netlify
2. Add custom domain
3. Configure DNS:
   - A Record: Point to Netlify's IP
   - CNAME: www to your-site.netlify.app

### 6.2 Enable HTTPS
- Netlify automatically provisions Let's Encrypt SSL
- Force HTTPS in domain settings

## Step 7: Testing

### 7.1 Test Stripe Integration
1. Use test mode first
2. Test card: `4242 4242 4242 4242`
3. Verify webhook receives events
4. Check Telegram notifications

### 7.2 Test Analytics
1. Visit your site
2. Check browser console for analytics calls
3. Verify data in MongoDB (if configured)

### 7.3 Test Daily Reports
```bash
# Manually trigger daily report
curl -X POST https://your-domain.netlify.app/.netlify/functions/daily-report
```

## Step 8: Monitoring

### 8.1 Netlify Functions Logs
- View in Netlify Dashboard > Functions tab
- Real-time logs for debugging

### 8.2 Stripe Dashboard
- Monitor successful payments
- Check failed payments
- Review subscription status

### 8.3 Telegram Notifications
You'll receive instant notifications for:
- New license purchases
- Daily traffic reports (9 AM UTC)
- Payment failures (if configured)

## Production Checklist

- [ ] Stripe in live mode
- [ ] All environment variables set
- [ ] Webhook endpoint verified
- [ ] Telegram bot connected
- [ ] SSL certificate active
- [ ] Analytics tracking working
- [ ] Daily reports scheduled
- [ ] Error monitoring configured
- [ ] Backup strategy in place

## Troubleshooting

### Telegram Not Sending
- Verify bot token and chat ID
- Check Netlify function logs
- Ensure bot has message permissions

### Stripe Webhooks Failing
- Verify webhook secret
- Check endpoint URL
- Review Stripe webhook logs

### Analytics Not Recording
- Check browser console for errors
- Verify MongoDB connection string
- Check CORS settings

## Security Best Practices

1. **API Keys**: Never commit keys to Git
2. **Webhook Validation**: Always verify Stripe signatures
3. **Rate Limiting**: Implement for public endpoints
4. **CORS**: Configure appropriate origins
5. **MongoDB**: Use connection with SSL
6. **Telegram**: Keep bot token secret

## Support

For issues or questions:
- Email: support@releasepilot.io
- GitHub Issues: [github.com/Geppix140269/release-pilot](https://github.com/Geppix140269/release-pilot)

## License

Copyright 2025 ReleasePilot. All rights reserved.