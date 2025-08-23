import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';

const LICENSE_API_URL = 'https://api.releasepilot.io/v1/license/verify';

export interface LicenseInfo {
  isValid: boolean;
  isDryRun: boolean;
  message?: string;
  expiresAt?: string;
}

export async function validateLicense(): Promise<LicenseInfo> {
  const context = github.context;
  const repo = context.repo;
  
  const isPublicRepo = await checkIfPublicRepo();
  
  if (isPublicRepo) {
    core.info('Public repository detected - no license required');
    return { isValid: true, isDryRun: false };
  }

  const licenseKey = process.env.RELEASEPILOT_LICENSE;
  
  if (!licenseKey) {
    core.warning('Private repository requires RELEASEPILOT_LICENSE secret');
    core.warning('Action will run in dry-run mode (read-only)');
    return {
      isValid: false,
      isDryRun: true,
      message: 'No license key provided for private repository'
    };
  }

  try {
    const response = await fetch(LICENSE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReleasePilot/1.0'
      },
      body: JSON.stringify({
        org: repo.owner,
        repo: repo.repo,
        licenseKey: licenseKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as any).message || `License validation failed: ${response.statusText}`;
      
      core.warning(`License validation error: ${errorMessage}`);
      core.warning('Action will run in dry-run mode');
      
      return {
        isValid: false,
        isDryRun: true,
        message: errorMessage
      };
    }

    const data = await response.json() as any;
    
    if (data.valid) {
      core.info(`License validated successfully (expires: ${data.expiresAt || 'never'})`);
      return {
        isValid: true,
        isDryRun: false,
        expiresAt: data.expiresAt
      };
    } else {
      core.warning(`Invalid license: ${data.message || 'Unknown error'}`);
      core.warning('Action will run in dry-run mode');
      return {
        isValid: false,
        isDryRun: true,
        message: data.message
      };
    }
  } catch (error) {
    core.warning(`Failed to validate license: ${error}`);
    core.warning('Action will run in dry-run mode');
    
    return {
      isValid: false,
      isDryRun: true,
      message: `License validation error: ${error}`
    };
  }
}

async function checkIfPublicRepo(): Promise<boolean> {
  try {
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!token) {
      core.warning('No GitHub token available to check repository visibility');
      return false;
    }

    const octokit = github.getOctokit(token);
    const { data: repoData } = await octokit.rest.repos.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    });

    return !repoData.private;
  } catch (error) {
    core.warning(`Failed to check repository visibility: ${error}`);
    return false;
  }
}

export async function postDryRunComment(message: string): Promise<void> {
  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning('No GitHub token available to post comment');
    return;
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  const commentBody = `## ⚠️ ReleasePilot - Dry Run Mode

${message}

### To enable full functionality:
1. Purchase a license at [releasepilot.io](https://releasepilot.io)
2. Add the license key as a secret: \`RELEASEPILOT_LICENSE\`
3. Re-run this workflow

*This is a dry-run - no changes were made to your repository.*`;

  try {
    if (context.eventName === 'pull_request' && context.payload.pull_request) {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: commentBody
      });
    } else if (context.eventName === 'push') {
      await octokit.rest.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
        body: commentBody
      });
    }
  } catch (error) {
    core.warning(`Failed to post dry-run comment: ${error}`);
  }
}