"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelease = createRelease;
exports.getCommitsSinceLastTag = getCommitsSinceLastTag;
exports.createTag = createTag;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const ai_1 = require("./ai");
async function createRelease(version, commits, config, dryRun = false) {
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GitHub token is required for creating releases');
    }
    const octokit = github.getOctokit(token);
    const context = github.context;
    const tagName = `v${version}`;
    const releaseName = `${config.projectName} v${version}`;
    const releaseNotes = await (0, ai_1.generateReleaseNotes)(version, commits, config);
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
    }
    catch (error) {
        if (error.status === 422 && error.message?.includes('already_exists')) {
            core.warning(`Release ${tagName} already exists, updating it instead`);
            await updateRelease(tagName, releaseName, releaseNotes, dryRun);
        }
        else {
            throw error;
        }
    }
}
async function updateRelease(tagName, releaseName, releaseNotes, dryRun) {
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
    }
    catch (error) {
        core.error(`Failed to update release: ${error}`);
        throw error;
    }
}
async function getCommitsSinceLastTag() {
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
        }
        else {
            const { data } = await octokit.rest.repos.listCommits({
                owner: context.repo.owner,
                repo: context.repo.repo,
                sha: context.sha,
                per_page: 100
            });
            commits = data;
        }
        return commits.map(c => parseCommitFromGitHub(c));
    }
    catch (error) {
        core.error(`Failed to get commits: ${error}`);
        throw error;
    }
}
function parseCommitFromGitHub(commit) {
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
async function createTag(version, dryRun = false) {
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
    }
    catch (error) {
        if (error.status === 422) {
            core.warning(`Tag ${tagName} already exists`);
        }
        else {
            throw error;
        }
    }
}
//# sourceMappingURL=release.js.map