import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as github from '@actions/github';
import { ParsedCommit } from './semver';
import { Config } from './config';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string;
  compareUrl?: string;
}

export async function updateChangelog(
  version: string,
  commits: ParsedCommit[],
  config: Config,
  dryRun: boolean = false
): Promise<string> {
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

function generateChangelogEntry(
  version: string,
  commits: ParsedCommit[],
  config: Config
): string {
  const date = new Date().toISOString().split('T')[0];
  const compareUrl = generateCompareUrl(version);
  
  let entry = `## [v${version}](${compareUrl}) - ${date}\n\n`;
  
  const grouped = groupCommitsByType(commits, config);
  
  for (const [type, typeCommits] of Object.entries(grouped)) {
    if (typeCommits.length === 0) continue;
    
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

function insertChangelogEntry(existingContent: string, newEntry: string): string {
  if (!existingContent) {
    return `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${newEntry}`;
  }

  const changelogHeaderRegex = /^#\s+Changelog/im;
  const versionHeaderRegex = /^##\s+\[?v?\d+\.\d+\.\d+/m;
  
  const headerMatch = existingContent.match(changelogHeaderRegex);
  
  if (headerMatch) {
    const afterHeader = existingContent.substring(headerMatch.index! + headerMatch[0].length);
    const firstVersionMatch = afterHeader.match(versionHeaderRegex);
    
    if (firstVersionMatch) {
      const insertPosition = headerMatch.index! + headerMatch[0].length + firstVersionMatch.index!;
      return existingContent.substring(0, insertPosition) + 
             newEntry + '\n' +
             existingContent.substring(insertPosition);
    } else {
      return existingContent.substring(0, headerMatch.index! + headerMatch[0].length) +
             '\n\n' + newEntry +
             existingContent.substring(headerMatch.index! + headerMatch[0].length);
    }
  }
  
  return newEntry + '\n\n' + existingContent;
}

function generateCompareUrl(version: string): string {
  const context = github.context;
  const baseUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}`;
  
  const previousVersion = getPreviousVersion();
  
  if (previousVersion) {
    return `${baseUrl}/compare/v${previousVersion}...v${version}`;
  }
  
  return `${baseUrl}/releases/tag/v${version}`;
}

function getPreviousVersion(): string | null {
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
    
    if (config.excludedScopes.includes(commit.scope || '')) {
      continue;
    }
    
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

export function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const versionRegex = /^##\s+\[?v?(\d+\.\d+\.\d+)\]?(?:\([^)]+\))?\s*-?\s*(.+)$/gm;
  
  let match;
  const matches: Array<{ version: string; date: string; index: number }> = [];
  
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