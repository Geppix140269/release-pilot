// ReleasePilot Code Review Module
// AI-powered code review for Azure DevOps Pull Requests

const axios = require('axios');
const tl = require('azure-pipelines-task-lib/task');

class CodeReviewer {
    constructor(openaiApiKey, azureDevOpsToken, orgUrl, projectName) {
        this.openaiApiKey = openaiApiKey;
        this.azureDevOpsToken = azureDevOpsToken;
        this.orgUrl = orgUrl;
        this.projectName = projectName;
        this.reviewContext = {};
    }

    async reviewPullRequest(pullRequestId, repositoryId) {
        console.log('🔍 Starting AI Code Review...');
        
        try {
            // Get PR details and changes
            const prData = await this.getPullRequestData(pullRequestId, repositoryId);
            const diffData = await this.getPullRequestDiff(pullRequestId, repositoryId);
            
            // Perform multiple types of analysis in parallel
            const [
                codeReview,
                securityAnalysis,
                performanceAnalysis,
                testCoverage,
                breakingChanges
            ] = await Promise.all([
                this.analyzeCodeQuality(diffData, prData),
                this.analyzeSecurityIssues(diffData),
                this.analyzePerformance(diffData),
                this.analyzeTestCoverage(diffData),
                this.detectBreakingChanges(diffData, prData)
            ]);
            
            // Generate comprehensive review
            const review = this.consolidateReview({
                codeReview,
                securityAnalysis,
                performanceAnalysis,
                testCoverage,
                breakingChanges,
                prData
            });
            
            // Add comments to PR
            await this.addReviewComments(pullRequestId, repositoryId, review);
            
            // Set PR labels based on findings
            await this.setPullRequestLabels(pullRequestId, review);
            
            // Save context for later release
            await this.saveReleaseContext(pullRequestId, review);
            
            // Generate summary
            const summary = this.generateReviewSummary(review);
            
            console.log('✅ Code Review Complete!');
            return summary;
            
        } catch (error) {
            console.error('❌ Code review failed:', error);
            throw error;
        }
    }

    async getPullRequestData(pullRequestId, repositoryId) {
        const url = `${this.orgUrl}/${this.projectName}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=7.0`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.azureDevOpsToken}`).toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    }

    async getPullRequestDiff(pullRequestId, repositoryId) {
        const url = `${this.orgUrl}/${this.projectName}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations?api-version=7.0`;
        
        const iterationsResponse = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.azureDevOpsToken}`).toString('base64')}`
            }
        });
        
        const latestIteration = iterationsResponse.data.value[iterationsResponse.data.value.length - 1];
        
        // Get changes for latest iteration
        const changesUrl = `${this.orgUrl}/${this.projectName}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/iterations/${latestIteration.id}/changes?api-version=7.0`;
        
        const changesResponse = await axios.get(changesUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.azureDevOpsToken}`).toString('base64')}`
            }
        });
        
        // Get actual file contents for each change
        const fileChanges = [];
        for (const change of changesResponse.data.changeEntries) {
            if (change.item.gitObjectType === 'blob') {
                const content = await this.getFileContent(repositoryId, change.item.objectId);
                fileChanges.push({
                    path: change.item.path,
                    changeType: change.changeType,
                    content: content,
                    originalContent: change.originalObjectId ? 
                        await this.getFileContent(repositoryId, change.originalObjectId) : null
                });
            }
        }
        
        return fileChanges;
    }

    async getFileContent(repositoryId, objectId) {
        const url = `${this.orgUrl}/${this.projectName}/_apis/git/repositories/${repositoryId}/blobs/${objectId}?api-version=7.0`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`:${this.azureDevOpsToken}`).toString('base64')}`
            }
        });
        
        return response.data;
    }

    async analyzeCodeQuality(diffData, prData) {
        const prompt = `As an expert code reviewer, analyze this pull request for code quality.
        
PR Title: ${prData.title}
PR Description: ${prData.description || 'No description provided'}

Changed Files:
${diffData.map(f => `- ${f.path} (${f.changeType})`).join('\n')}

Code Changes:
${this.formatCodeChanges(diffData)}

Review for:
1. Code clarity and readability
2. Proper error handling
3. Code duplication
4. Naming conventions
5. Best practices
6. Potential bugs
7. Edge cases not handled

Provide specific, actionable feedback with line numbers where applicable.
Format as JSON with structure:
{
  "issues": [
    {
      "severity": "high|medium|low",
      "file": "path/to/file",
      "line": 123,
      "issue": "Description",
      "suggestion": "How to fix"
    }
  ],
  "positives": ["Good practices observed"],
  "overall": "Summary of code quality"
}`;

        const response = await this.callOpenAI(prompt);
        return JSON.parse(response);
    }

    async analyzeSecurityIssues(diffData) {
        const prompt = `As a security expert, analyze this code for security vulnerabilities.

Code Changes:
${this.formatCodeChanges(diffData)}

Check for:
1. SQL Injection vulnerabilities
2. XSS (Cross-Site Scripting) risks
3. Authentication/Authorization issues
4. Hardcoded secrets or API keys
5. Insecure data handling
6. Path traversal vulnerabilities
7. Injection attacks (command, LDAP, etc.)
8. Insecure dependencies
9. Cryptographic weaknesses
10. CORS misconfigurations

Provide specific vulnerabilities found.
Format as JSON:
{
  "vulnerabilities": [
    {
      "severity": "critical|high|medium|low",
      "type": "Vulnerability type",
      "file": "path/to/file",
      "line": 123,
      "description": "What's vulnerable",
      "fix": "How to fix",
      "cwe": "CWE-ID if applicable"
    }
  ],
  "securityScore": 1-10,
  "requiresSecurityReview": true|false
}`;

        const response = await this.callOpenAI(prompt);
        return JSON.parse(response);
    }

    async analyzePerformance(diffData) {
        const prompt = `As a performance expert, analyze this code for performance issues.

Code Changes:
${this.formatCodeChanges(diffData)}

Check for:
1. N+1 query problems
2. Inefficient algorithms (O(n²) or worse)
3. Memory leaks
4. Unnecessary database calls
5. Missing caching opportunities
6. Synchronous operations that should be async
7. Large data structures in memory
8. Inefficient loops
9. Resource cleanup issues
10. API call optimization opportunities

Format as JSON:
{
  "performanceIssues": [
    {
      "severity": "high|medium|low",
      "file": "path/to/file",
      "line": 123,
      "issue": "Performance problem",
      "impact": "Expected impact",
      "solution": "How to optimize"
    }
  ],
  "estimatedImpact": "Description of overall performance impact"
}`;

        const response = await this.callOpenAI(prompt);
        return JSON.parse(response);
    }

    async analyzeTestCoverage(diffData) {
        const prompt = `Analyze if this code has adequate test coverage.

Code Changes:
${this.formatCodeChanges(diffData)}

Identify:
1. New functions/methods without tests
2. Complex logic needing test coverage
3. Edge cases that should be tested
4. Integration points needing tests
5. Error scenarios not covered

Suggest specific test cases needed.

Format as JSON:
{
  "missingTests": [
    {
      "file": "path/to/file",
      "function": "functionName",
      "testCases": ["Test case 1", "Test case 2"],
      "priority": "high|medium|low"
    }
  ],
  "testCoverageEstimate": "percentage",
  "criticalGaps": ["Description of critical untested code"]
}`;

        const response = await this.callOpenAI(prompt);
        return JSON.parse(response);
    }

    async detectBreakingChanges(diffData, prData) {
        const prompt = `Analyze this PR for breaking changes that would require a major version bump.

PR Title: ${prData.title}
Changes:
${this.formatCodeChanges(diffData)}

Identify:
1. API signature changes
2. Removed public methods/functions
3. Changed return types
4. Modified database schemas
5. Changed configuration formats
6. Removed features
7. Changed behavior of existing features
8. Dependency major version updates

Format as JSON:
{
  "breakingChanges": [
    {
      "type": "API|Schema|Behavior|Dependency",
      "description": "What changed",
      "impact": "Who/what is affected",
      "migrationPath": "How to migrate"
    }
  ],
  "versionBumpRequired": "major|minor|patch",
  "requiresReleaseNotes": true|false,
  "deploymentStrategy": "standard|blue-green|canary",
  "rollbackRisk": "high|medium|low"
}`;

        const response = await this.callOpenAI(prompt);
        return JSON.parse(response);
    }

    formatCodeChanges(diffData) {
        // Format code changes for AI analysis
        const maxLength = 10000; // Limit to avoid token limits
        let formatted = '';
        
        for (const file of diffData) {
            formatted += `\n=== File: ${file.path} ===\n`;
            formatted += `Change Type: ${file.changeType}\n`;
            
            if (file.content) {
                formatted += '--- New Content ---\n';
                formatted += file.content.substring(0, 2000);
                if (file.content.length > 2000) formatted += '\n... (truncated)';
            }
            
            if (file.originalContent) {
                formatted += '\n--- Original Content ---\n';
                formatted += file.originalContent.substring(0, 2000);
                if (file.originalContent.length > 2000) formatted += '\n... (truncated)';
            }
            
            if (formatted.length > maxLength) break;
        }
        
        return formatted;
    }

    async callOpenAI(prompt) {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4-turbo-preview',
                messages: [{
                    role: 'system',
                    content: 'You are an expert code reviewer with deep knowledge of security, performance, and best practices.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.choices[0].message.content;
    }

    consolidateReview(analyses) {
        return {
            codeQuality: analyses.codeReview,
            security: analyses.securityAnalysis,
            performance: analyses.performanceAnalysis,
            testing: analyses.testCoverage,
            breaking: analyses.breakingChanges,
            metadata: {
                prTitle: analyses.prData.title,
                prId: analyses.prData.pullRequestId,
                author: analyses.prData.createdBy.displayName,
                reviewedAt: new Date().toISOString()
            },
            score: this.calculateOverallScore(analyses),
            recommendation: this.getRecommendation(analyses)
        };
    }

    calculateOverallScore(analyses) {
        let score = 100;
        
        // Deduct for issues
        const codeIssues = analyses.codeReview.issues || [];
        const securityIssues = analyses.securityAnalysis.vulnerabilities || [];
        const performanceIssues = analyses.performanceAnalysis.performanceIssues || [];
        
        // Severity weights
        const weights = {
            critical: 25,
            high: 15,
            medium: 5,
            low: 2
        };
        
        [...codeIssues, ...securityIssues, ...performanceIssues].forEach(issue => {
            score -= weights[issue.severity] || 0;
        });
        
        // Cap at 0
        return Math.max(0, Math.min(100, score));
    }

    getRecommendation(analyses) {
        const hasCritical = analyses.securityAnalysis.vulnerabilities?.some(v => v.severity === 'critical');
        const hasBreaking = analyses.breakingChanges.breakingChanges?.length > 0;
        const score = this.calculateOverallScore(analyses);
        
        if (hasC) {
            return {
                action: 'BLOCK',
                reason: 'Critical security vulnerabilities found',
                requiresReview: true
            };
        }
        
        if (score < 60) {
            return {
                action: 'REQUEST_CHANGES',
                reason: 'Multiple issues need to be addressed',
                requiresReview: true
            };
        }
        
        if (hasBreaking) {
            return {
                action: 'APPROVE_WITH_NOTES',
                reason: 'Breaking changes detected - requires major version bump',
                requiresReview: false
            };
        }
        
        if (score >= 80) {
            return {
                action: 'APPROVE',
                reason: 'Code meets quality standards',
                requiresReview: false
            };
        }
        
        return {
            action: 'COMMENT',
            reason: 'Some improvements suggested',
            requiresReview: false
        };
    }

    async addReviewComments(pullRequestId, repositoryId, review) {
        const threads = [];
        
        // Add code quality comments
        for (const issue of review.codeQuality.issues || []) {
            threads.push({
                comments: [{
                    content: `**${issue.severity.toUpperCase()}: ${issue.issue}**\n\n${issue.suggestion}`,
                    commentType: 1
                }],
                status: 1,
                threadContext: {
                    filePath: issue.file,
                    rightFileStart: { line: issue.line, offset: 1 },
                    rightFileEnd: { line: issue.line, offset: 1 }
                }
            });
        }
        
        // Add security comments
        for (const vuln of review.security.vulnerabilities || []) {
            threads.push({
                comments: [{
                    content: `🔒 **SECURITY ${vuln.severity.toUpperCase()}: ${vuln.type}**\n\n${vuln.description}\n\n**Fix:** ${vuln.fix}\n\n${vuln.cwe ? `Reference: ${vuln.cwe}` : ''}`,
                    commentType: 1
                }],
                status: 1,
                threadContext: {
                    filePath: vuln.file,
                    rightFileStart: { line: vuln.line, offset: 1 },
                    rightFileEnd: { line: vuln.line, offset: 1 }
                }
            });
        }
        
        // Add overall review comment
        const overallComment = this.generateOverallComment(review);
        threads.push({
            comments: [{
                content: overallComment,
                commentType: 1
            }],
            status: 1
        });
        
        // Post threads to PR
        for (const thread of threads) {
            await this.createPRThread(pullRequestId, repositoryId, thread);
        }
    }

    async createPRThread(pullRequestId, repositoryId, thread) {
        const url = `${this.orgUrl}/${this.projectName}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads?api-version=7.0`;
        
        try {
            await axios.post(url, thread, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`:${this.azureDevOpsToken}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Failed to create PR thread:', error.response?.data || error.message);
        }
    }

    generateOverallComment(review) {
        const emoji = review.score >= 80 ? '✅' : review.score >= 60 ? '⚠️' : '❌';
        
        let comment = `# ${emoji} ReleasePilot AI Code Review\n\n`;
        comment += `**Overall Score:** ${review.score}/100\n\n`;
        
        // Summary sections
        comment += `## 📊 Review Summary\n\n`;
        comment += `- **Code Quality:** ${review.codeQuality.issues?.length || 0} issues found\n`;
        comment += `- **Security:** ${review.security.vulnerabilities?.length || 0} vulnerabilities\n`;
        comment += `- **Performance:** ${review.performance.performanceIssues?.length || 0} concerns\n`;
        comment += `- **Test Coverage:** ${review.testing.testCoverageEstimate || 'Unknown'}\n`;
        comment += `- **Breaking Changes:** ${review.breaking.breakingChanges?.length || 0} detected\n\n`;
        
        // Recommendation
        comment += `## 🎯 Recommendation\n\n`;
        comment += `**${review.recommendation.action}**: ${review.recommendation.reason}\n\n`;
        
        // Version bump suggestion
        if (review.breaking.versionBumpRequired) {
            comment += `## 📦 Version Bump Required\n\n`;
            comment += `Suggested version bump: **${review.breaking.versionBumpRequired}**\n`;
            comment += `Deployment strategy: **${review.breaking.deploymentStrategy}**\n\n`;
        }
        
        // Critical issues
        const criticals = review.security.vulnerabilities?.filter(v => v.severity === 'critical') || [];
        if (criticals.length > 0) {
            comment += `## 🚨 Critical Security Issues\n\n`;
            criticals.forEach(vuln => {
                comment += `- **${vuln.type}** in ${vuln.file}: ${vuln.description}\n`;
            });
            comment += '\n';
        }
        
        // Positives
        if (review.codeQuality.positives?.length > 0) {
            comment += `## 👍 Good Practices Observed\n\n`;
            review.codeQuality.positives.forEach(positive => {
                comment += `- ${positive}\n`;
            });
            comment += '\n';
        }
        
        // Testing suggestions
        if (review.testing.criticalGaps?.length > 0) {
            comment += `## 🧪 Critical Test Gaps\n\n`;
            review.testing.criticalGaps.forEach(gap => {
                comment += `- ${gap}\n`;
            });
            comment += '\n';
        }
        
        comment += `---\n`;
        comment += `*Review generated by [ReleasePilot](https://releasepilot.net) AI on ${new Date().toLocaleString()}*`;
        
        return comment;
    }

    async setPullRequestLabels(pullRequestId, review) {
        const labels = [];
        
        // Add labels based on findings
        if (review.security.vulnerabilities?.some(v => v.severity === 'critical')) {
            labels.push('security-critical');
        }
        if (review.breaking.breakingChanges?.length > 0) {
            labels.push('breaking-change');
        }
        if (review.testing.criticalGaps?.length > 0) {
            labels.push('needs-tests');
        }
        if (review.performance.performanceIssues?.some(p => p.severity === 'high')) {
            labels.push('performance-issue');
        }
        if (review.score >= 80) {
            labels.push('ready-to-merge');
        }
        
        // Version label
        labels.push(`version-${review.breaking.versionBumpRequired}`);
        
        // Add labels to PR (Azure DevOps uses tags for PRs)
        for (const label of labels) {
            await this.addPRTag(pullRequestId, label);
        }
    }

    async addPRTag(pullRequestId, tag) {
        // Azure DevOps PR tagging implementation
        console.log(`Adding tag: ${tag} to PR #${pullRequestId}`);
        // Note: Azure DevOps doesn't have native PR labels like GitHub
        // We can add them as comments or use work item tags
    }

    async saveReleaseContext(pullRequestId, review) {
        // Save review context for later use during release
        const context = {
            pullRequestId,
            reviewDate: new Date().toISOString(),
            versionBump: review.breaking.versionBumpRequired,
            deploymentStrategy: review.breaking.deploymentStrategy,
            breakingChanges: review.breaking.breakingChanges,
            securityScore: review.security.securityScore,
            overallScore: review.score,
            releaseNotes: this.generateReleaseNotesFromReview(review)
        };
        
        // Save to file or Azure DevOps variable
        const contextFile = `.releasepilot/pr-${pullRequestId}-context.json`;
        tl.writeFile(contextFile, JSON.stringify(context, null, 2));
        
        // Also set as pipeline variable for immediate use
        tl.setVariable(`ReleasePilot.PR.${pullRequestId}.Context`, JSON.stringify(context));
        
        return context;
    }

    generateReleaseNotesFromReview(review) {
        let notes = '';
        
        if (review.breaking.breakingChanges?.length > 0) {
            notes += '### ⚠️ Breaking Changes\n\n';
            review.breaking.breakingChanges.forEach(change => {
                notes += `- **${change.type}**: ${change.description}\n`;
                notes += `  - Impact: ${change.impact}\n`;
                notes += `  - Migration: ${change.migrationPath}\n\n`;
            });
        }
        
        if (review.security.vulnerabilities?.filter(v => v.severity === 'high' || v.severity === 'critical').length > 0) {
            notes += '### 🔒 Security Fixes\n\n';
            review.security.vulnerabilities
                .filter(v => v.severity === 'high' || v.severity === 'critical')
                .forEach(vuln => {
                    notes += `- Fixed ${vuln.severity} severity ${vuln.type}\n`;
                });
            notes += '\n';
        }
        
        if (review.performance.performanceIssues?.filter(p => p.severity === 'high').length > 0) {
            notes += '### ⚡ Performance Improvements\n\n';
            review.performance.performanceIssues
                .filter(p => p.severity === 'high')
                .forEach(perf => {
                    notes += `- ${perf.solution}\n`;
                });
            notes += '\n';
        }
        
        return notes;
    }

    generateReviewSummary(review) {
        return {
            score: review.score,
            recommendation: review.recommendation.action,
            issues: {
                critical: this.countBySeverity(review, 'critical'),
                high: this.countBySeverity(review, 'high'),
                medium: this.countBySeverity(review, 'medium'),
                low: this.countBySeverity(review, 'low')
            },
            versionBump: review.breaking.versionBumpRequired,
            deploymentStrategy: review.breaking.deploymentStrategy,
            requiresSecurityReview: review.security.requiresSecurityReview,
            testCoverage: review.testing.testCoverageEstimate
        };
    }

    countBySeverity(review, severity) {
        let count = 0;
        count += (review.codeQuality.issues?.filter(i => i.severity === severity) || []).length;
        count += (review.security.vulnerabilities?.filter(v => v.severity === severity) || []).length;
        count += (review.performance.performanceIssues?.filter(p => p.severity === severity) || []).length;
        return count;
    }
}

module.exports = CodeReviewer;