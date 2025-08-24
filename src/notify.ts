import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { Config } from './config';
import { ParsedCommit } from './semver';

export interface NotificationPayload {
  version: string;
  repository: string;
  compareUrl: string;
  changes: string[];
  releaseUrl?: string;
}

export async function sendNotifications(
  version: string,
  commits: ParsedCommit[],
  config: Config,
  releaseUrl?: string
): Promise<void> {
  const payload = buildNotificationPayload(version, commits, releaseUrl);
  
  const slackWebhook = core.getInput('slack_webhook') || 
                       config.notificationChannels?.slack?.webhookUrl;
  const teamsWebhook = core.getInput('teams_webhook') || 
                       config.notificationChannels?.teams?.webhookUrl;

  const promises: Promise<void>[] = [];

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

function buildNotificationPayload(
  version: string,
  commits: ParsedCommit[],
  releaseUrl?: string
): NotificationPayload {
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

async function sendSlackNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<void> {
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
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    core.info('Slack notification sent successfully');
  } catch (error) {
    core.warning(`Failed to send Slack notification: ${error}`);
  }
}

async function sendTeamsNotification(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<void> {
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
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsPayload)
    });

    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.statusText}`);
    }

    core.info('Teams notification sent successfully');
  } catch (error) {
    core.warning(`Failed to send Teams notification: ${error}`);
  }
}

export async function sendDryRunNotification(
  version: string,
  commits: ParsedCommit[],
  config: Config
): Promise<void> {
  const payload = buildNotificationPayload(version, commits);
  
  core.info('[DRY RUN] Would send notifications:');
  core.info(`  Version: ${payload.version}`);
  core.info(`  Repository: ${payload.repository}`);
  core.info(`  Changes:`);
  payload.changes.forEach(change => {
    core.info(`    - ${change}`);
  });
}