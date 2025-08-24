# ReleasePilot License Server

This server handles license validation and generation for ReleasePilot GitHub Action.

## Features

- License key validation
- Automatic license generation via Stripe webhooks
- Repository limit enforcement
- Organization-specific licensing
- Usage tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
- Install MongoDB locally or use MongoDB Atlas
- Create a database named `releasepilot`

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the server:
```bash
npm start
```

## API Endpoints

### POST /v1/license/verify
Validates a license key for a specific organization and repository.

**Request:**
```json
{
  "org": "github-org",
  "repo": "repository-name",
  "licenseKey": "RP-XXXX-XXXX-XXXX-XXXX"
}
```

**Response:**
```json
{
  "valid": true,
  "expiresAt": "2025-12-31T00:00:00Z",
  "plan": "professional",
  "organization": "github-org"
}
```

### POST /v1/license/generate (Admin Only)
Generates a new license key.

**Headers:**
```
X-Admin-Key: your-admin-key
```

**Request:**
```json
{
  "organization": "github-org",
  "email": "customer@example.com",
  "plan": "professional",
  "maxRepos": 20,
  "expiresInDays": 365
}
```

### POST /webhook/stripe
Handles Stripe webhook events for automatic license generation.

## Database Schema

### licenses Collection
```javascript
{
  key: "RP-XXXX-XXXX-XXXX-XXXX",
  organization: "github-org", // or "*" for any org
  email: "customer@example.com",
  plan: "starter|professional|enterprise",
  maxRepos: 20, // -1 for unlimited
  active: true,
  createdAt: Date,
  expiresAt: Date,
  stripeCustomerId: "cus_xxx",
  stripeSubscriptionId: "sub_xxx"
}
```

### license_usage Collection
```javascript
{
  licenseKey: "RP-XXXX-XXXX-XXXX-XXXX",
  org: "github-org",
  repo: "repository-name",
  lastUsed: Date
}
```

## Deployment

### Heroku
```bash
heroku create releasepilot-license
heroku addons:create mongolab:sandbox
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxx
heroku config:set ADMIN_KEY=secure-key
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Security Considerations

1. Always use HTTPS in production
2. Keep the ADMIN_KEY secure
3. Implement rate limiting for API endpoints
4. Use MongoDB connection with authentication
5. Validate and sanitize all inputs
6. Regular security audits

## License

MIT