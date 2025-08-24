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
exports.sendNotifications = sendNotifications;
exports.sendDryRunNotification = sendDryRunNotification;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function sendNotifications(version, commits, config, releaseUrl) {
    const payload = buildNotificationPayload(version, commits, releaseUrl);
    const slackWebhook = core.getInput('slack_webhook') ||
        config.notificationChannels?.slack?.webhookUrl;
    const teamsWebhook = core.getInput('teams_webhook') ||
        config.notificationChannels?.teams?.webhookUrl;
    const promises = [];
    if (slackWebhook && config.notificationChannels?.slack?.enabled !== false) {
        promises.push(sendSlackNotification(slackWebhook, payload));
    }
    if (teamsWebhook && config.notificationChannels?.teams?.enabled !== false) {
        promises.push(sendTeamsNotification(teamsWebhook, payload));
    }
    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}
function buildNotificationPayload(version, commits, releaseUrl) {
    const context = github.context;
    const repository = `${context.repo.owner}/${context.repo.repo}`;
    const compareUrl = `https://github.com/${repository}/compare/v${version}`;
    const significantCommits = commits
        .filter(c => c.type && ['feat', 'fix', 'perf'].includes(c.type))
        .slice(0, 5);
    const changes = significantCommits.map(c => {
        const scope = c.scope ? `(${c.scope})` : '';
        return `${c.type}${scope}: ${c.subject}`;
    });
    return {
        version,
        repository,
        compareUrl,
        changes,
        releaseUrl
    };
}
async function sendSlackNotification(webhookUrl, payload) {
    const slackPayload = {
        text: `New release: ${payload.repository} v${payload.version}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `🚀 ${payload.repository} v${payload.version}`
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*Changes:*\n' + payload.changes.map(c => `• ${c}`).join('\n')
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Changes'
                        },
                        url: payload.compareUrl
                    }
                ]
            }
        ]
    };
    if (payload.releaseUrl) {
        const actionsBlock = slackPayload.blocks[2];
        if (actionsBlock && 'elements' in actionsBlock && actionsBlock.elements) {
            actionsBlock.elements.push({
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: 'View Release'
                },
                url: payload.releaseUrl
            });
        }
    }
    try {
        const response = await (0, node_fetch_1.default)(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload)
        });
        if (!response.ok) {
            throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
        core.info('Slack notification sent successfully');
    }
    catch (error) {
        core.warning(`Failed to send Slack notification: ${error}`);
    }
}
async function sendTeamsNotification(webhookUrl, payload) {
    const teamsPayload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '0076D7',
        summary: `New release: ${payload.repository} v${payload.version}`,
        sections: [
            {
                activityTitle: `🚀 ${payload.repository} v${payload.version}`,
                activitySubtitle: 'A new version has been released',
                facts: payload.changes.map((change, index) => ({
                    name: `Change ${index + 1}`,
                    value: change
                }))
            }
        ],
        potentialAction: [
            {
                '@type': 'OpenUri',
                name: 'View Changes',
                targets: [
                    {
                        os: 'default',
                        uri: payload.compareUrl
                    }
                ]
            }
        ]
    };
    if (payload.releaseUrl) {
        teamsPayload.potentialAction.push({
            '@type': 'OpenUri',
            name: 'View Release',
            targets: [
                {
                    os: 'default',
                    uri: payload.releaseUrl
                }
            ]
        });
    }
    try {
        const response = await (0, node_fetch_1.default)(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teamsPayload)
        });
        if (!response.ok) {
            throw new Error(`Teams webhook failed: ${response.statusText}`);
        }
        core.info('Teams notification sent successfully');
    }
    catch (error) {
        core.warning(`Failed to send Teams notification: ${error}`);
    }
}
async function sendDryRunNotification(version, commits, config) {
    const payload = buildNotificationPayload(version, commits);
    core.info('[DRY RUN] Would send notifications:');
    core.info(`  Version: ${payload.version}`);
    core.info(`  Repository: ${payload.repository}`);
    core.info(`  Changes:`);
    payload.changes.forEach(change => {
        core.info(`    - ${change}`);
    });
}
//# sourceMappingURL=notify.js.map