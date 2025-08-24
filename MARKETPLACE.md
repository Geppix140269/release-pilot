# ReleasePilot - AI-Powered CI/CD Automation

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-releasepilot-purple)](https://github.com/marketplace/actions/releasepilot)
[![Website](https://img.shields.io/badge/website-releasepilot.net-green)](https://releasepilot.net)

## Complete DevOps Automation in One GitHub Action

ReleasePilot is the most comprehensive CI/CD automation tool for GitHub Actions, combining AI-powered PR summaries, semantic versioning, changelog management, and multi-cloud deployments into a single, powerful action.

### Key Features

- **AI-Powered PR Summaries**: Automatically generate comprehensive PR descriptions using GPT-4 or Claude
- **Semantic Versioning**: Auto-calculate version bumps based on conventional commits
- **Changelog Management**: Keep your CHANGELOG.md always up-to-date
- **Multi-Cloud Deployments**: Deploy to AWS, Azure, GCP, Kubernetes, Docker, Vercel, Netlify, or Heroku
- **Advanced Strategies**: Blue-green, canary, and rolling deployments with automatic rollback
- **Team Notifications**: Slack, Teams, and webhook notifications for all events

## Quick Start

```yaml
name: Release & Deploy
on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: ReleasePilot
        uses: geppix140269/release-pilot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
```

## Multi-Cloud Deployment Example

```yaml
- name: Deploy with ReleasePilot
  uses: geppix140269/release-pilot@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    deployment_config: |
      {
        "production": {
          "branch": "main",
          "provider": "aws",
          "strategy": "blue-green",
          "region": "us-east-1",
          "service": "my-app"
        },
        "staging": {
          "branch": "develop",
          "provider": "kubernetes",
          "strategy": "canary",
          "cluster": "staging-cluster"
        }
      }
```

## Supported Cloud Providers

| Provider | Services | Strategies |
|----------|----------|------------|
| **AWS** | ECS, Lambda, Elastic Beanstalk | Blue-Green, Canary, Rolling |
| **Azure** | App Service, Functions, AKS | Blue-Green, Canary, Rolling |
| **Google Cloud** | Cloud Run, App Engine, GKE | Blue-Green, Canary, Rolling |
| **Kubernetes** | Any K8s Cluster | Blue-Green, Canary, Rolling |
| **Docker** | Registry & Swarm | Direct, Rolling |
| **Vercel** | Next.js & Frontend | Direct |
| **Netlify** | Static Sites & JAMstack | Direct |
| **Heroku** | Apps & Containers | Blue-Green, Rolling |

## Configuration

### Basic Configuration

```yaml
inputs:
  # Core Features
  github_token: ${{ secrets.GITHUB_TOKEN }}
  
  # AI Providers (choose one or both)
  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
  
  # Notifications
  slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
  teams_webhook: ${{ secrets.TEAMS_WEBHOOK }}
  
  # Deployment Configuration
  deployment_config: |
    {
      "production": {
        "branch": "main",
        "provider": "aws",
        "strategy": "blue-green"
      }
    }
```

### Advanced Configuration

Create a `.releasepilot.yml` file in your repository:

```yaml
version: 1.0

# AI Configuration
ai:
  provider: openai  # or anthropic
  model: gpt-4      # or claude-3
  temperature: 0.7

# Versioning Rules
versioning:
  strategy: conventional  # or semantic
  major_keywords:
    - BREAKING CHANGE
    - major
  minor_keywords:
    - feat
    - feature
  patch_keywords:
    - fix
    - bugfix
    - patch

# Changelog Configuration
changelog:
  path: CHANGELOG.md
  format: keepachangelog  # or conventional
  categories:
    - Added
    - Changed
    - Deprecated
    - Removed
    - Fixed
    - Security

# Deployment Configuration
deployments:
  production:
    branch: main
    provider: aws
    strategy: blue-green
    region: us-east-1
    service: my-app-prod
    health_check_url: https://api.example.com/health
    rollback_on_failure: true
    
  staging:
    branch: develop
    provider: kubernetes
    strategy: canary
    cluster: staging-cluster
    namespace: staging
    canary_percentage: 20
    canary_duration: 5m

# Notification Configuration
notifications:
  slack:
    webhook: ${SLACK_WEBHOOK}
    channels:
      success: "#deployments"
      failure: "#alerts"
    
  teams:
    webhook: ${TEAMS_WEBHOOK}
    
  custom_webhooks:
    - url: https://hooks.example.com/deploy
      events: [deploy_start, deploy_success, deploy_failure]
```

## Outputs

ReleasePilot provides comprehensive outputs for use in subsequent steps:

```yaml
- name: ReleasePilot
  id: release
  uses: geppix140269/release-pilot@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Use Outputs
  run: |
    echo "Version: ${{ steps.release.outputs.version }}"
    echo "Changelog: ${{ steps.release.outputs.changelog }}"
    echo "PR Body: ${{ steps.release.outputs.pr_body }}"
    echo "Release Notes: ${{ steps.release.outputs.release_notes }}"
    echo "Deployed: ${{ steps.release.outputs.deployed }}"
    echo "Deployment URL: ${{ steps.release.outputs.deployment_url }}"
    echo "Environment: ${{ steps.release.outputs.deployment_environment }}"
```

## Deployment Strategies

### Blue-Green Deployment
Zero-downtime deployments by switching between two identical environments:

```yaml
deployment_config: |
  {
    "production": {
      "provider": "aws",
      "strategy": "blue-green",
      "health_check_url": "https://api.example.com/health",
      "switch_delay": "30s"
    }
  }
```

### Canary Deployment
Gradual rollout to a subset of users:

```yaml
deployment_config: |
  {
    "production": {
      "provider": "kubernetes",
      "strategy": "canary",
      "canary_percentage": 10,
      "canary_increment": 20,
      "canary_interval": "5m"
    }
  }
```

### Rolling Deployment
Update instances incrementally:

```yaml
deployment_config: |
  {
    "production": {
      "provider": "aws",
      "strategy": "rolling",
      "batch_size": 2,
      "wait_between_batches": "60s"
    }
  }
```

## Use Cases

### 1. Automated Release Management
Automatically version, tag, and release your software:

```yaml
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: geppix140269/release-pilot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          release_type: auto  # auto-detect from commits
```

### 2. PR Documentation
Generate comprehensive PR descriptions automatically:

```yaml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  document:
    runs-on: ubuntu-latest
    steps:
      - uses: geppix140269/release-pilot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### 3. Multi-Environment Deployments
Deploy to different environments based on branch:

```yaml
on:
  push:
    branches: [main, develop, staging/*]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: geppix140269/release-pilot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          deployment_config: |
            {
              "production": {
                "branch": "main",
                "provider": "aws"
              },
              "staging": {
                "branch": "develop",
                "provider": "kubernetes"
              }
            }
```

## Pricing & License

ReleasePilot is free for open-source projects. For private repositories:

- **Starter**: $19/month - 5 private repos
- **Professional**: $49/month - 20 private repos  
- **Enterprise**: $199/month - Unlimited repos

Get your license at [releasepilot.net](https://releasepilot.net)

## Support

- Documentation: [docs.releasepilot.net](https://docs.releasepilot.net)
- Issues: [GitHub Issues](https://github.com/geppix140269/release-pilot/issues)
- Email: support@releasepilot.net
- Website: [releasepilot.net](https://releasepilot.net)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [1402 Celsius Ltd](https://1402celsius.com)