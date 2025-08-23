import * as core from '@actions/core';
import fetch from 'node-fetch';
import { ParsedCommit } from './semver';
import { Config } from './config';

export async function generateAISummary(
  commits: ParsedCommit[],
  config: Config
): Promise<string | null> {
  const openaiKey = core.getInput('openai_api_key') || process.env.OPENAI_API_KEY;
  const anthropicKey = core.getInput('anthropic_api_key') || process.env.ANTHROPIC_API_KEY;
  
  const provider = config.aiProvider || (openaiKey ? 'openai' : 'anthropic');
  
  if (provider === 'openai' && openaiKey) {
    return generateOpenAISummary(commits, config, openaiKey);
  } else if (provider === 'anthropic' && anthropicKey) {
    return generateAnthropicSummary(commits, config, anthropicKey);
  }
  
  return null;
}

async function generateOpenAISummary(
  commits: ParsedCommit[],
  config: Config,
  apiKey: string
): Promise<string | null> {
  const commitList = formatCommitsForAI(commits);
  
  const systemPrompt = 'You are a concise release note writer. Group by feature/fix. Avoid fluff.';
  const userPrompt = `Write a 3-6 bullet summary from these commits:
${commitList}
Project: ${config.projectName}. Keep each bullet <16 words.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const data = await response.json() as any;
    return data.choices[0].message.content;
  } catch (error) {
    core.warning(`OpenAI summary generation failed: ${error}`);
    return null;
  }
}

async function generateAnthropicSummary(
  commits: ParsedCommit[],
  config: Config,
  apiKey: string
): Promise<string | null> {
  const commitList = formatCommitsForAI(commits);
  
  const prompt = `You are a concise release note writer. Group by feature/fix. Avoid fluff.

Write a 3-6 bullet summary from these commits:
${commitList}
Project: ${config.projectName}. Keep each bullet <16 words.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await response.json() as any;
    return data.content[0].text;
  } catch (error) {
    core.warning(`Anthropic summary generation failed: ${error}`);
    return null;
  }
}

function formatCommitsForAI(commits: ParsedCommit[]): string {
  return commits
    .filter(c => c.type)
    .map(c => {
      const scope = c.scope ? `(${c.scope})` : '';
      const breaking = c.breaking ? ' [BREAKING]' : '';
      return `${c.type}${scope}: ${c.subject}${breaking}`;
    })
    .join('\n');
}

export async function generateReleaseNotes(
  version: string,
  commits: ParsedCommit[],
  config: Config
): Promise<string> {
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
    if (typeCommits.length === 0) continue;
    
    notes += `### ${getTypeHeading(type)}\n\n`;
    for (const commit of typeCommits) {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      notes += `- ${scope}${commit.subject}\n`;
    }
    notes += '\n';
  }
  
  return notes;
}

function groupCommitsByType(
  commits: ParsedCommit[],
  config: Config
): Record<string, ParsedCommit[]> {
  const grouped: Record<string, ParsedCommit[]> = {};
  
  for (const section of config.releaseSections) {
    grouped[section] = [];
  }

  for (const commit of commits) {
    if (!commit.type) continue;
    if (config.excludedScopes.includes(commit.scope || '')) continue;
    
    if (grouped[commit.type]) {
      grouped[commit.type].push(commit);
    }
  }

  return grouped;
}

function getTypeHeading(type: string): string {
  const headingMap: Record<string, string> = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance Improvements',
    refactor: 'Code Refactoring'
  };
  
  return headingMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function formatCommitsForRelease(commits: ParsedCommit[]): string {
  return commits
    .filter(c => c.type)
    .map(c => `- ${c.hash.substring(0, 7)} ${c.type}: ${c.subject}`)
    .join('\n');
}