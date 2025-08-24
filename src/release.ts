import * as core from '@actions/core';
import * as github from '@actions/github';
import { Config } from './config';
import { ParsedCommit } from './semver';
import { generateReleaseNotes } from './ai';

export async function createRelease(
  version: string,
  commits: ParsedCommit[],
  config: Config,
  dryRun: boolean = false
): Promise<void> {
  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required for creating releases');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;
  
  const tagName = `v${version}`;
  const releaseName = `${config.projectName} v${version}`;
  
  const releaseNotes = await generateReleaseNotes(version, commits, config);
  
  if (dryRun) {
    core.info('[DRY RUN] Would create release:');
    core.info(`  Tag: ${tagName}`);
    core.info(`  Name: ${releaseName}`);
    core.info(`  Body:\n${releaseNotes}`);
    return;
  }

  try {
    const response = await octokit.rest.repos.createRelease({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag_name: tagName,
      name: releaseName,
      body: releaseNotes,
      draft: false,
      prerelease: false,
      target_commitish: context.sha
    });

    core.info(`Created release: ${response.data.html_url}`);
    core.setOutput('release_url', response.data.html_url);
    core.setOutput('release_notes', releaseNotes);
  } catch (error: any) {
    if (error.status === 422 && error.message?.includes('already_exists')) {
      core.warning(`Release ${tagName} already exists, updating it instead`);
      await updateRelease(tagName, releaseName, releaseNotes, dryRun);
    } else {
      throw error;
    }
  }
}

async function updateRelease(
  tagName: string,
  releaseName: string,
  releaseNotes: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    core.info('[DRY RUN] Would update existing release');
    return;
  }

  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required for updating releases');
  }
  const octokit = github.getOctokit(token);
  const context = github.context;

  try {
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag: tagName
    });

    await octokit.rest.repos.updateRelease({
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: release.id,
      name: releaseName,
      body: releaseNotes
    });

    core.info(`Updated release: ${release.html_url}`);
  } catch (error) {
    core.error(`Failed to update release: ${error}`);
    throw error;
  }
}

export async function getCommitsSinceLastTag(): Promise<ParsedCommit[]> {
  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  try {
    const { data: tags } = await octokit.rest.repos.listTags({
      owner: context.repo.owner,
      repo: context.repo.repo,
      per_page: 1
    });

    let commits;
    
    if (tags.length > 0) {
      const lastTag = tags[0];
      const { data } = await octokit.rest.repos.compareCommits({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base: lastTag.name,
        head: context.sha
      });
      commits = data.commits;
    } else {
      const { data } = await octokit.rest.repos.listCommits({
        owner: context.repo.owner,
        repo: context.repo.repo,
        sha: context.sha,
        per_page: 100
      });
      commits = data;
    }

    return commits.map(c => parseCommitFromGitHub(c));
  } catch (error) {
    core.error(`Failed to get commits: ${error}`);
    throw error;
  }
}

function parseCommitFromGitHub(commit: any): ParsedCommit {
  const message = commit.commit?.message || commit.message || '';
  const hash = commit.sha;
  
  const conventionalCommitRegex = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)/;
  const firstLine = message.split('\n')[0];
  const match = firstLine.match(conventionalCommitRegex);

  if (!match) {
    return {
      type: null,
      scope: null,
      subject: firstLine,
      breaking: false,
      hash,
      message
    };
  }

  const [, type, scope, breaking, subject] = match;
  const hasBreakingChange = !!breaking || message.includes('BREAKING CHANGE');

  return {
    type,
    scope: scope || null,
    subject,
    breaking: hasBreakingChange,
    notes: hasBreakingChange ? [{ title: 'BREAKING CHANGE', text: '' }] : undefined,
    footer: message.includes('BREAKING CHANGE') ? message.split('BREAKING CHANGE')[1] : undefined,
    hash,
    message
  };
}

export async function createTag(
  version: string,
  dryRun: boolean = false
): Promise<void> {
  if (dryRun) {
    core.info(`[DRY RUN] Would create tag v${version}`);
    return;
  }

  const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;
  const tagName = `v${version}`;

  try {
    await octokit.rest.git.createRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: `refs/tags/${tagName}`,
      sha: context.sha
    });

    core.info(`Created tag: ${tagName}`);
  } catch (error: any) {
    if (error.status === 422) {
      core.warning(`Tag ${tagName} already exists`);
    } else {
      throw error;
    }
  }
}