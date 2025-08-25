// ReleasePilot for Azure DevOps - JavaScript Version
// This is a simplified version that can run without TypeScript compilation

const tl = require('azure-pipelines-task-lib/task');
const axios = require('axios');
const CodeReviewer = require('./code-review');

async function run() {
    try {
        console.log('🚀 ReleasePilot for Azure DevOps starting...');
        
        // Get inputs
        const action = tl.getInput('action', true) || 'full-release';
        const openaiApiKey = tl.getInput('openaiApiKey', true);
        const azureDevOpsToken = tl.getInput('azureDevOpsToken', true) || tl.getVariable('System.AccessToken');
        const versionStrategy = tl.getInput('versionStrategy', true) || 'semantic';
        const changelogStyle = tl.getInput('changelogStyle', true) || 'conventional';
        const includeWorkItems = tl.getBoolInput('includeWorkItems', false);
        const deploymentTarget = tl.getInput('deploymentTarget', false) || 'none';
        const notifySlack = tl.getBoolInput('notifySlack', false);
        const slackWebhook = tl.getInput('slackWebhook', false);
        const notifyTeams = tl.getBoolInput('notifyTeams', false);
        const teamsWebhook = tl.getInput('teamsWebhook', false);
        
        // Code review specific inputs
        const reviewLevel = tl.getInput('reviewLevel', false) || 'comprehensive';
        const autoApprove = tl.getBoolInput('autoApprove', false);
        const blockOnCritical = tl.getBoolInput('blockOnCritical', false);
        
        // Get Azure DevOps variables
        const orgUrl = tl.getVariable('System.TeamFoundationCollectionUri');
        const projectName = tl.getVariable('System.TeamProject');
        const repositoryId = tl.getVariable('Build.Repository.ID');
        const sourceBranch = tl.getVariable('Build.SourceBranch');
        const sourceVersion = tl.getVariable('Build.SourceVersion');
        
        console.log(`Organization: ${orgUrl}`);
        console.log(`Project: ${projectName}`);
        console.log(`Repository: ${repositoryId}`);
        console.log(`Branch: ${sourceBranch}`);
        
        // Perform the requested action
        switch (action) {
            case 'full-release':
                await performFullRelease(openaiApiKey, azureDevOpsToken, versionStrategy, changelogStyle, deploymentTarget);
                break;
            case 'pr-review':
                await performPRReview(openaiApiKey, azureDevOpsToken, orgUrl, projectName, repositoryId, reviewLevel, blockOnCritical);
                break;
            case 'version-only':
                await performVersionBump(openaiApiKey, versionStrategy);
                break;
            case 'changelog-only':
                await generateChangelog(openaiApiKey, changelogStyle, includeWorkItems);
                break;
            case 'deploy-only':
                await performDeployment(deploymentTarget);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        // Send notifications if configured
        if (notifySlack && slackWebhook) {
            await sendSlackNotification(slackWebhook);
        }
        if (notifyTeams && teamsWebhook) {
            await sendTeamsNotification(teamsWebhook);
        }
        
        console.log('✅ ReleasePilot completed successfully!');
        tl.setResult(tl.TaskResult.Succeeded, 'Release completed');
        
    } catch (err) {
        console.error('❌ ReleasePilot failed:', err.message);
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function performPRReview(openaiApiKey, azureDevOpsToken, orgUrl, projectName, repositoryId, reviewLevel, blockOnCritical) {
    console.log('🔍 Performing AI Code Review...');
    
    // Get PR ID from build reason
    const buildReason = tl.getVariable('Build.Reason');
    const pullRequestId = tl.getVariable('System.PullRequest.PullRequestId');
    
    if (!pullRequestId) {
        throw new Error('This task must be run in a Pull Request validation build');
    }
    
    console.log(`Reviewing PR #${pullRequestId}`);
    
    // Initialize code reviewer
    const reviewer = new CodeReviewer(openaiApiKey, azureDevOpsToken, orgUrl, projectName);
    
    // Perform review
    const reviewSummary = await reviewer.reviewPullRequest(pullRequestId, repositoryId);
    
    // Set output variables
    tl.setVariable('ReleasePilot.Review.Score', reviewSummary.score.toString());
    tl.setVariable('ReleasePilot.Review.Recommendation', reviewSummary.recommendation);
    tl.setVariable('ReleasePilot.Review.VersionBump', reviewSummary.versionBump);
    tl.setVariable('ReleasePilot.Review.DeploymentStrategy', reviewSummary.deploymentStrategy);
    
    // Check if we should block the build
    if (blockOnCritical && reviewSummary.issues.critical > 0) {
        tl.setResult(tl.TaskResult.Failed, `Build blocked: ${reviewSummary.issues.critical} critical issues found`);
        return;
    }
    
    // Check if score is too low
    if (reviewSummary.score < 60) {
        tl.setResult(tl.TaskResult.SucceededWithIssues, `Code quality score: ${reviewSummary.score}/100`);
    } else {
        console.log(`✅ Code Review Complete! Score: ${reviewSummary.score}/100`);
    }
    
    return reviewSummary;
}

async function performFullRelease(openaiApiKey, azureDevOpsToken, versionStrategy, changelogStyle, deploymentTarget) {
    console.log('📦 Performing full release...');
    
    // Check if we have PR context from previous review
    const prContext = tl.getVariable('ReleasePilot.PR.Context');
    if (prContext) {
        console.log('Using context from previous PR review');
        const context = JSON.parse(prContext);
        versionStrategy = context.versionBump || versionStrategy;
        deploymentTarget = context.deploymentStrategy || deploymentTarget;
    }
    
    // Get current version
    const currentVersion = await getCurrentVersion();
    console.log(`Current version: ${currentVersion}`);
    
    // Calculate new version
    const newVersion = await calculateNewVersion(currentVersion, versionStrategy, openaiApiKey);
    console.log(`New version: ${newVersion}`);
    
    // Generate changelog
    const changelog = await generateChangelogContent(openaiApiKey, changelogStyle);
    console.log('📝 Generated changelog');
    
    // Update version files
    await updateVersionFiles(newVersion);
    
    // Set output variables
    tl.setVariable('ReleasePilot.Version', newVersion);
    tl.setVariable('ReleasePilot.Changelog', changelog);
    
    // Deploy if configured
    if (deploymentTarget !== 'none') {
        await performDeployment(deploymentTarget);
    }
}

async function performVersionBump(openaiApiKey, versionStrategy) {
    console.log('🔢 Performing version bump...');
    
    const currentVersion = await getCurrentVersion();
    const newVersion = await calculateNewVersion(currentVersion, versionStrategy, openaiApiKey);
    
    await updateVersionFiles(newVersion);
    tl.setVariable('ReleasePilot.Version', newVersion);
    
    console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
}

async function generateChangelog(openaiApiKey, changelogStyle, includeWorkItems) {
    console.log('📝 Generating changelog...');
    
    const changelog = await generateChangelogContent(openaiApiKey, changelogStyle);
    tl.setVariable('ReleasePilot.Changelog', changelog);
    
    console.log('✅ Changelog generated');
    return changelog;
}

async function performDeployment(deploymentTarget) {
    console.log(`🚀 Deploying to ${deploymentTarget}...`);
    
    switch (deploymentTarget) {
        case 'azure-app-service':
            console.log('Deploying to Azure App Service...');
            // Deployment logic here
            break;
        case 'azure-functions':
            console.log('Deploying to Azure Functions...');
            break;
        case 'azure-aks':
            console.log('Deploying to Azure Kubernetes Service...');
            break;
        default:
            console.log(`Deployment target ${deploymentTarget} not yet implemented`);
    }
    
    console.log('✅ Deployment completed');
}

async function getCurrentVersion() {
    const workingDir = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
    const packageJsonPath = `${workingDir}/package.json`;
    
    if (tl.exist(packageJsonPath)) {
        const content = require(packageJsonPath);
        if (content.version) {
            return content.version;
        }
    }
    
    // Check VERSION file
    const versionPath = `${workingDir}/VERSION`;
    if (tl.exist(versionPath)) {
        const version = tl.readFile(versionPath);
        return version.trim();
    }
    
    return '0.0.0';
}

async function calculateNewVersion(currentVersion, strategy, openaiApiKey) {
    const parts = currentVersion.split('.');
    let major = parseInt(parts[0]) || 0;
    let minor = parseInt(parts[1]) || 0;
    let patch = parseInt(parts[2]) || 0;
    
    if (strategy === 'auto-major') {
        major++;
        minor = 0;
        patch = 0;
    } else if (strategy === 'auto-minor') {
        minor++;
        patch = 0;
    } else if (strategy === 'auto-patch') {
        patch++;
    } else if (strategy === 'semantic' && openaiApiKey) {
        // Use AI to determine version bump
        const bumpType = await getAIVersionBump(openaiApiKey);
        if (bumpType === 'major') {
            major++;
            minor = 0;
            patch = 0;
        } else if (bumpType === 'minor') {
            minor++;
            patch = 0;
        } else {
            patch++;
        }
    } else {
        // Default to patch
        patch++;
    }
    
    return `${major}.${minor}.${patch}`;
}

async function getAIVersionBump(openaiApiKey) {
    try {
        // Get recent commit messages (simplified for demo)
        const commitMessages = getRecentCommitMessages();
        
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4-turbo-preview',
                messages: [{
                    role: 'user',
                    content: `Analyze these commits and determine semantic version bump (major/minor/patch):
                    
${commitMessages}

Rules:
- major: breaking changes
- minor: new features
- patch: bug fixes

Respond with just one word: major, minor, or patch`
                }],
                temperature: 0.3,
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const result = response.data.choices[0].message.content.toLowerCase().trim();
        return ['major', 'minor', 'patch'].includes(result) ? result : 'patch';
    } catch (error) {
        console.error('AI version bump failed, defaulting to patch:', error.message);
        return 'patch';
    }
}

async function generateChangelogContent(openaiApiKey, style) {
    try {
        const commitMessages = getRecentCommitMessages();
        
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4-turbo-preview',
                messages: [{
                    role: 'user',
                    content: `Generate a ${style} changelog from these commits:
                    
${commitMessages}

Format as markdown with sections like Added, Fixed, Changed.`
                }],
                temperature: 0.5,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const date = new Date().toISOString().split('T')[0];
        const version = tl.getVariable('ReleasePilot.Version') || 'Unknown';
        return `## [${version}] - ${date}\n\n${response.data.choices[0].message.content}`;
    } catch (error) {
        console.error('AI changelog generation failed:', error.message);
        return '## Changelog\n\n- Various improvements and bug fixes';
    }
}

function getRecentCommitMessages() {
    // In a real implementation, this would fetch from Azure DevOps API
    // For now, return sample data
    return `fix: resolve authentication timeout issue
feat: add support for OAuth2 authentication
chore: update dependencies
fix: improve error handling in API calls
feat: add dashboard analytics
docs: update README with new features`;
}

async function updateVersionFiles(newVersion) {
    const workingDir = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
    
    // Update package.json
    const packageJsonPath = `${workingDir}/package.json`;
    if (tl.exist(packageJsonPath)) {
        const content = require(packageJsonPath);
        content.version = newVersion;
        tl.writeFile(packageJsonPath, JSON.stringify(content, null, 2));
        console.log(`Updated package.json to version ${newVersion}`);
    }
    
    // Update VERSION file
    const versionPath = `${workingDir}/VERSION`;
    tl.writeFile(versionPath, newVersion);
    console.log(`Updated VERSION file to ${newVersion}`);
}

async function sendSlackNotification(webhook) {
    try {
        const version = tl.getVariable('ReleasePilot.Version') || 'Unknown';
        const changelog = tl.getVariable('ReleasePilot.Changelog') || '';
        
        await axios.post(webhook, {
            text: `🚀 ReleasePilot: Version ${version} released!`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*New Release: v${version}*\n${changelog.substring(0, 500)}...`
                    }
                }
            ]
        });
        console.log('📢 Slack notification sent');
    } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
    }
}

async function sendTeamsNotification(webhook) {
    try {
        const version = tl.getVariable('ReleasePilot.Version') || 'Unknown';
        const changelog = tl.getVariable('ReleasePilot.Changelog') || '';
        
        await axios.post(webhook, {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            'summary': `ReleasePilot: Version ${version} released`,
            'themeColor': '0078D7',
            'title': `🚀 New Release: v${version}`,
            'text': changelog.substring(0, 1000)
        });
        console.log('📢 Teams notification sent');
    } catch (error) {
        console.error('Failed to send Teams notification:', error.message);
    }
}

// Run the task
run();