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
exports.handleMergeToMain = handleMergeToMain;
exports.validateMergePrerequisites = validateMergePrerequisites;
exports.getMergeStats = getMergeStats;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver_1 = require("./semver");
const changelog_1 = require("./changelog");
const release_1 = require("./release");
const notify_1 = require("./notify");
/**
 * Handles merge to main branch events, performing version bumping,
 * changelog updates, and tag creation.
 */
async function handleMergeToMain(config, isDryRun = false) {
    try {
        core.info('🔀 Processing merge to main branch...');
        // Validate this is indeed a merge to the default branch
        if (!isMergeToDefaultBranch()) {
            core.info('Not a merge to default branch, skipping merge handling');
            return null;
        }
        // Get commits since last tag
        const commits = await (0, release_1.getCommitsSinceLastTag)();
        if (commits.length === 0) {
            core.info('No commits found since last tag');
            return null;
        }
        // Filter for conventional commits
        const conventionalCommits = commits.filter(c => c.type !== null);
        if (conventionalCommits.length === 0) {
            return await handleNoConventionalCommits(commits);
        }
        core.info(`Found ${conventionalCommits.length} conventional commits out of ${commits.length} total`);
        // Determine version bump
        const currentVersion = await (0, semver_1.getCurrentVersion)(config.versionFile);
        const releaseType = await determineVersionBumpType(conventionalCommits);
        const newVersion = (0, semver_1.bumpVersion)(currentVersion, releaseType);
        core.info(`Version bump: ${currentVersion} → ${newVersion} (${releaseType})`);
        if (isDryRun) {
            return await performDryRunMerge(newVersion, conventionalCommits, config, releaseType);
        }
        return await performActualMerge(currentVersion, newVersion, conventionalCommits, config, releaseType);
    }
    catch (error) {
        core.error(`Failed to handle merge: ${error}`);
        throw error;
    }
}
/**
 * Checks if the current event is a merge to the default branch
 */
function isMergeToDefaultBranch() {
    const context = github.context;
    if (context.eventName !== 'push') {
        return false;
    }
    const defaultBranch = context.payload.repository?.default_branch || 'main';
    const targetRef = `refs/heads/${defaultBranch}`;
    return context.ref === targetRef;
}
/**
 * Handles the case where no conventional commits are found
 */
async function handleNoConventionalCommits(commits) {
    const failOnMissing = core.getInput('fail_on_missing_conventional_commits') === 'true';
    if (failOnMissing) {
        const commitMessages = commits.map(c => `- ${c.subject}`).join('\n');
        const errorMessage = `No conventional commits found in the following ${commits.length} commits:\n${commitMessages}`;
        throw new Error(errorMessage);
    }
    core.warning(`No conventional commits found in ${commits.length} commits, skipping version bump`);
    core.info('Commits found:');
    commits.forEach(c => core.info(`  - ${c.subject}`));
    return null;
}
/**
 * Determines the version bump type based on commits and configuration
 */
async function determineVersionBumpType(commits) {
    const releaseTypeInput = core.getInput('release_type') || 'auto';
    if (releaseTypeInput === 'auto') {
        return (0, semver_1.determineReleaseType)(commits);
    }
    if (!['major', 'minor', 'patch'].includes(releaseTypeInput)) {
        throw new Error(`Invalid release type: ${releaseTypeInput}. Must be one of: major, minor, patch, auto`);
    }
    return releaseTypeInput;
}
/**
 * Performs a dry run merge simulation
 */
async function performDryRunMerge(newVersion, commits, config, releaseType) {
    core.info('[DRY RUN] 🚀 Simulating merge process...');
    // Simulate version file update
    await (0, semver_1.updateVersion)(config.versionFile, newVersion, true);
    // Simulate changelog update
    const changelogEntry = await (0, changelog_1.updateChangelog)(newVersion, commits, config, true);
    // Simulate tag creation
    await (0, release_1.createTag)(newVersion, true);
    // Simulate notifications
    await (0, notify_1.sendNotifications)(newVersion, commits, config);
    core.info('[DRY RUN] ✅ Merge simulation completed');
    return {
        version: newVersion,
        changelogEntry,
        commitsSince: commits,
        releaseType
    };
}
/**
 * Performs the actual merge process with real changes
 */
async function performActualMerge(currentVersion, newVersion, commits, config, releaseType) {
    core.info('🚀 Performing actual merge process...');
    try {
        // Update version file
        await (0, semver_1.updateVersion)(config.versionFile, newVersion, false);
        core.info(`✅ Updated version file: ${config.versionFile}`);
        // Update changelog
        const changelogEntry = await (0, changelog_1.updateChangelog)(newVersion, commits, config, false);
        core.info('✅ Updated changelog');
        // Commit the changes
        await commitVersionBump(config.versionFile, newVersion);
        core.info('✅ Committed version bump');
        // Create tag
        await (0, release_1.createTag)(newVersion, false);
        core.info(`✅ Created tag: v${newVersion}`);
        // Send notifications
        await (0, notify_1.sendNotifications)(newVersion, commits, config);
        core.info('✅ Sent notifications');
        // Set outputs for other steps
        core.setOutput('version', newVersion);
        core.setOutput('previous_version', currentVersion);
        core.setOutput('release_type', releaseType);
        core.setOutput('changelog', changelogEntry);
        core.setOutput('commits_count', commits.length.toString());
        core.info(`🎉 Merge process completed: ${currentVersion} → ${newVersion}`);
        return {
            version: newVersion,
            changelogEntry,
            commitsSince: commits,
            releaseType
        };
    }
    catch (error) {
        core.error(`Failed during merge process: ${error}`);
        // Attempt to rollback changes if possible
        await rollbackChanges(currentVersion, config.versionFile);
        throw error;
    }
}
/**
 * Commits the version bump changes to the repository
 */
async function commitVersionBump(versionFile, version) {
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GitHub token is required for committing version bump');
    }
    const octokit = github.getOctokit(token);
    const context = github.context;
    try {
        // Get the current branch reference
        const branchName = context.ref.replace('refs/heads/', '');
        const { data: ref } = await octokit.rest.git.getRef({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: `heads/${branchName}`
        });
        // Get the current commit
        const { data: commit } = await octokit.rest.git.getCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: ref.object.sha
        });
        // Get the current tree
        const { data: tree } = await octokit.rest.git.getTree({
            owner: context.repo.owner,
            repo: context.repo.repo,
            tree_sha: commit.tree.sha
        });
        // Read the updated files
        const versionFileContent = await getFileContent(versionFile);
        const changelogContent = await getFileContent('CHANGELOG.md');
        // Create blobs for the updated files
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
        // Create new tree with updated files
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
        // Create new commit
        const commitMessage = `chore(release): bump version to ${version} [skip ci]

- Updated ${versionFile} to ${version}
- Updated CHANGELOG.md with release notes

This commit was automatically created by ReleasePilot.`;
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            message: commitMessage,
            tree: newTree.sha,
            parents: [ref.object.sha]
        });
        // Update the branch reference
        await octokit.rest.git.updateRef({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: `heads/${branchName}`,
            sha: newCommit.sha
        });
        core.info(`📝 Committed version bump: ${newCommit.sha}`);
        core.setOutput('commit_sha', newCommit.sha);
    }
    catch (error) {
        core.error(`Failed to commit version bump: ${error}`);
        throw new Error(`Failed to commit version bump: ${error}`);
    }
}
/**
 * Attempts to rollback changes in case of failure
 */
async function rollbackChanges(previousVersion, versionFile) {
    try {
        core.warning('⏪ Attempting to rollback changes...');
        // Restore previous version in version file
        await (0, semver_1.updateVersion)(versionFile, previousVersion, false);
        core.info('✅ Successfully rolled back version file');
    }
    catch (rollbackError) {
        core.error(`Failed to rollback changes: ${rollbackError}`);
        // Don't throw here, as the original error is more important
    }
}
/**
 * Reads file content from disk
 */
async function getFileContent(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
}
/**
 * Validates that required files exist for the merge process
 */
function validateMergePrerequisites(config) {
    const requiredFiles = [config.versionFile];
    const missingFiles = requiredFiles.filter(file => {
        const fullPath = path.join(process.cwd(), file);
        return !fs.existsSync(fullPath);
    });
    if (missingFiles.length > 0) {
        throw new Error(`Missing required files for merge: ${missingFiles.join(', ')}`);
    }
}
/**
 * Gets merge-related statistics for reporting
 */
function getMergeStats(commits) {
    const conventionalCommits = commits.filter(c => c.type !== null);
    return {
        totalCommits: commits.length,
        conventionalCommits: conventionalCommits.length,
        features: commits.filter(c => c.type === 'feat').length,
        fixes: commits.filter(c => c.type === 'fix').length,
        breakingChanges: commits.filter(c => c.breaking).length
    };
}
//# sourceMappingURL=merge.js.map