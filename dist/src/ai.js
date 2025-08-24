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
exports.generateAISummary = generateAISummary;
exports.generateReleaseNotes = generateReleaseNotes;
const core = __importStar(require("@actions/core"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function generateAISummary(commits, config) {
    const openaiKey = core.getInput('openai_api_key') || process.env.OPENAI_API_KEY;
    const anthropicKey = core.getInput('anthropic_api_key') || process.env.ANTHROPIC_API_KEY;
    const provider = config.aiProvider || (openaiKey ? 'openai' : 'anthropic');
    if (provider === 'openai' && openaiKey) {
        return generateOpenAISummary(commits, config, openaiKey);
    }
    else if (provider === 'anthropic' && anthropicKey) {
        return generateAnthropicSummary(commits, config, anthropicKey);
    }
    return null;
}
async function generateOpenAISummary(commits, config, apiKey) {
    const commitList = formatCommitsForAI(commits);
    const systemPrompt = 'You are a concise release note writer. Group by feature/fix. Avoid fluff.';
    const userPrompt = `Write a 3-6 bullet summary from these commits:
${commitList}
Project: ${config.projectName}. Keep each bullet <16 words.`;
    try {
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 300
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
    catch (error) {
        core.warning(`OpenAI summary generation failed: ${error}`);
        return null;
    }
}
async function generateAnthropicSummary(commits, config, apiKey) {
    const commitList = formatCommitsForAI(commits);
    const prompt = `You are a concise release note writer. Group by feature/fix. Avoid fluff.

Write a 3-6 bullet summary from these commits:
${commitList}
Project: ${config.projectName}. Keep each bullet <16 words.`;
    try {
        const response = await (0, node_fetch_1.default)('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.3
            })
        });
        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.content[0].text;
    }
    catch (error) {
        core.warning(`Anthropic summary generation failed: ${error}`);
        return null;
    }
}
function formatCommitsForAI(commits) {
    return commits
        .filter(c => c.type)
        .map(c => {
        const scope = c.scope ? `(${c.scope})` : '';
        const breaking = c.breaking ? ' [BREAKING]' : '';
        return `${c.type}${scope}: ${c.subject}${breaking}`;
    })
        .join('\n');
}
async function generateReleaseNotes(version, commits, config) {
    const aiSummary = await generateAISummary(commits, config);
    if (aiSummary) {
        return `## ${config.projectName} v${version}

${aiSummary}

### Commits
${formatCommitsForRelease(commits)}`;
    }
    const grouped = groupCommitsByType(commits, config);
    let notes = `## ${config.projectName} v${version}\n\n`;
    for (const [type, typeCommits] of Object.entries(grouped)) {
        if (typeCommits.length === 0)
            continue;
        notes += `### ${getTypeHeading(type)}\n\n`;
        for (const commit of typeCommits) {
            const scope = commit.scope ? `**${commit.scope}:** ` : '';
            notes += `- ${scope}${commit.subject}\n`;
        }
        notes += '\n';
    }
    return notes;
}
function groupCommitsByType(commits, config) {
    const grouped = {};
    for (const section of config.releaseSections) {
        grouped[section] = [];
    }
    for (const commit of commits) {
        if (!commit.type)
            continue;
        if (config.excludedScopes.includes(commit.scope || ''))
            continue;
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
        refactor: 'Code Refactoring'
    };
    return headingMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
function formatCommitsForRelease(commits) {
    return commits
        .filter(c => c.type)
        .map(c => `- ${c.hash.substring(0, 7)} ${c.type}: ${c.subject}`)
        .join('\n');
}
//# sourceMappingURL=ai.js.map