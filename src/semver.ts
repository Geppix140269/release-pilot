import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import * as toml from 'toml';
import { Config } from './config';

export type ReleaseType = 'major' | 'minor' | 'patch';

export interface VersionInfo {
  current: string;
  next: string;
  releaseType: ReleaseType;
}

export function determineReleaseType(commits: ParsedCommit[]): ReleaseType {
  const hasBreakingChange = commits.some(c => 
    c.breaking || 
    c.notes?.some(n => n.title === 'BREAKING CHANGE') ||
    c.footer?.includes('BREAKING CHANGE')
  );
  
  if (hasBreakingChange) {
    return 'major';
  }

  const hasFeature = commits.some(c => c.type === 'feat');
  if (hasFeature) {
    return 'minor';
  }

  return 'patch';
}

export interface ParsedCommit {
  type: string | null;
  scope: string | null;
  subject: string;
  breaking: boolean;
  notes?: Array<{ title: string; text: string }>;
  footer?: string;
  hash: string;
  message: string;
}

export async function getCurrentVersion(versionFile: string): Promise<string> {
  const filePath = path.join(process.cwd(), versionFile);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Version file not found: ${versionFile}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(versionFile).toLowerCase();

  let version: string | undefined;

  switch (ext) {
    case '.json': {
      const json = JSON.parse(content);
      version = json.version;
      break;
    }
    case '.toml': {
      const tomlContent = toml.parse(content);
      if (versionFile.includes('pyproject.toml')) {
        version = tomlContent.project?.version || tomlContent.tool?.poetry?.version;
      } else if (versionFile.includes('Cargo.toml')) {
        version = tomlContent.package?.version;
      }
      break;
    }
    case '.yaml':
    case '.yml': {
      const yaml = require('js-yaml');
      const yamlContent = yaml.load(content);
      version = yamlContent.version;
      break;
    }
    default:
      throw new Error(`Unsupported version file format: ${ext}`);
  }

  if (!version) {
    throw new Error(`No version found in ${versionFile}`);
  }

  if (!semver.valid(version)) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return version;
}

export async function updateVersion(
  versionFile: string,
  newVersion: string,
  dryRun: boolean = false
): Promise<void> {
  const filePath = path.join(process.cwd(), versionFile);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Version file not found: ${versionFile}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(versionFile).toLowerCase();

  let updatedContent: string;

  switch (ext) {
    case '.json': {
      const json = JSON.parse(content);
      json.version = newVersion;
      updatedContent = JSON.stringify(json, null, 2) + '\n';
      break;
    }
    case '.toml': {
      if (versionFile.includes('pyproject.toml')) {
        updatedContent = content.replace(
          /version\s*=\s*["'][\d.]+["']/,
          `version = "${newVersion}"`
        );
      } else if (versionFile.includes('Cargo.toml')) {
        updatedContent = content.replace(
          /version\s*=\s*["'][\d.]+["']/,
          `version = "${newVersion}"`
        );
      } else {
        updatedContent = content.replace(
          /version\s*=\s*["'][\d.]+["']/,
          `version = "${newVersion}"`
        );
      }
      break;
    }
    case '.yaml':
    case '.yml': {
      updatedContent = content.replace(
        /version:\s*["']?[\d.]+["']?/,
        `version: "${newVersion}"`
      );
      break;
    }
    default:
      throw new Error(`Unsupported version file format: ${ext}`);
  }

  if (dryRun) {
    core.info(`[DRY RUN] Would update ${versionFile} to version ${newVersion}`);
    return;
  }

  fs.writeFileSync(filePath, updatedContent);
  core.info(`Updated ${versionFile} to version ${newVersion}`);
}

export function bumpVersion(
  currentVersion: string,
  releaseType: ReleaseType | 'auto',
  commits?: ParsedCommit[]
): string {
  const actualReleaseType = releaseType === 'auto' 
    ? determineReleaseType(commits || [])
    : releaseType;

  const newVersion = semver.inc(currentVersion, actualReleaseType);
  
  if (!newVersion) {
    throw new Error(`Failed to bump version ${currentVersion} with release type ${actualReleaseType}`);
  }

  return newVersion;
}

export function parseVersion(version: string): semver.SemVer | null {
  return semver.parse(version);
}

export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

export function compareVersions(v1: string, v2: string): number {
  return semver.compare(v1, v2);
}