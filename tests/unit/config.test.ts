import * as fs from 'fs';
import * as core from '@actions/core';
import { loadConfig, getInputOrConfig } from '../../src/config';
const path = require('path');

jest.mock('fs');
jest.mock('@actions/core');
jest.mock('js-yaml', () => ({
  load: jest.fn()
}));

const yaml = require('js-yaml');

describe('config module', () => {
  const mockCwd = '/test/project';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    process.env = {};
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const config = await loadConfig();
      
      expect(config.projectName).toBe('release-pilot-clean');
      expect(config.releaseSections).toEqual(['feat', 'fix', 'perf', 'refactor']);
      expect(config.excludedScopes).toEqual(['ci', 'chore']);
      expect(config.versionFile).toBe('package.json');
      expect(config.prChecklist).toContain('Tests added/updated');
    });

    it('should load and merge user config', async () => {
      const userConfig = {
        projectName: 'MyProject',
        releaseSections: ['feat', 'fix'],
        excludedScopes: ['test'],
        versionFile: 'version.json'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.projectName).toBe('MyProject');
      expect(config.releaseSections).toEqual(['feat', 'fix']);
      expect(config.excludedScopes).toEqual(['test']);
      expect(config.versionFile).toBe('version.json');
    });

    it('should expand environment variables in webhook URLs', async () => {
      process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/test';
      process.env.TEAMS_WEBHOOK = 'https://teams.microsoft.com/test';

      const userConfig = {
        notificationChannels: {
          slack: {
            enabled: true,
            webhookUrl: '${SLACK_WEBHOOK}'
          },
          teams: {
            enabled: true,
            webhookUrl: '${TEAMS_WEBHOOK}'
          }
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.notificationChannels?.slack?.webhookUrl).toBe('https://hooks.slack.com/test');
      expect(config.notificationChannels?.teams?.webhookUrl).toBe('https://teams.microsoft.com/test');
    });

    it('should handle AI provider configuration', async () => {
      const userConfig = {
        aiProvider: 'anthropic'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.aiProvider).toBe('anthropic');
    });

    it('should handle custom release template', async () => {
      const template = '## Release {{version}}\n{{changes}}';
      const userConfig = {
        customReleaseTemplate: template
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.customReleaseTemplate).toBe(template);
    });

    it('should return default config on yaml parsing error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid yaml');
      (yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const config = await loadConfig();

      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Failed to load .releasepilot.yml'));
      expect(config.projectName).toBe('release-pilot-clean');
      expect(config.versionFile).toBe('package.json');
    });

    it('should handle partial user config correctly', async () => {
      const userConfig = {
        projectName: 'PartialProject'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.projectName).toBe('PartialProject');
      expect(config.releaseSections).toEqual(['feat', 'fix', 'perf', 'refactor']);
      expect(config.excludedScopes).toEqual(['ci', 'chore']);
      expect(config.versionFile).toBe('package.json');
    });
  });

  describe('getInputOrConfig', () => {
    it('should return input value when provided', () => {
      (core.getInput as jest.Mock).mockReturnValue('input-value');
      
      const result = getInputOrConfig('test-input', 'config-value', 'default-value');
      
      expect(result).toBe('input-value');
      expect(core.getInput).toHaveBeenCalledWith('test-input');
    });

    it('should return config value when input is empty', () => {
      (core.getInput as jest.Mock).mockReturnValue('');
      
      const result = getInputOrConfig('test-input', 'config-value', 'default-value');
      
      expect(result).toBe('config-value');
    });

    it('should return default value when both input and config are undefined', () => {
      (core.getInput as jest.Mock).mockReturnValue('');
      
      const result = getInputOrConfig('test-input', undefined, 'default-value');
      
      expect(result).toBe('default-value');
    });

    it('should handle boolean values correctly', () => {
      (core.getInput as jest.Mock).mockReturnValue('true');
      
      const result = getInputOrConfig('test-input', false, false);
      
      expect(result).toBe('true');
    });

    it('should handle numeric values correctly', () => {
      (core.getInput as jest.Mock).mockReturnValue('42');
      
      const result = getInputOrConfig('test-input', 10, 0);
      
      expect(result).toBe('42');
    });
  });

  describe('environment variable expansion', () => {
    it('should expand multiple environment variables', async () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';

      const userConfig = {
        notificationChannels: {
          slack: {
            enabled: true,
            webhookUrl: '${VAR1}/webhook/${VAR2}'
          }
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.notificationChannels?.slack?.webhookUrl).toBe('value1/webhook/value2');
    });

    it('should handle missing environment variables', async () => {
      const userConfig = {
        notificationChannels: {
          slack: {
            enabled: true,
            webhookUrl: '${MISSING_VAR}'
          }
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
      (yaml.load as jest.Mock).mockReturnValue(userConfig);

      const config = await loadConfig();

      expect(config.notificationChannels?.slack?.webhookUrl).toBe('');
    });
  });
});