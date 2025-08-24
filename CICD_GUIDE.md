# 🚀 ReleasePilot CI/CD Guide

## Complete DevOps Automation with Environment-Based Deployments

ReleasePilot now includes comprehensive CI/CD capabilities that automatically deploy your application based on which branch you merge to, with support for multiple cloud providers and deployment strategies.

## Table of Contents
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment Providers](#deployment-providers)
- [Deployment Strategies](#deployment-strategies)
- [Advanced Features](#advanced-features)
- [Examples](#examples)

## Quick Start

### Basic Setup (3 Steps)

1. **Create `.releasepilot.yml` in your repository:**

```yaml
projectName: MyApp
versionFile: package.json

# Basic deployment configuration
deployments:
  development:
    branch: develop
    provider: vercel
    strategy: direct
    autoApprove: true
    secrets:
      VERCEL_TOKEN: ${VERCEL_TOKEN}
    
  production:
    branch: main
    provider: aws
    strategy: blue-green
    autoApprove: false
    approvers: [tech-lead]
    rollbackOnFailure: true
    secrets:
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
```

2. **Add secrets to GitHub:**
```bash
# Go to Settings → Secrets → Actions
# Add your deployment credentials:
- VERCEL_TOKEN
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
```

3. **Push to trigger deployment:**
```bash
git push origin develop  # Deploys to development
git push origin main     # Deploys to production
```

## Environment Configuration

### Branch-Based Deployments

ReleasePilot automatically deploys based on the branch you push to:

| Branch | Environment | Common Use |
|--------|-------------|------------|
| `develop` | Development | Latest features, unstable |
| `staging` | Staging | Pre-production testing |
| `main` | Production | Live application |
| `feature/*` | Preview | Feature branch previews |
| `hotfix/*` | Production | Emergency fixes |

### Environment Configuration Options

```yaml
deployments:
  environment_name:
    branch: branch_name          # Branch that triggers deployment
    provider: provider_name      # Cloud provider (aws, azure, gcp, etc.)
    strategy: deployment_strategy # Deployment strategy
    autoApprove: boolean         # Auto-deploy without approval
    approvers: [user_list]       # Required approvers
    url: deployment_url          # Application URL
    healthCheck: health_url      # Health check endpoint
    rollbackOnFailure: boolean   # Auto-rollback on failure
    secrets: {}                  # Secret environment variables
    variables: {}                # Public environment variables
    preDeployCommand: string     # Commands before deployment
    postDeployCommand: string    # Commands after deployment
```

## Deployment Providers

### AWS
```yaml
provider: aws
variables:
  AWS_REGION: us-east-1
  SERVICE: elasticbeanstalk  # or ecs, lambda
  APP_NAME: myapp
  S3_BUCKET: deployments
```

### Kubernetes
```yaml
provider: kubernetes
variables:
  K8S_NAMESPACE: production
  K8S_DEPLOYMENT: myapp
  REGISTRY: gcr.io/project
  IMAGE: myapp
```

### Vercel
```yaml
provider: vercel
variables:
  VERCEL_PROJECT_ID: prj_xxx
  VERCEL_TEAM_ID: team_xxx
```

### Netlify
```yaml
provider: netlify
variables:
  NETLIFY_SITE_ID: site_xxx
```

### Docker
```yaml
provider: docker
variables:
  DOCKER_REGISTRY: docker.io
  DOCKER_IMAGE: myapp
  SERVICE_NAME: myapp-service
```

### Azure
```yaml
provider: azure
variables:
  AZURE_RESOURCE_GROUP: myapp-rg
  AZURE_APP_NAME: myapp
  SERVICE: appservice  # or container, functions
```

### Google Cloud Platform
```yaml
provider: gcp
variables:
  GCP_PROJECT: my-project
  GCP_REGION: us-central1
  SERVICE: cloudrun  # or appengine, functions
```

### Heroku
```yaml
provider: heroku
variables:
  HEROKU_APP_NAME: myapp
```

## Deployment Strategies

### 1. Direct Deployment
Immediately replaces the old version with the new one.

```yaml
strategy: direct
```

**Best for:** Development environments, simple applications

### 2. Blue-Green Deployment
Creates a parallel environment, tests it, then switches traffic.

```yaml
strategy: blue-green
variables:
  TARGET_GROUP: arn:aws:elasticloadbalancing:...
```

**Best for:** Zero-downtime deployments, easy rollback

### 3. Canary Deployment
Gradually rolls out to a percentage of users.

```yaml
strategy: canary
variables:
  CANARY_PERCENTAGE: 10  # Start with 10% of traffic
```

**Best for:** Risk mitigation, gradual rollout

### 4. Rolling Deployment
Updates instances in batches.

```yaml
strategy: rolling
variables:
  BATCH_SIZE: 33  # Update 33% at a time
  MAX_SURGE: 25%
  MAX_UNAVAILABLE: 0
```

**Best for:** Large deployments, resource optimization

## Advanced Features

### Multi-Region Deployment

Deploy to multiple regions sequentially or in parallel:

```yaml
multiRegionDeployment:
  enabled: true
  strategy: sequential
  delayBetweenRegions: 300
  regions:
    - name: us-east-1
      primary: true
      url: https://us.myapp.com
    - name: eu-west-1
      url: https://eu.myapp.com
    - name: ap-southeast-1
      url: https://asia.myapp.com
```

### Database Migrations

Automatically run database migrations:

```yaml
migrations:
  enabled: true
  provider: flyway
  autoRun: true
  rollbackOnFailure: true
  config:
    url: ${DATABASE_URL}
    locations: filesystem:./migrations
```

### Security Scanning

Run security scans before deployment:

```yaml
security:
  enabled: true
  scanners:
    - type: dependency
      tool: snyk
      failOnHighSeverity: true
    - type: container
      tool: trivy
      failOnHighSeverity: false
```

### Performance Testing

Validate performance after deployment:

```yaml
performance:
  enabled: true
  tool: k6
  thresholds:
    p95ResponseTime: 500
    errorRate: 0.01
    throughput: 1000
```

### Feature Flags

Sync feature flags on deployment:

```yaml
featureFlags:
  provider: launchdarkly
  enabled: true
  syncOnDeploy: true
  environments:
    development: dev-key
    production: prod-key
```

### Compliance & Change Windows

Enforce deployment windows:

```yaml
compliance:
  enabled: true
  changeWindow:
    enabled: true
    timezone: America/New_York
    allowedDays: [Mon, Tue, Wed, Thu]
    allowedHours: "09:00-17:00"
    blackoutDates:
      - 2024-12-25
      - 2024-01-01
```

## Examples

### Example 1: Simple Node.js App

```yaml
projectName: NodeApp
versionFile: package.json

deployments:
  development:
    branch: develop
    provider: heroku
    strategy: direct
    autoApprove: true
    variables:
      HEROKU_APP_NAME: nodeapp-dev
    preDeployCommand: npm test

  production:
    branch: main
    provider: heroku
    strategy: direct
    autoApprove: false
    approvers: [john, jane]
    variables:
      HEROKU_APP_NAME: nodeapp-prod
    preDeployCommand: |
      npm test
      npm run test:e2e
```

### Example 2: Microservices on Kubernetes

```yaml
projectName: Microservices
versionFile: package.json

deployments:
  staging:
    branch: staging
    provider: kubernetes
    strategy: canary
    variables:
      K8S_NAMESPACE: staging
      K8S_DEPLOYMENT: api-service
      REGISTRY: gcr.io/myproject
      IMAGE: api
      CANARY_PERCENTAGE: 20
    preDeployCommand: |
      docker build -t gcr.io/myproject/api:${VERSION} .
      docker push gcr.io/myproject/api:${VERSION}

  production:
    branch: main
    provider: kubernetes
    strategy: blue-green
    approvers: [devops-team]
    rollbackOnFailure: true
    variables:
      K8S_NAMESPACE: production
      K8S_DEPLOYMENT: api-service
      REGISTRY: gcr.io/myproject
      IMAGE: api
```

### Example 3: Static Website

```yaml
projectName: MarketingSite
versionFile: package.json

deployments:
  preview:
    branch: /^feature\/.*/
    provider: netlify
    strategy: direct
    autoApprove: true
    variables:
      NETLIFY_SITE_ID: preview-site

  production:
    branch: main
    provider: netlify
    strategy: direct
    variables:
      NETLIFY_SITE_ID: production-site
    postDeployCommand: |
      npm run lighthouse
      npm run invalidate-cdn
```

### Example 4: Serverless Functions

```yaml
projectName: APIFunctions
versionFile: package.json

deployments:
  development:
    branch: develop
    provider: aws
    strategy: direct
    variables:
      SERVICE: lambda
      LAMBDA_FUNCTION: api-dev
      S3_BUCKET: lambda-deployments

  production:
    branch: main
    provider: aws
    strategy: canary
    variables:
      SERVICE: lambda
      LAMBDA_FUNCTION: api-prod
      S3_BUCKET: lambda-deployments
      CANARY_PERCENTAGE: 5
    rollbackOnFailure: true
```

## Workflow Integration

### Complete GitHub Actions Workflow

```yaml
name: CI/CD Pipeline
on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [develop, staging, main]
    tags: ['v*.*.*']

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build

  release-deploy:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: ReleasePilot - Release & Deploy
        uses: your-org/release-pilot@v1
        with:
          mode: auto
          github_token: ${{ secrets.GITHUB_TOKEN }}
        env:
          # License (for private repos)
          RELEASEPILOT_LICENSE: ${{ secrets.RELEASEPILOT_LICENSE }}
          
          # AI Summaries
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
          # Notifications
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
          
          # AWS Deployment
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
          # Kubernetes Deployment
          KUBECONFIG: ${{ secrets.KUBECONFIG }}
          
          # Vercel Deployment
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          
          # Netlify Deployment
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Monitoring & Rollback

### Health Checks

ReleasePilot automatically runs health checks after deployment:

```yaml
healthCheck: https://myapp.com/health
rollbackOnFailure: true
```

### Manual Rollback

If automatic rollback fails, manually rollback:

```bash
# Kubernetes
kubectl rollout undo deployment/myapp -n production

# AWS ECS
aws ecs update-service --cluster prod --service myapp --force-new-deployment

# Heroku
heroku rollback -a myapp

# Vercel
vercel rollback
```

## Best Practices

1. **Start with Development:** Test deployment configuration in development first
2. **Use Health Checks:** Always configure health check endpoints
3. **Enable Rollback:** Set `rollbackOnFailure: true` for production
4. **Gradual Rollout:** Use canary deployments for risky changes
5. **Approval Gates:** Require approval for production deployments
6. **Monitor Metrics:** Track deployment success rate and duration
7. **Test Commands:** Use `preDeployCommand` to run tests
8. **Validate After:** Use `postDeployCommand` for smoke tests

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Deployment fails | Check logs, ensure credentials are correct |
| Health check fails | Verify endpoint, increase timeout |
| Rollback fails | Manual intervention may be required |
| Wrong environment | Check branch mapping in config |
| Missing secrets | Add to GitHub Secrets |

### Debug Mode

Enable debug logging:

```yaml
- name: ReleasePilot
  uses: your-org/release-pilot@v1
  env:
    ACTIONS_STEP_DEBUG: true
```

## Security Considerations

1. **Use GitHub Secrets:** Never commit credentials
2. **Limit Approvers:** Restrict production deployment approvers
3. **Enable Audit Logs:** Track all deployments
4. **Scan Before Deploy:** Run security scans
5. **Use IAM Roles:** Prefer roles over keys when possible
6. **Rotate Credentials:** Regularly update secrets

## Cost Optimization

1. **Use Spot Instances:** For development environments
2. **Auto-scaling:** Configure based on load
3. **Schedule Environments:** Shut down dev/staging at night
4. **Resource Limits:** Set CPU/memory limits
5. **Monitor Usage:** Track deployment costs

---

## Support

- **Documentation:** [releasepilot.io/docs](https://releasepilot.io/docs)
- **Issues:** [GitHub Issues](https://github.com/your-org/release-pilot/issues)
- **Email:** support@releasepilot.io

---

**ReleasePilot CI/CD** - From commit to production in minutes, not hours! 🚀