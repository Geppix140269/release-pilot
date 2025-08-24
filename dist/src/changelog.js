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
exports.updateChangelog = updateChangelog;
exports.parseChangelog = parseChangelog;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const github = __importStar(require("@actions/github"));
async function updateChangelog(version, commits, config, dryRun = false) {
    const changelogPath = path.join(process.cwd(), core.getInput('changelog_path') || 'CHANGELOG.md');
    let existingContent = '';
    if (fs.existsSync(changelogPath)) {
        existingContent = fs.readFileSync(changelogPath, 'utf8');
    }
    const entry = generateChangelogEntry(version, commits, config);
    const newContent = insertChangelogEntry(existingContent, entry);
    if (dryRun) {
        core.info('[DRY RUN] Would update CHANGELOG.md');
        core.info(`[DRY RUN] New entry:\n${entry}`);
        return entry;
    }
    fs.writeFileSync(changelogPath, newContent);
    core.info(`Updated ${changelogPath} with version ${version}`);
    return entry;
}
function generateChangelogEntry(version, commits, config) {
    const date = new Date().toISOString().split('T')[0];
    const compareUrl = generateCompareUrl(version);
    let entry = `## [v${version}](${compareUrl}) - ${date}\n\n`;
    const grouped = groupCommitsByType(commits, config);
    for (const [type, typeCommits] of Object.entries(grouped)) {
        if (typeCommits.length === 0)
            continue;
        entry += `### ${getTypeHeading(type)}\n`;
        for (const commit of typeCommits) {
            const scope = commit.scope ? `**${commit.scope}:** ` : '';
            const breaking = commit.breaking ? ' **BREAKING**' : '';
            entry += `- ${scope}${commit.subject}${breaking}\n`;
        }
        entry += '\n';
    }
    return entry;
}
function insertChangelogEntry(existingContent, newEntry) {
    if (!existingContent) {
        return `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newEntry}`;
    }
    const changelogHeaderRegex = /^#\s+Changelog/im;
    const versionHeaderRegex = /^##\s+\[?v?\d+\.\d+\.\d+/m;
    const headerMatch = existingContent.match(changelogHeaderRegex);
    if (headerMatch) {
        const afterHeader = existingContent.substring(headerMatch.index + headerMatch[0].length);
        const firstVersionMatch = afterHeader.match(versionHeaderRegex);
        if (firstVersionMatch) {
            const insertPosition = headerMatch.index + headerMatch[0].length + firstVersionMatch.index;
            return existingContent.substring(0, insertPosition) +
                newEntry + '\n' +
                existingContent.substring(insertPosition);
        }
        else {
            return existingContent.substring(0, headerMatch.index + headerMatch[0].length) +
                '\n\n' + newEntry +
                existingContent.substring(headerMatch.index + headerMatch[0].length);
        }
    }
    return newEntry + '\n\n' + existingContent;
}
function generateCompareUrl(version) {
    const context = github.context;
    const baseUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}`;
    const previousVersion = getPreviousVersion();
    if (previousVersion) {
        return `${baseUrl}/compare/v${previousVersion}...v${version}`;
    }
    return `${baseUrl}/releases/tag/v${version}`;
}
function getPreviousVersion() {
    const changelogPath = path.join(process.cwd(), core.getInput('changelog_path') || 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) {
        return null;
    }
    const content = fs.readFileSync(changelogPath, 'utf8');
    const versionRegex = /^##\s+\[?v?(\d+\.\d+\.\d+)/gm;
    const matches = [...content.matchAll(versionRegex)];
    if (matches.length > 0) {
        return matches[0][1];
    }
    return null;
}
function groupCommitsByType(commits, config) {
    const grouped = {};
    for (const section of config.releaseSections) {
        grouped[section] = [];
    }
    for (const commit of commits) {
        if (!commit.type)
            continue;
        if (config.excludedScopes.includes(commit.scope || '')) {
            continue;
        }
        if (grouped[commit.type]) {
            grouped[commit.type].push(commit);
        }
    }
    return grouped;
}
function getTypeHeading(type) {
    const headingMap = {
        feat: 'Features',
        fix: 'Bug Fixes',
        perf: 'Performance Improvements',
        refactor: 'Code Refactoring',
        docs: 'Documentation',
        style: 'Styles',
        test: 'Tests',
        build: 'Build System',
        ci: 'Continuous Integration',
        chore: 'Chores',
        revert: 'Reverts'
    };
    return headingMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
function parseChangelog(content) {
    const entries = [];
    const versionRegex = /^##\s+\[?v?(\d+\.\d+\.\d+)\]?(?:\([^)]+\))?\s*-?\s*(.+)$/gm;
    let match;
    const matches = [];
    while ((match = versionRegex.exec(content)) !== null) {
        matches.push({
            version: match[1],
            date: match[2].trim(),
            index: match.index
        });
    }
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        const endIndex = next ? next.index : content.length;
        const changes = content.substring(current.index, endIndex).trim();
        entries.push({
            version: current.version,
            date: current.date,
            changes
        });
    }
    return entries;
}
//# sourceMappingURL=changelog.js.map