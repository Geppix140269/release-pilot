# ReleasePilot Azure DevOps Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
1. Azure DevOps organization
2. OpenAI API key
3. Node.js 16+ installed locally (for building)

### Step 1: Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Save it securely

### Step 2: Install Extension
1. Go to Azure DevOps Marketplace (coming soon)
2. Click "Get it free"
3. Select your organization
4. Install

**OR** Install from VSIX (for testing):
1. Download the .vsix file
2. Go to Organization Settings → Extensions
3. Click "Shared" → "Upload"
4. Upload the .vsix file

### Step 3: Add to Pipeline
Add this to your `azure-pipelines.yml`:

```yaml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
```

### Step 4: Set Up Variables
1. Go to Pipelines → Library
2. Create a variable group "ReleasePilot-Variables"
3. Add variables:
   - `OPENAI_API_KEY`: Your OpenAI API key (mark as secret)
   - `SLACK_WEBHOOK`: (optional) Slack webhook URL
   - `TEAMS_WEBHOOK`: (optional) Teams webhook URL

## 📋 Complete Setup

### 1. Create Service Connection (for deployments)
If deploying to Azure:
1. Project Settings → Service connections
2. New service connection → Azure Resource Manager
3. Name it "ReleasePilot-Azure"
4. Grant access to all pipelines

### 2. Configure Permissions
The pipeline needs these permissions:
- Read source code
- Create tags
- Read/write work items
- Deploy to environments

Grant permissions:
1. Project Settings → Repositories → Security
2. Find your Build Service account
3. Allow: Contribute, Create tag, Read

### 3. Full Pipeline Example

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: ReleasePilot-Variables

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - script: echo "Building..."
          
  - stage: Release
    dependsOn: Build
    condition: succeeded()
    jobs:
      - job: Release
        steps:
          - task: ReleasePilot@1
            displayName: 'Create Release with AI'
            inputs:
              action: 'full-release'
              openaiApiKey: $(OPENAI_API_KEY)
              versionStrategy: 'semantic'
              changelogStyle: 'conventional'
              includeWorkItems: true
              deploymentTarget: 'azure-app-service'
              deploymentStrategy: 'blue-green'
              notifyTeams: true
              teamsWebhook: $(TEAMS_WEBHOOK)
```

## 🔧 Configuration Options

### Version Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| `semantic` | AI analyzes commits | 1.2.3 → 2.0.0 (breaking change) |
| `conventional` | Uses commit prefixes | feat: → 1.3.0 |
| `manual` | You specify version | Set to 2.1.0 |
| `auto-patch` | Always patch bump | 1.2.3 → 1.2.4 |
| `auto-minor` | Always minor bump | 1.2.3 → 1.3.0 |
| `auto-major` | Always major bump | 1.2.3 → 2.0.0 |

### Changelog Styles

| Style | Description |
|-------|-------------|
| `conventional` | Added/Fixed/Changed sections |
| `keepachangelog` | Keep a Changelog format |
| `simple` | Simple bullet list |
| `detailed` | Detailed with context |

### Deployment Targets

| Target | Description |
|--------|-------------|
| `azure-app-service` | Azure Web Apps |
| `azure-functions` | Azure Functions |
| `azure-aks` | Azure Kubernetes |
| `azure-container` | Container Instances |
| `docker` | Docker Registry |
| `none` | No deployment |

## 🎯 Common Scenarios

### Scenario 1: Simple Version Bump
Just bump version on every commit to main:

```yaml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'version-only'
    versionStrategy: 'auto-patch'
```

### Scenario 2: PR Changelog Preview
Generate changelog for pull requests:

```yaml
- task: ReleasePilot@1
  condition: eq(variables['Build.Reason'], 'PullRequest')
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'changelog-only'
    changelogStyle: 'simple'
```

### Scenario 3: Full CI/CD with Notifications
Complete automation with team notifications:

```yaml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
    action: 'full-release'
    versionStrategy: 'semantic'
    includeWorkItems: true
    deploymentTarget: 'azure-app-service'
    deploymentStrategy: 'canary'
    notifySlack: true
    slackWebhook: $(SLACK_WEBHOOK)
    notifyTeams: true
    teamsWebhook: $(TEAMS_WEBHOOK)
```

## 🔒 Security Best Practices

1. **Never commit API keys** - Use Azure DevOps variables
2. **Use System.AccessToken** - For Azure DevOps API access
3. **Limit permissions** - Only grant necessary permissions
4. **Rotate keys regularly** - Update API keys monthly
5. **Use environments** - Separate dev/staging/prod

## 🐛 Troubleshooting

### Issue: "OpenAI API key not found"
**Solution**: Ensure the variable is marked as secret in Library

### Issue: "Cannot create git tag"
**Solution**: Grant "Create tag" permission to Build Service

### Issue: "Work items not showing"
**Solution**: Enable "includeWorkItems" and link work items to commits

### Issue: "Deployment failed"
**Solution**: Check service connection permissions

## 📊 Monitoring

Track ReleasePilot metrics:
1. Pipeline duration reduction
2. Deployment success rate
3. Version consistency
4. Changelog quality

## 🆘 Getting Help

- Documentation: https://releasepilot.net/docs
- Support: support@releasepilot.net
- Issues: GitHub Issues
- Community: Discord/Slack

## 🎉 You're Ready!

Your Azure DevOps pipeline now has AI-powered releases! 

Next steps:
1. Run your first pipeline
2. Check the generated changelog
3. Verify the version bump
4. Monitor deployment

Happy releasing! 🚀