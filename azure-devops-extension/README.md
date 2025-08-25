# ReleasePilot for Azure DevOps

AI-powered release automation for Azure DevOps pipelines. Automate versioning, changelogs, and deployments with GPT-4.

## 🚀 Features

- **AI-Powered Release Notes**: GPT-4 analyzes your commits and generates meaningful release notes
- **Automatic Versioning**: Semantic versioning based on commit analysis
- **Work Item Integration**: Links Azure Boards work items in changelogs
- **Multi-Cloud Deployment**: Deploy to Azure, AWS, GCP, and more
- **Smart Deployment Strategies**: Blue-green, canary, and rolling deployments
- **Team Notifications**: Slack and Microsoft Teams integration

## 📦 Installation

1. Install from Azure DevOps Marketplace (coming soon)
2. Add to your pipeline:

```yaml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'full-release'
    versionStrategy: 'semantic'
    deploymentTarget: 'azure-app-service'
```

## 🔧 Configuration

### Basic Usage

```yaml
# Minimal configuration
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
```

### Full Configuration

```yaml
- task: ReleasePilot@1
  inputs:
    # Action to perform
    action: 'full-release'  # full-release | version-only | changelog-only | deploy-only
    
    # Authentication
    openaiApiKey: $(OPENAI_API_KEY)
    azureDevOpsToken: $(System.AccessToken)
    
    # Versioning
    versionStrategy: 'semantic'  # semantic | conventional | manual | auto-patch | auto-minor | auto-major
    manualVersion: '2.1.0'  # Only when versionStrategy is 'manual'
    
    # Changelog
    changelogStyle: 'conventional'  # conventional | keepachangelog | simple | detailed
    includeWorkItems: true
    
    # Deployment
    deploymentTarget: 'azure-app-service'  # none | azure-app-service | azure-functions | azure-aks | aws | gcp | docker
    deploymentStrategy: 'blue-green'  # direct | blue-green | canary | rolling
    
    # Notifications
    notifySlack: true
    slackWebhook: $(SLACK_WEBHOOK)
    notifyTeams: true
    teamsWebhook: $(TEAMS_WEBHOOK)
```

## 📋 Examples

### Example 1: Simple Version Bump

```yaml
- task: ReleasePilot@1
  displayName: 'Bump Version'
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'version-only'
    versionStrategy: 'semantic'
```

### Example 2: Generate Changelog with Work Items

```yaml
- task: ReleasePilot@1
  displayName: 'Generate Release Notes'
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'changelog-only'
    changelogStyle: 'detailed'
    includeWorkItems: true
```

### Example 3: Full Release with Deployment

```yaml
- task: ReleasePilot@1
  displayName: 'Release and Deploy'
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'full-release'
    versionStrategy: 'semantic'
    deploymentTarget: 'azure-app-service'
    deploymentStrategy: 'blue-green'
    notifyTeams: true
    teamsWebhook: $(TEAMS_WEBHOOK)
```

## 🔍 Output Variables

The task sets the following output variables:

- `ReleasePilot.Version`: The new version number
- `ReleasePilot.Changelog`: The generated changelog
- `ReleasePilot.DeploymentUrl`: URL of the deployed application (if applicable)

Use them in subsequent tasks:

```yaml
- task: ReleasePilot@1
  name: release
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)

- script: |
    echo "Released version: $(ReleasePilot.Version)"
    echo "Changelog: $(ReleasePilot.Changelog)"
```

## 💡 Version Strategies

### Semantic (AI-Powered)
The AI analyzes your commits to determine the appropriate version bump:
- **Major**: Breaking changes detected
- **Minor**: New features added
- **Patch**: Bug fixes and small improvements

### Conventional Commits
Follows the Conventional Commits specification:
- `feat:` → Minor version bump
- `fix:` → Patch version bump
- `BREAKING CHANGE:` → Major version bump

### Manual
Specify the exact version you want.

### Auto
Always bumps the specified level (patch, minor, or major).

## 🚀 Deployment Targets

### Azure App Service
```yaml
deploymentTarget: 'azure-app-service'
```

### Azure Functions
```yaml
deploymentTarget: 'azure-functions'
```

### Azure Kubernetes Service
```yaml
deploymentTarget: 'azure-aks'
```

### Docker Registry
```yaml
deploymentTarget: 'docker'
```

## 📢 Notifications

### Slack
```yaml
notifySlack: true
slackWebhook: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

### Microsoft Teams
```yaml
notifyTeams: true
teamsWebhook: 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'
```

## 🔒 Security

- OpenAI API keys should be stored as secure variables
- Use `$(System.AccessToken)` for Azure DevOps API access
- Webhook URLs should be stored as secure variables

## 💰 Pricing

- **Free** for open source projects
- **Team**: $99/month (5 projects)
- **Organization**: $299/month (unlimited projects)
- **Enterprise**: $599/month (includes support)

## 🤝 Support

- Documentation: https://releasepilot.net/docs
- Issues: https://github.com/geppix140269/release-pilot-azure/issues
- Email: support@releasepilot.net

## 📄 License

MIT License - see LICENSE file for details