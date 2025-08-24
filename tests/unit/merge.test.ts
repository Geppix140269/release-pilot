import { validateMergePrerequisites, getMergeStats } from '../../src/merge';
import { Config } from '../../src/config';
import { ParsedCommit } from '../../src/semver';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Merge Module', () => {
  describe('validateMergePrerequisites', () => {
    const mockConfig: Config = {
      projectName: 'test-project',
      releaseSections: ['feat', 'fix'],
      excludedScopes: ['ci'],
      prChecklist: ['Tests'],
      versionFile: 'package.json'
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should pass validation when all required files exist', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      expect(() => {
        validateMergePrerequisites(mockConfig);
      }).not.toThrow();
      
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json')
      );
    });

    it('should throw error when version file is missing', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        validateMergePrerequisites(mockConfig);
      }).toThrow('Missing required files for merge: package.json');
    });
  });

  describe('getMergeStats', () => {
    it('should calculate correct statistics for commits', () => {
      const commits: ParsedCommit[] = [
        {
          type: 'feat',
          scope: 'ui',
          subject: 'add new button',
          breaking: false,
          hash: 'abc123',
          message: 'feat(ui): add new button'
        },
        {
          type: 'fix',
          scope: null,
          subject: 'fix bug',
          breaking: false,
          hash: 'def456',
          message: 'fix: fix bug'
        },
        {
          type: 'feat',
          scope: 'api',
          subject: 'breaking change',
          breaking: true,
          hash: 'ghi789',
          message: 'feat(api)!: breaking change'
        },
        {
          type: null,
          scope: null,
          subject: 'non-conventional commit',
          breaking: false,
          hash: 'jkl012',
          message: 'non-conventional commit'
        }
      ];

      const stats = getMergeStats(commits);

      expect(stats).toEqual({
        totalCommits: 4,
        conventionalCommits: 3,
        features: 2,
        fixes: 1,
        breakingChanges: 1
      });
    });

    it('should handle empty commits array', () => {
      const stats = getMergeStats([]);

      expect(stats).toEqual({
        totalCommits: 0,
        conventionalCommits: 0,
        features: 0,
        fixes: 0,
        breakingChanges: 0
      });
    });

    it('should handle commits with only non-conventional commits', () => {
      const commits: ParsedCommit[] = [
        {
          type: null,
          scope: null,
          subject: 'regular commit',
          breaking: false,
          hash: 'abc123',
          message: 'regular commit'
        },
        {
          type: null,
          scope: null,
          subject: 'another commit',
          breaking: false,
          hash: 'def456',
          message: 'another commit'
        }
      ];

      const stats = getMergeStats(commits);

      expect(stats).toEqual({
        totalCommits: 2,
        conventionalCommits: 0,
        features: 0,
        fixes: 0,
        breakingChanges: 0
      });
    });
  });
});