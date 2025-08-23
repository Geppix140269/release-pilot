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
import {
  getCurrentVersion,
  updateVersion,
  bumpVersion,
  determineReleaseType,
  ParsedCommit
} from './semver';
import { updateChangelog } from './changelog';
import { createRelease, getCommitsSinceLastTag, createTag } from './release';
import { sendNotifications } from './notify';

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
  core.info('Handling merge to default branch...');
  
  const commits = await getCommitsSinceLastTag();
  
  if (commits.length === 0) {
    core.info('No commits found since last tag');
    return;
  }

  const conventionalCommits = commits.filter(c => c.type !== null);
  
  if (conventionalCommits.length === 0) {
    const failOnMissing = core.getInput('fail_on_missing_conventional_commits') === 'true';
    if (failOnMissing) {
      throw new Error('No conventional commits found');
    }
    core.warning('No conventional commits found, skipping version bump');
    return;
  }

  const currentVersion = await getCurrentVersion(config.versionFile);
  const releaseTypeInput = core.getInput('release_type') || 'auto';
  
  let newVersion: string;
  if (releaseTypeInput === 'auto') {
    const releaseType = determineReleaseType(conventionalCommits);
    newVersion = bumpVersion(currentVersion, releaseType);
  } else {
    newVersion = bumpVersion(currentVersion, releaseTypeInput as any);
  }

  core.info(`Bumping version from ${currentVersion} to ${newVersion}`);
  
  await updateVersion(config.versionFile, newVersion, isDryRun);
  
  const changelogEntry = await updateChangelog(newVersion, conventionalCommits, config, isDryRun);
  
  if (!isDryRun) {
    await commitChanges(config.versionFile, newVersion);
    await createTag(newVersion, isDryRun);
  }
  
  await sendNotifications(newVersion, conventionalCommits, config);
  
  core.setOutput('version', newVersion);
  core.setOutput('changelog', changelogEntry);
}

async function handleTag(config: any, isDryRun: boolean): Promise<void> {
  core.info('Handling tag push event...');
  
  const context = github.context;
  const tagName = context.ref.replace('refs/tags/', '');
  const version = tagName.replace(/^v/, '');
  
  const commits = await getCommitsSinceLastTag();
  await createRelease(version, commits, config, isDryRun);
  
  await sendNotifications(version, commits, config);
  
  core.setOutput('version', version);
}

async function commitChanges(versionFile: string, version: string): Promise<void> {
  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required for committing changes');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;
  
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `heads/${context.ref.replace('refs/heads/', '')}`
    });

    const { data: commit } = await octokit.rest.git.getCommit({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: ref.object.sha
    });

    const { data: tree } = await octokit.rest.git.getTree({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tree_sha: commit.tree.sha
    });

    const versionFileContent = await getFileContent(versionFile);
    const changelogContent = await getFileContent('CHANGELOG.md');

    const { data: versionBlob } = await octokit.rest.git.createBlob({
      owner: context.repo.owner,
      repo: context.repo.repo,
      content: Buffer.from(versionFileContent).toString('base64'),
      encoding: 'base64'
    });

    const { data: changelogBlob } = await octokit.rest.git.createBlob({
      owner: context.repo.owner,
      repo: context.repo.repo,
      content: Buffer.from(changelogContent).toString('base64'),
      encoding: 'base64'
    });

    const { data: newTree } = await octokit.rest.git.createTree({
      owner: context.repo.owner,
      repo: context.repo.repo,
      base_tree: tree.sha,
      tree: [
        {
          path: versionFile,
          mode: '100644',
          type: 'blob',
          sha: versionBlob.sha
        },
        {
          path: 'CHANGELOG.md',
          mode: '100644',
          type: 'blob',
          sha: changelogBlob.sha
        }
      ]
    });

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: context.repo.owner,
      repo: context.repo.repo,
      message: `chore(release): bump version to ${version} [skip ci]`,
      tree: newTree.sha,
      parents: [ref.object.sha]
    });

    await octokit.rest.git.updateRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `heads/${context.ref.replace('refs/heads/', '')}`,
      sha: newCommit.sha
    });

    core.info(`Committed version bump to ${version}`);
  } catch (error) {
    core.error(`Failed to commit changes: ${error}`);
    throw error;
  }
}

async function getFileContent(filePath: string): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

run();