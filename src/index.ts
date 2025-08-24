import * as core from '@actions/core';
import * as github from '@actions/github';
import { loadConfig } from './config';
import { validateLicense, postDryRunComment } from './license';
import { 
  generatePRBody, 
  updatePRDescription, 
  getPRInfo,
  parseCommit
} from './pr';
import { ParsedCommit } from './semver';
import { updateChangelog } from './changelog';
import { createRelease, getCommitsSinceLastTag, createTag } from './release';
import { sendNotifications } from './notify';
import { handleDeployment } from './deploy';
import { handleMergeToMain, validateMergePrerequisites } from './merge';

async function run(): Promise<void> {
  try {
    core.info('🚀 ReleasePilot starting...');
    
    const config = await loadConfig();
    core.info(`Loaded configuration for project: ${config.projectName}`);
    
    const license = await validateLicense();
    const isDryRun = license.isDryRun;
    
    if (isDryRun) {
      core.warning('Running in DRY RUN mode - no changes will be made');
    }

    const mode = detectMode();
    core.info(`Detected mode: ${mode}`);

    switch (mode) {
      case 'pr':
        await handlePullRequest(config, isDryRun);
        break;
      case 'merge':
        await handleMerge(config, isDryRun);
        break;
      case 'tag':
        await handleTag(config, isDryRun);
        break;
      default:
        core.warning(`Unknown mode: ${mode}`);
    }

    if (isDryRun && !license.isValid) {
      await postDryRunComment(license.message || 'License validation failed');
    }

    core.info('✅ ReleasePilot completed successfully');
  } catch (error) {
    core.setFailed(`❌ ReleasePilot failed: ${error}`);
  }
}

function detectMode(): string {
  const inputMode = core.getInput('mode');
  if (inputMode && inputMode !== 'auto') {
    return inputMode;
  }

  const context = github.context;
  
  if (context.eventName === 'pull_request') {
    return 'pr';
  }
  
  if (context.eventName === 'push') {
    if (context.ref.startsWith('refs/tags/')) {
      return 'tag';
    }
    
    const defaultBranch = context.payload.repository?.default_branch || 'main';
    if (context.ref === `refs/heads/${defaultBranch}`) {
      return 'merge';
    }
  }
  
  return 'unknown';
}

async function handlePullRequest(config: any, isDryRun: boolean): Promise<void> {
  core.info('Handling pull request event...');
  
  const prInfo = await getPRInfo();
  if (!prInfo) {
    core.warning('No pull request information found');
    return;
  }

  const body = await generatePRBody(prInfo, config, prInfo.commits);
  await updatePRDescription(prInfo.number, body, isDryRun);
  
  core.setOutput('pr_body', body);
}

async function handleMerge(config: any, isDryRun: boolean): Promise<void> {
  try {
    validateMergePrerequisites(config);
    
    const result = await handleMergeToMain(config, isDryRun);
    
    if (result) {
      core.setOutput('version', result.version);
      core.setOutput('changelog', result.changelogEntry);
      core.setOutput('release_type', result.releaseType);
      core.setOutput('commits_count', result.commitsSince.length.toString());
      
      // Handle deployment if configured
      const deploymentResult = await handleDeployment(config, result.version, isDryRun);
      if (deploymentResult.success) {
        core.setOutput('deployed', 'true');
        core.setOutput('deployment_url', deploymentResult.url || '');
        core.setOutput('deployment_environment', deploymentResult.environment);
      }
    } else {
      core.info('No version bump performed');
    }
  } catch (error) {
    core.error(`Merge handling failed: ${error}`);
    throw error;
  }
}

async function handleTag(config: any, isDryRun: boolean): Promise<void> {
  core.info('Handling tag push event...');
  
  const context = github.context;
  const tagName = context.ref.replace('refs/tags/', '');
  const version = tagName.replace(/^v/, '');
  
  const commits = await getCommitsSinceLastTag();
  await createRelease(version, commits, config, isDryRun);
  
  await sendNotifications(version, commits, config);
  
  // Handle deployment for production (tags usually trigger production deployments)
  const deploymentResult = await handleDeployment(config, version, isDryRun);
  if (deploymentResult.success) {
    core.setOutput('deployed', 'true');
    core.setOutput('deployment_url', deploymentResult.url || '');
    core.setOutput('deployment_environment', deploymentResult.environment);
  }
  
  core.setOutput('version', version);
}


run();