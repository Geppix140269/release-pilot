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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLicense = validateLicense;
exports.postDryRunComment = postDryRunComment;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const LICENSE_API_URL = 'https://api.releasepilot.io/v1/license/verify';
async function validateLicense() {
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
        const response = await (0, node_fetch_1.default)(LICENSE_API_URL, {
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
            const errorMessage = errorData.message || `License validation failed: ${response.statusText}`;
            core.warning(`License validation error: ${errorMessage}`);
            core.warning('Action will run in dry-run mode');
            return {
                isValid: false,
                isDryRun: true,
                message: errorMessage
            };
        }
        const data = await response.json();
        if (data.valid) {
            core.info(`License validated successfully (expires: ${data.expiresAt || 'never'})`);
            return {
                isValid: true,
                isDryRun: false,
                expiresAt: data.expiresAt
            };
        }
        else {
            core.warning(`Invalid license: ${data.message || 'Unknown error'}`);
            core.warning('Action will run in dry-run mode');
            return {
                isValid: false,
                isDryRun: true,
                message: data.message
            };
        }
    }
    catch (error) {
        core.warning(`Failed to validate license: ${error}`);
        core.warning('Action will run in dry-run mode');
        return {
            isValid: false,
            isDryRun: true,
            message: `License validation error: ${error}`
        };
    }
}
async function checkIfPublicRepo() {
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
    }
    catch (error) {
        core.warning(`Failed to check repository visibility: ${error}`);
        return false;
    }
}
async function postDryRunComment(message) {
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
        }
        else if (context.eventName === 'push') {
            await octokit.rest.repos.createCommitComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                commit_sha: context.sha,
                body: commentBody
            });
        }
    }
    catch (error) {
        core.warning(`Failed to post dry-run comment: ${error}`);
    }
}
//# sourceMappingURL=license.js.map