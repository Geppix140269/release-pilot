import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { validateLicense, postDryRunComment } from '../../src/license';

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('node-fetch');


describe('license module', () => {
  const mockContext = {
    repo: {
      owner: 'test-org',
      repo: 'test-repo'
    },
    eventName: 'push',
    sha: 'abc123',
    payload: {}
  };

  const mockOctokit = {
    rest: {
      repos: {
        get: jest.fn(),
        createCommitComment: jest.fn()
      },
      issues: {
        createComment: jest.fn()
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {};
    (github.context as any) = mockContext;
    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
  });

  describe('validateLicense', () => {
    it('should return valid for public repositories', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: false }
      });

      const result = await validateLicense();

      expect(result.isValid).toBe(true);
      expect(result.isDryRun).toBe(false);
      expect(core.info).toHaveBeenCalledWith('Public repository detected - no license required');
    });

    it('should return dry-run mode when no license key for private repo', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: true }
      });

      const result = await validateLicense();

      expect(result.isValid).toBe(false);
      expect(result.isDryRun).toBe(true);
      expect(result.message).toBe('No license key provided for private repository');
      expect(core.warning).toHaveBeenCalledWith('Private repository requires RELEASEPILOT_LICENSE secret');
    });

    it('should validate license successfully', async () => {
      process.env.RELEASEPILOT_LICENSE = 'valid-license-key';
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: true }
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          valid: true,
          expiresAt: '2025-12-31'
        })
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

      const result = await validateLicense();

      expect(result.isValid).toBe(true);
      expect(result.isDryRun).toBe(false);
      expect(result.expiresAt).toBe('2025-12-31');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.releasepilot.io/v1/license/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            org: 'test-org',
            repo: 'test-repo',
            licenseKey: 'valid-license-key'
          })
        })
      );
    });

    it('should handle invalid license response', async () => {
      process.env.RELEASEPILOT_LICENSE = 'invalid-license-key';
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: true }
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          valid: false,
          message: 'License expired'
        })
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

      const result = await validateLicense();

      expect(result.isValid).toBe(false);
      expect(result.isDryRun).toBe(true);
      expect(result.message).toBe('License expired');
      expect(core.warning).toHaveBeenCalledWith('Invalid license: License expired');
    });

    it('should handle API error response', async () => {
      process.env.RELEASEPILOT_LICENSE = 'license-key';
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: true }
      });

      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          message: 'Invalid request format'
        })
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

      const result = await validateLicense();

      expect(result.isValid).toBe(false);
      expect(result.isDryRun).toBe(true);
      expect(result.message).toBe('Invalid request format');
      expect(core.warning).toHaveBeenCalledWith('License validation error: Invalid request format');
    });

    it('should handle network errors', async () => {
      process.env.RELEASEPILOT_LICENSE = 'license-key';
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { private: true }
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));

      const result = await validateLicense();

      expect(result.isValid).toBe(false);
      expect(result.isDryRun).toBe(true);
      expect(result.message).toContain('Network error');
      expect(core.warning).toHaveBeenCalledWith('Failed to validate license: Error: Network error');
    });

    it('should handle missing GitHub token when checking repo visibility', async () => {
      (core.getInput as jest.Mock).mockReturnValue('');
      process.env.GITHUB_TOKEN = undefined;

      const result = await validateLicense();

      expect(core.warning).toHaveBeenCalledWith('No GitHub token available to check repository visibility');
      expect(result.isDryRun).toBe(true);
    });

    it('should handle error when checking repo visibility', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('API error'));

      const result = await validateLicense();

      expect(core.warning).toHaveBeenCalledWith('Failed to check repository visibility: Error: API error');
      expect(result.isDryRun).toBe(true);
    });
  });

  describe('postDryRunComment', () => {
    it('should post comment on pull request', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      (github.context as any).eventName = 'pull_request';
      (github.context as any).payload = {
        pull_request: { number: 42 }
      };

      await postDryRunComment('Test message');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        issue_number: 42,
        body: expect.stringContaining('Test message')
      });
    });

    it('should post comment on push event', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      (github.context as any).eventName = 'push';

      await postDryRunComment('Test message');

      expect(mockOctokit.rest.repos.createCommitComment).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        commit_sha: 'abc123',
        body: expect.stringContaining('Test message')
      });
    });

    it('should handle missing GitHub token', async () => {
      (core.getInput as jest.Mock).mockReturnValue('');
      process.env.GITHUB_TOKEN = undefined;

      await postDryRunComment('Test message');

      expect(core.warning).toHaveBeenCalledWith('No GitHub token available to post comment');
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
      expect(mockOctokit.rest.repos.createCommitComment).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      mockOctokit.rest.repos.createCommitComment.mockRejectedValue(new Error('API error'));

      await postDryRunComment('Test message');

      expect(core.warning).toHaveBeenCalledWith('Failed to post dry-run comment: Error: API error');
    });

    it('should include license purchase instructions in comment', async () => {
      (core.getInput as jest.Mock).mockReturnValue('github-token');
      (github.context as any).eventName = 'push';

      await postDryRunComment('Custom message');

      const expectedBody = expect.stringContaining('Purchase a license at');
      expect(mockOctokit.rest.repos.createCommitComment).toHaveBeenCalledWith(
        expect.objectContaining({ body: expectedBody })
      );
    });
  });
});