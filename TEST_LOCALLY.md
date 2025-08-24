# 🧪 Testing ReleasePilot Locally

## Quick Start Test (5 minutes)

### 1. Create a Test Repository

```bash
# Create a new test repo
mkdir test-releasepilot
cd test-releasepilot
git init

# Create package.json
cat > package.json << 'EOF'
{
  "name": "test-app",
  "version": "1.0.0",
  "description": "Test app for ReleasePilot"
}
EOF

# Create initial CHANGELOG
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
EOF

# Initial commit
git add .
git commit -m "chore: initial commit"
```

### 2. Add ReleasePilot GitHub Action

Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main]
    tags: ['v*.*.*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: ReleasePilot
        uses: ./  # For local testing, or use your-org/release-pilot@v1
        with:
          mode: auto
          github_token: ${{ secrets.GITHUB_TOKEN }}
        env:
          # Optional: Add for AI summaries
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### 3. Test Scenarios

## Scenario A: Test PR Summary Generation

```bash
# Create a feature branch
git checkout -b feature/add-login

# Make some conventional commits
echo "function login() {}" > auth.js
git add auth.js
git commit -m "feat: add user login functionality"

echo "function logout() {}" >> auth.js
git add auth.js
git commit -m "feat: add logout functionality"

echo "// fix" >> auth.js
git add auth.js
git commit -m "fix: resolve session timeout issue"

# Push and create PR
git push origin feature/add-login
# Go to GitHub and create a Pull Request
```

**Expected Result:**
- PR description auto-updates with:
  - ✨ Features section listing both features
  - 🐛 Bug Fixes section with the fix
  - ✅ Checklist items

## Scenario B: Test Version Bump & Changelog

```bash
# On main branch, make commits
git checkout main

# Feature commit (triggers minor bump: 1.0.0 → 1.1.0)
echo "export function feature() {}" > feature.js
git add feature.js
git commit -m "feat: add new feature"

git push origin main
```

**Expected Result:**
- `package.json` version bumped to `1.1.0`
- `CHANGELOG.md` updated with new version section
- Git tag `v1.1.0` created
- Commit created: "chore(release): bump version to 1.1.0 [skip ci]"

## Scenario C: Test Breaking Change (Major Bump)

```bash
# Breaking change commit (triggers major bump: 1.1.0 → 2.0.0)
echo "// breaking" > api.js
git add api.js
git commit -m "feat!: redesign API

BREAKING CHANGE: API endpoints have changed"

git push origin main
```

**Expected Result:**
- Version bumped to `2.0.0`
- CHANGELOG shows "BREAKING CHANGES" section
- Tag `v2.0.0` created

## Scenario D: Test Release Creation

```bash
# Push a tag to trigger release
git tag v2.0.0
git push origin v2.0.0
```

**Expected Result:**
- GitHub Release created with:
  - Title: "v2.0.0"
  - Auto-generated release notes
  - List of all changes since last release

## Local Testing Without GitHub

### Test the Core Logic Directly

```bash
# Install dependencies
cd C:\Development\release-pilot-clean
npm install

# Create test script
cat > test-local.js << 'EOF'
const { parseCommit } = require('./dist/src/pr');
const { determineReleaseType } = require('./dist/src/semver');

// Test commit parsing
const commit1 = parseCommit('feat: add new feature', 'abc123');
console.log('Parsed commit:', commit1);

// Test version bump logic
const commits = [
  { type: 'feat', scope: null, subject: 'add feature', breaking: false },
  { type: 'fix', scope: 'api', subject: 'fix bug', breaking: false }
];

const releaseType = determineReleaseType(commits);
console.log('Release type:', releaseType); // Should be 'minor'

// Test with breaking change
const breakingCommits = [
  { type: 'feat', scope: null, subject: 'add feature', breaking: true }
];

const breakingType = determineReleaseType(breakingCommits);
console.log('Breaking release type:', breakingType); // Should be 'major'
EOF

node test-local.js
```

## Test with Real GitHub Repository

### Full Integration Test

1. **Fork a real repository** or use an existing one
2. **Add the workflow file** from above
3. **Create conventional commits:**

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Add ReleasePilot workflow
mkdir -p .github/workflows
# Copy the workflow file from above

# Make test commits
git checkout -b test-releasepilot
echo "test" > test.txt
git add .
git commit -m "feat: add test feature"
git push origin test-releasepilot

# Create PR on GitHub - watch ReleasePilot update it!
```

## Verify Each Component

### 1. PR Summary Works
- Create PR with conventional commits
- Check if PR description updates automatically

### 2. Version Bump Works
- Merge PR to main
- Check if package.json version increases
- Check if CHANGELOG.md updates

### 3. Release Creation Works
- Push a tag
- Check if GitHub Release appears

### 4. Notifications Work (Optional)
- Add Slack webhook to workflow
- Check if notifications arrive

## Debug Mode

Add debug output to see what's happening:

```yaml
- name: ReleasePilot
  uses: ./
  with:
    mode: auto
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    ACTIONS_STEP_DEBUG: true  # Enable debug logging
```

## Common Test Commands

```bash
# Run unit tests
npm test

# Check what version would be bumped to
node -e "
const { bumpVersion } = require('./dist/src/semver');
console.log(bumpVersion('1.0.0', 'minor'));  // 1.1.0
"

# Test changelog generation
node -e "
const { generateChangelogEntry } = require('./dist/src/changelog');
const commits = [
  {type: 'feat', subject: 'new feature'},
  {type: 'fix', subject: 'bug fix'}
];
console.log(generateChangelogEntry('1.2.0', commits, {}));
"
```

## Testing License Validation (Private Repos)

```bash
# Set a test license (use 'TEST-1234-5678-9012-3456' for dry run)
export RELEASEPILOT_LICENSE="TEST-1234-5678-9012-3456"

# The action will run in dry-run mode and show what it would do
```

## Expected Outputs

After testing, you should see:

1. **In GitHub Actions logs:**
   ```
   🚀 ReleasePilot starting...
   Loaded configuration for project: test-app
   Operating in merge mode
   Bumping version from 1.0.0 to 1.1.0
   Updated package.json to version 1.1.0
   Updated CHANGELOG.md
   ✅ ReleasePilot completed successfully
   ```

2. **In your repository:**
   - Updated `package.json` with new version
   - Updated `CHANGELOG.md` with formatted entries
   - New git tag (v1.1.0)
   - GitHub Release with notes

3. **On Pull Requests:**
   - Auto-generated summary section
   - Checklist for reviewers
   - Grouped commits by type

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not a git repository" | Run `git init` first |
| "No conventional commits found" | Use format: `type: description` |
| "GitHub token required" | Add `GITHUB_TOKEN` to workflow |
| "License validation failed" | Normal for private repos without license |

---

**Ready to test?** Start with Scenario A above - it takes just 5 minutes!