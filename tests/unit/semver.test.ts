import * as fs from 'fs';
import * as path from 'path';
import {
  determineReleaseType,
  getCurrentVersion,
  updateVersion,
  bumpVersion,
  parseVersion,
  isValidVersion,
  compareVersions,
  ParsedCommit
} from '../../src/semver';

jest.mock('fs');
jest.mock('@actions/core');

describe('semver module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineReleaseType', () => {
    it('should return major for breaking changes', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'feat',
          scope: null,
          subject: 'add feature',
          breaking: true,
          hash: 'abc123',
          message: 'feat: add feature'
        }
      ];
      expect(determineReleaseType(commits)).toBe('major');
    });

    it('should return major for BREAKING CHANGE in notes', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'fix',
          scope: null,
          subject: 'fix bug',
          breaking: false,
          notes: [{ title: 'BREAKING CHANGE', text: 'This breaks API' }],
          hash: 'def456',
          message: 'fix: fix bug'
        }
      ];
      expect(determineReleaseType(commits)).toBe('major');
    });

    it('should return major for BREAKING CHANGE in footer', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'fix',
          scope: null,
          subject: 'fix bug',
          breaking: false,
          footer: 'BREAKING CHANGE: This changes everything',
          hash: 'ghi789',
          message: 'fix: fix bug'
        }
      ];
      expect(determineReleaseType(commits)).toBe('major');
    });

    it('should return minor for feat commits', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'feat',
          scope: null,
          subject: 'add feature',
          breaking: false,
          hash: 'jkl012',
          message: 'feat: add feature'
        }
      ];
      expect(determineReleaseType(commits)).toBe('minor');
    });

    it('should return patch for fix commits', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'fix',
          scope: null,
          subject: 'fix bug',
          breaking: false,
          hash: 'mno345',
          message: 'fix: fix bug'
        }
      ];
      expect(determineReleaseType(commits)).toBe('patch');
    });

    it('should return patch for empty commits', () => {
      expect(determineReleaseType([])).toBe('patch');
    });

    it('should prioritize major over minor', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'feat',
          scope: null,
          subject: 'add feature',
          breaking: false,
          hash: 'pqr678',
          message: 'feat: add feature'
        },
        {
          type: 'fix',
          scope: null,
          subject: 'fix bug',
          breaking: true,
          hash: 'stu901',
          message: 'fix!: fix bug'
        }
      ];
      expect(determineReleaseType(commits)).toBe('major');
    });
  });

  describe('getCurrentVersion', () => {
    const mockCwd = '/test/project';
    
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    });

    it('should read version from package.json', async () => {
      const mockContent = JSON.stringify({ version: '1.2.3' });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const version = await getCurrentVersion('package.json');
      expect(version).toBe('1.2.3');
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockCwd, 'package.json'),
        'utf8'
      );
    });

    it('should throw error if version file not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(getCurrentVersion('package.json')).rejects.toThrow(
        'Version file not found: package.json'
      );
    });

    it('should throw error for invalid semver version', async () => {
      const mockContent = JSON.stringify({ version: 'invalid.version' });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      await expect(getCurrentVersion('package.json')).rejects.toThrow(
        'Invalid semver version: invalid.version'
      );
    });

    it('should throw error if no version field found', async () => {
      const mockContent = JSON.stringify({ name: 'test' });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      await expect(getCurrentVersion('package.json')).rejects.toThrow(
        'No version found in package.json'
      );
    });

    it('should throw error for unsupported file format', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('content');

      await expect(getCurrentVersion('file.txt')).rejects.toThrow(
        'Unsupported version file format: .txt'
      );
    });
  });

  describe('updateVersion', () => {
    const mockCwd = '/test/project';
    
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    });

    it('should update version in package.json', async () => {
      const mockContent = JSON.stringify({ version: '1.0.0', name: 'test' }, null, 2);
      const expectedContent = JSON.stringify({ version: '2.0.0', name: 'test' }, null, 2) + '\n';
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await updateVersion('package.json', '2.0.0');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockCwd, 'package.json'),
        expectedContent
      );
    });

    it('should not write file in dry-run mode', async () => {
      const mockContent = JSON.stringify({ version: '1.0.0' });
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      await updateVersion('package.json', '2.0.0', true);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should throw error if version file not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(updateVersion('package.json', '2.0.0')).rejects.toThrow(
        'Version file not found: package.json'
      );
    });
  });

  describe('bumpVersion', () => {
    it('should bump major version', () => {
      const result = bumpVersion('1.2.3', 'major');
      expect(result).toBe('2.0.0');
    });

    it('should bump minor version', () => {
      const result = bumpVersion('1.2.3', 'minor');
      expect(result).toBe('1.3.0');
    });

    it('should bump patch version', () => {
      const result = bumpVersion('1.2.3', 'patch');
      expect(result).toBe('1.2.4');
    });

    it('should auto-determine version bump from commits', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'feat',
          scope: null,
          subject: 'add feature',
          breaking: false,
          hash: 'abc123',
          message: 'feat: add feature'
        }
      ];
      const result = bumpVersion('1.2.3', 'auto', commits);
      expect(result).toBe('1.3.0');
    });

    it('should throw error for invalid version', () => {
      expect(() => bumpVersion('invalid', 'patch')).toThrow();
    });
  });

  describe('isValidVersion', () => {
    it('should return true for valid semver', () => {
      expect(isValidVersion('1.2.3')).toBe(true);
      expect(isValidVersion('0.0.1')).toBe(true);
      expect(isValidVersion('10.20.30')).toBe(true);
    });

    it('should return false for invalid semver', () => {
      expect(isValidVersion('1.2')).toBe(false);
      expect(isValidVersion('invalid')).toBe(false);
      expect(isValidVersion('1.2.3.4')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('should return 1 when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    });

    it('should return -1 when second version is greater', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    });
  });

  describe('parseVersion', () => {
    it('should parse valid semver string', () => {
      const parsed = parseVersion('1.2.3');
      expect(parsed).toBeTruthy();
      expect(parsed?.major).toBe(1);
      expect(parsed?.minor).toBe(2);
      expect(parsed?.patch).toBe(3);
    });

    it('should return null for invalid version', () => {
      expect(parseVersion('invalid')).toBeNull();
    });
  });
});