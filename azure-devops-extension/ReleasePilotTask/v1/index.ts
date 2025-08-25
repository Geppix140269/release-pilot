import * as tl from 'azure-pipelines-task-lib/task';
import * as azdev from 'azure-devops-node-api';
import { OpenAI } from 'openai';
import * as semver from 'semver';
import { WebApi } from 'azure-devops-node-api';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import { IWorkItemTrackingApi } from 'azure-devops-node-api/WorkItemTrackingApi';

interface ReleaseConfig {
    action: string;
    openaiApiKey: string;
    azureDevOpsToken: string;
    versionStrategy: string;
    manualVersion?: string;
    changelogStyle: string;
    includeWorkItems: boolean;
    deploymentTarget: string;
    deploymentStrategy: string;
    notifySlack: boolean;
    slackWebhook?: string;
    notifyTeams: boolean;
    teamsWebhook?: string;
}

interface CommitInfo {
    id: string;
    message: string;
    author: string;
    date: Date;
    workItems?: number[];
}

interface VersionBump {
    currentVersion: string;
    newVersion: string;
    bumpType: 'major' | 'minor' | 'patch';
}

class ReleasePilot {
    private config: ReleaseConfig;
    private openai: OpenAI;
    private azureConnection: WebApi;
    private gitApi?: IGitApi;
    private witApi?: IWorkItemTrackingApi;
    private projectName: string;
    private repositoryId: string;

    constructor() {
        this.config = this.loadConfig();
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        
        const orgUrl = tl.getVariable('System.TeamFoundationCollectionUri');
        if (!orgUrl) throw new Error('Could not determine organization URL');
        
        const authHandler = azdev.getPersonalAccessTokenHandler(this.config.azureDevOpsToken);
        this.azureConnection = new azdev.WebApi(orgUrl, authHandler);
        
        this.projectName = tl.getVariable('System.TeamProject') || '';
        this.repositoryId = tl.getVariable('Build.Repository.ID') || '';
    }

    private loadConfig(): ReleaseConfig {
        return {
            action: tl.getInput('action', true) || 'full-release',
            openaiApiKey: tl.getInput('openaiApiKey', true) || '',
            azureDevOpsToken: tl.getInput('azureDevOpsToken', true) || '',
            versionStrategy: tl.getInput('versionStrategy', true) || 'semantic',
            manualVersion: tl.getInput('manualVersion', false),
            changelogStyle: tl.getInput('changelogStyle', true) || 'conventional',
            includeWorkItems: tl.getBoolInput('includeWorkItems', false),
            deploymentTarget: tl.getInput('deploymentTarget', false) || 'none',
            deploymentStrategy: tl.getInput('deploymentStrategy', false) || 'direct',
            notifySlack: tl.getBoolInput('notifySlack', false),
            slackWebhook: tl.getInput('slackWebhook', false),
            notifyTeams: tl.getBoolInput('notifyTeams', false),
            teamsWebhook: tl.getInput('teamsWebhook', false)
        };
    }

    async run(): Promise<void> {
        try {
            console.log('🚀 ReleasePilot starting...');
            
            // Initialize APIs
            this.gitApi = await this.azureConnection.getGitApi();
            this.witApi = await this.azureConnection.getWorkItemTrackingApi();

            switch (this.config.action) {
                case 'full-release':
                    await this.fullRelease();
                    break;
                case 'version-only':
                    await this.versionOnly();
                    break;
                case 'changelog-only':
                    await this.changelogOnly();
                    break;
                case 'deploy-only':
                    await this.deployOnly();
                    break;
                default:
                    throw new Error(`Unknown action: ${this.config.action}`);
            }

            console.log('✅ ReleasePilot completed successfully!');
        } catch (error) {
            tl.setResult(tl.TaskResult.Failed, error instanceof Error ? error.message : String(error));
        }
    }

    private async fullRelease(): Promise<void> {
        console.log('📦 Performing full release...');
        
        // Get recent commits
        const commits = await this.getRecentCommits();
        console.log(`Found ${commits.length} commits since last release`);
        
        // Calculate version bump
        const versionBump = await this.calculateVersionBump(commits);
        console.log(`Version: ${versionBump.currentVersion} → ${versionBump.newVersion}`);
        
        // Generate changelog
        const changelog = await this.generateChangelog(commits, versionBump);
        console.log('📝 Generated changelog');
        
        // Update version files
        await this.updateVersionFiles(versionBump.newVersion);
        
        // Create git tag
        await this.createGitTag(versionBump.newVersion, changelog);
        
        // Deploy if configured
        if (this.config.deploymentTarget !== 'none') {
            await this.deploy(versionBump.newVersion);
        }
        
        // Send notifications
        await this.sendNotifications(versionBump, changelog);
        
        // Set output variables
        tl.setVariable('ReleasePilot.Version', versionBump.newVersion);
        tl.setVariable('ReleasePilot.Changelog', changelog);
    }

    private async versionOnly(): Promise<void> {
        const commits = await this.getRecentCommits();
        const versionBump = await this.calculateVersionBump(commits);
        await this.updateVersionFiles(versionBump.newVersion);
        tl.setVariable('ReleasePilot.Version', versionBump.newVersion);
        console.log(`✅ Version bumped to ${versionBump.newVersion}`);
    }

    private async changelogOnly(): Promise<void> {
        const commits = await this.getRecentCommits();
        const currentVersion = await this.getCurrentVersion();
        const changelog = await this.generateChangelog(commits, {
            currentVersion,
            newVersion: currentVersion,
            bumpType: 'patch'
        });
        tl.setVariable('ReleasePilot.Changelog', changelog);
        console.log('✅ Changelog generated');
    }

    private async deployOnly(): Promise<void> {
        const version = await this.getCurrentVersion();
        await this.deploy(version);
        console.log('✅ Deployment completed');
    }

    private async getRecentCommits(): Promise<CommitInfo[]> {
        if (!this.gitApi) throw new Error('Git API not initialized');
        
        const commits = await this.gitApi.getCommits(
            this.repositoryId,
            {
                top: 100,
                includeWorkItems: this.config.includeWorkItems
            },
            this.projectName
        );

        return commits.map(commit => ({
            id: commit.commitId || '',
            message: commit.comment || '',
            author: commit.author?.name || 'Unknown',
            date: commit.author?.date || new Date(),
            workItems: commit.workItems?.map(wi => parseInt(wi.id || '0'))
        }));
    }

    private async getCurrentVersion(): Promise<string> {
        // Try to get version from package.json or version file
        const packageJsonPath = `${tl.getVariable('System.DefaultWorkingDirectory')}/package.json`;
        
        if (tl.exist(packageJsonPath)) {
            const packageJson = JSON.parse(tl.readFile(packageJsonPath) || '{}');
            if (packageJson.version) {
                return packageJson.version;
            }
        }
        
        // Default version if none found
        return '0.0.0';
    }

    private async calculateVersionBump(commits: CommitInfo[]): Promise<VersionBump> {
        const currentVersion = await this.getCurrentVersion();
        
        if (this.config.versionStrategy === 'manual' && this.config.manualVersion) {
            return {
                currentVersion,
                newVersion: this.config.manualVersion,
                bumpType: 'patch'
            };
        }

        let bumpType: 'major' | 'minor' | 'patch' = 'patch';

        if (this.config.versionStrategy === 'semantic') {
            // Use AI to analyze commits and determine bump type
            const analysis = await this.analyzeCommitsWithAI(commits);
            bumpType = analysis.bumpType;
        } else if (this.config.versionStrategy === 'conventional') {
            // Analyze conventional commits
            bumpType = this.analyzeConventionalCommits(commits);
        } else if (this.config.versionStrategy === 'auto-major') {
            bumpType = 'major';
        } else if (this.config.versionStrategy === 'auto-minor') {
            bumpType = 'minor';
        }

        const newVersion = semver.inc(currentVersion, bumpType) || currentVersion;

        return {
            currentVersion,
            newVersion,
            bumpType
        };
    }

    private analyzeConventionalCommits(commits: CommitInfo[]): 'major' | 'minor' | 'patch' {
        let hasMajor = false;
        let hasMinor = false;

        for (const commit of commits) {
            const message = commit.message.toLowerCase();
            
            if (message.includes('breaking change') || message.includes('!:')) {
                hasMajor = true;
            } else if (message.startsWith('feat:') || message.startsWith('feature:')) {
                hasMinor = true;
            }
        }

        if (hasMajor) return 'major';
        if (hasMinor) return 'minor';
        return 'patch';
    }

    private async analyzeCommitsWithAI(commits: CommitInfo[]): Promise<{ bumpType: 'major' | 'minor' | 'patch', summary: string }> {
        const commitMessages = commits.map(c => c.message).join('\n');
        
        const prompt = `Analyze these commit messages and determine the semantic version bump type.
        
Commits:
${commitMessages}

Rules:
- MAJOR: Breaking changes, incompatible API changes
- MINOR: New features, backwards-compatible functionality
- PATCH: Bug fixes, small improvements

Also provide a brief summary of the changes.

Respond in JSON format:
{
  "bumpType": "major|minor|patch",
  "summary": "Brief summary of changes"
}`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message?.content || '{}');
        return {
            bumpType: result.bumpType || 'patch',
            summary: result.summary || ''
        };
    }

    private async generateChangelog(commits: CommitInfo[], version: VersionBump): Promise<string> {
        const workItemDetails = this.config.includeWorkItems ? 
            await this.getWorkItemDetails(commits) : '';

        const prompt = `Generate a changelog for version ${version.newVersion} based on these commits.
        
Commits:
${commits.map(c => `- ${c.message}`).join('\n')}

${workItemDetails}

Style: ${this.config.changelogStyle}

Generate a professional changelog entry that:
1. Groups changes by type (Added, Fixed, Changed, etc.)
2. Provides clear, user-friendly descriptions
3. Highlights important changes
4. Mentions breaking changes if any

Format as markdown.`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1000
        });

        const changelog = response.choices[0].message?.content || '';
        
        // Add header
        const date = new Date().toISOString().split('T')[0];
        return `## [${version.newVersion}] - ${date}\n\n${changelog}`;
    }

    private async getWorkItemDetails(commits: CommitInfo[]): Promise<string> {
        if (!this.witApi) return '';
        
        const workItemIds = new Set<number>();
        commits.forEach(c => c.workItems?.forEach(id => workItemIds.add(id)));
        
        if (workItemIds.size === 0) return '';
        
        const workItems = await this.witApi.getWorkItems(
            Array.from(workItemIds),
            undefined,
            undefined,
            undefined,
            this.projectName
        );
        
        const details = workItems.map(wi => 
            `- ${wi.fields?.['System.WorkItemType']}: ${wi.fields?.['System.Title']} (#${wi.id})`
        ).join('\n');
        
        return `\nRelated Work Items:\n${details}`;
    }

    private async updateVersionFiles(newVersion: string): Promise<void> {
        const workingDir = tl.getVariable('System.DefaultWorkingDirectory') || '';
        
        // Update package.json if it exists
        const packageJsonPath = `${workingDir}/package.json`;
        if (tl.exist(packageJsonPath)) {
            const packageJson = JSON.parse(tl.readFile(packageJsonPath) || '{}');
            packageJson.version = newVersion;
            tl.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`Updated package.json to version ${newVersion}`);
        }
        
        // Update VERSION file if it exists
        const versionPath = `${workingDir}/VERSION`;
        if (tl.exist(versionPath)) {
            tl.writeFile(versionPath, newVersion);
            console.log(`Updated VERSION file to ${newVersion}`);
        }
    }

    private async createGitTag(version: string, message: string): Promise<void> {
        if (!this.gitApi) throw new Error('Git API not initialized');
        
        const tagName = `v${version}`;
        const sha = tl.getVariable('Build.SourceVersion') || '';
        
        await this.gitApi.createAnnotatedTag(
            {
                name: tagName,
                message: message,
                objectId: sha,
                taggedBy: {
                    name: 'ReleasePilot',
                    email: 'releasepilot@azure.com',
                    date: new Date()
                }
            },
            this.projectName,
            this.repositoryId
        );
        
        console.log(`Created tag: ${tagName}`);
    }

    private async deploy(version: string): Promise<void> {
        console.log(`🚀 Deploying version ${version} to ${this.config.deploymentTarget}`);
        
        switch (this.config.deploymentTarget) {
            case 'azure-app-service':
                await this.deployToAppService(version);
                break;
            case 'azure-functions':
                await this.deployToFunctions(version);
                break;
            case 'azure-aks':
                await this.deployToAKS(version);
                break;
            default:
                console.log(`Deployment target ${this.config.deploymentTarget} not yet implemented`);
        }
    }

    private async deployToAppService(version: string): Promise<void> {
        // Implementation for Azure App Service deployment
        console.log(`Deploying to Azure App Service...`);
        // Use Azure SDK to deploy
    }

    private async deployToFunctions(version: string): Promise<void> {
        // Implementation for Azure Functions deployment
        console.log(`Deploying to Azure Functions...`);
    }

    private async deployToAKS(version: string): Promise<void> {
        // Implementation for AKS deployment
        console.log(`Deploying to Azure Kubernetes Service...`);
    }

    private async sendNotifications(version: VersionBump, changelog: string): Promise<void> {
        const message = `🚀 ReleasePilot: New version ${version.newVersion} released!\n\n${changelog}`;
        
        if (this.config.notifySlack && this.config.slackWebhook) {
            await this.sendSlackNotification(message);
        }
        
        if (this.config.notifyTeams && this.config.teamsWebhook) {
            await this.sendTeamsNotification(message);
        }
    }

    private async sendSlackNotification(message: string): Promise<void> {
        const axios = require('axios');
        try {
            await axios.post(this.config.slackWebhook, {
                text: message,
                username: 'ReleasePilot',
                icon_emoji: ':rocket:'
            });
            console.log('📢 Sent Slack notification');
        } catch (error) {
            console.error('Failed to send Slack notification:', error);
        }
    }

    private async sendTeamsNotification(message: string): Promise<void> {
        const axios = require('axios');
        try {
            await axios.post(this.config.teamsWebhook, {
                '@type': 'MessageCard',
                '@context': 'https://schema.org/extensions',
                summary: 'New Release',
                themeColor: '0078D7',
                title: 'ReleasePilot Release',
                text: message
            });
            console.log('📢 Sent Teams notification');
        } catch (error) {
            console.error('Failed to send Teams notification:', error);
        }
    }
}

// Run the task
async function run() {
    const releasePilot = new ReleasePilot();
    await releasePilot.run();
}

run().catch(error => {
    tl.setResult(tl.TaskResult.Failed, error.message);
});