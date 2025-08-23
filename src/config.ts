import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface Config {
  projectName: string;
  releaseSections: string[];
  excludedScopes: string[];
  prChecklist: string[];
  versionFile: string;
  notificationChannels?: {
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
    };
    teams?: {
      enabled: boolean;
      webhookUrl?: string;
    };
  };
  aiProvider?: 'openai' | 'anthropic';
  customReleaseTemplate?: string;
}

const defaultConfig: Config = {
  projectName: path.basename(process.cwd()),
  releaseSections: ['feat', 'fix', 'perf', 'refactor'],
  excludedScopes: ['ci', 'chore'],
  prChecklist: [
    'Tests added/updated',
    'Documentation updated',
    'Breaking changes documented'
  ],
  versionFile: 'package.json'
};

export async function loadConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), '.releasepilot.yml');
  
  if (!fs.existsSync(configPath)) {
    core.info('No .releasepilot.yml found, using default configuration');
    return defaultConfig;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const userConfig = yaml.load(configContent) as Partial<Config>;
    
    const config: Config = {
      ...defaultConfig,
      ...userConfig,
      projectName: userConfig.projectName || defaultConfig.projectName,
      releaseSections: userConfig.releaseSections || defaultConfig.releaseSections,
      excludedScopes: userConfig.excludedScopes || defaultConfig.excludedScopes,
      prChecklist: userConfig.prChecklist || defaultConfig.prChecklist,
      versionFile: userConfig.versionFile || defaultConfig.versionFile
    };

    if (config.notificationChannels?.slack?.webhookUrl) {
      config.notificationChannels.slack.webhookUrl = expandEnvVars(
        config.notificationChannels.slack.webhookUrl
      );
    }

    if (config.notificationChannels?.teams?.webhookUrl) {
      config.notificationChannels.teams.webhookUrl = expandEnvVars(
        config.notificationChannels.teams.webhookUrl
      );
    }

    return config;
  } catch (error) {
    core.warning(`Failed to load .releasepilot.yml: ${error}`);
    return defaultConfig;
  }
}

function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    return process.env[envVar] || '';
  });
}

export function getInputOrConfig<T>(
  inputName: string,
  configValue: T | undefined,
  defaultValue: T
): T {
  const inputValue = core.getInput(inputName);
  if (inputValue && inputValue !== '') {
    return inputValue as unknown as T;
  }
  return configValue !== undefined ? configValue : defaultValue;
}