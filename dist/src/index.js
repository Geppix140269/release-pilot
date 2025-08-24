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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const config_1 = require("./config");
const license_1 = require("./license");
const pr_1 = require("./pr");
const release_1 = require("./release");
const notify_1 = require("./notify");
const deploy_1 = require("./deploy");
const merge_1 = require("./merge");
async function run() {
    try {
        core.info('🚀 ReleasePilot starting...');
        const config = await (0, config_1.loadConfig)();
        core.info(`Loaded configuration for project: ${config.projectName}`);
        const license = await (0, license_1.validateLicense)();
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
            await (0, license_1.postDryRunComment)(license.message || 'License validation failed');
        }
        core.info('✅ ReleasePilot completed successfully');
    }
    catch (error) {
        core.setFailed(`❌ ReleasePilot failed: ${error}`);
    }
}
function detectMode() {
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
async function handlePullRequest(config, isDryRun) {
    core.info('Handling pull request event...');
    const prInfo = await (0, pr_1.getPRInfo)();
    if (!prInfo) {
        core.warning('No pull request information found');
        return;
    }
    const body = await (0, pr_1.generatePRBody)(prInfo, config, prInfo.commits);
    await (0, pr_1.updatePRDescription)(prInfo.number, body, isDryRun);
    core.setOutput('pr_body', body);
}
async function handleMerge(config, isDryRun) {
    try {
        (0, merge_1.validateMergePrerequisites)(config);
        const result = await (0, merge_1.handleMergeToMain)(config, isDryRun);
        if (result) {
            core.setOutput('version', result.version);
            core.setOutput('changelog', result.changelogEntry);
            core.setOutput('release_type', result.releaseType);
            core.setOutput('commits_count', result.commitsSince.length.toString());
            // Handle deployment if configured
            const deploymentResult = await (0, deploy_1.handleDeployment)(config, result.version, isDryRun);
            if (deploymentResult.success) {
                core.setOutput('deployed', 'true');
                core.setOutput('deployment_url', deploymentResult.url || '');
                core.setOutput('deployment_environment', deploymentResult.environment);
            }
        }
        else {
            core.info('No version bump performed');
        }
    }
    catch (error) {
        core.error(`Merge handling failed: ${error}`);
        throw error;
    }
}
async function handleTag(config, isDryRun) {
    core.info('Handling tag push event...');
    const context = github.context;
    const tagName = context.ref.replace('refs/tags/', '');
    const version = tagName.replace(/^v/, '');
    const commits = await (0, release_1.getCommitsSinceLastTag)();
    await (0, release_1.createRelease)(version, commits, config, isDryRun);
    await (0, notify_1.sendNotifications)(version, commits, config);
    // Handle deployment for production (tags usually trigger production deployments)
    const deploymentResult = await (0, deploy_1.handleDeployment)(config, version, isDryRun);
    if (deploymentResult.success) {
        core.setOutput('deployed', 'true');
        core.setOutput('deployment_url', deploymentResult.url || '');
        core.setOutput('deployment_environment', deploymentResult.environment);
    }
    core.setOutput('version', version);
}
run();
//# sourceMappingURL=index.js.map