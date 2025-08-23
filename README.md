# ReleasePilot 🚀

> Generate PR summaries, bump semver, update CHANGELOG, and publish release notes - all automated!

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-ReleasePilot-blue?logo=github)](https://github.com/marketplace/actions/releasepilot)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

- **📝 PR Summary Generation** - Automatically generate PR descriptions with AI-powered summaries
- **🔢 Semantic Versioning** - Auto-bump versions based on conventional commits
- **📋 Changelog Management** - Keep CHANGELOG.md updated with every release
- **🎯 Release Notes** - Create comprehensive GitHub releases
- **🔔 Notifications** - Send updates to Slack/Teams webhooks
- **🔐 Organization Licensing** - Free for public repos, licensed for private

## Quick Start

```yaml
name: ReleasePilot
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
      
      - uses: your-org/release-pilot@v1
        with:
          slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
        env:
          RELEASEPILOT_LICENSE: ${{ secrets.RELEASEPILOT_LICENSE }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Configuration

Create `.releasepilot.yml` in your repository root:

```yaml
project_name: MyApp
release_sections:
  - feat
  - fix
  - perf
  - refactor
excluded_scopes: [ci, chore]
pr_checklist:
  - "Tests added/updated"
  - "Docs updated"
  - "Security review (if touching auth)"
version_file: package.json
ai_provider: openai # or anthropic
```

## Workflow Modes

ReleasePilot operates in three modes, automatically detected based on the GitHub event:

### 1. Pull Request Mode

When a PR is opened or updated:
- Parses all commits in the PR
- Generates an AI-powered summary
- Adds a checklist for reviewers
- Updates PR description (idempotent)

### 2. Merge Mode

When commits are pushed to the default branch:
- Determines version bump (major/minor/patch)
- Updates version file (package.json, pyproject.toml, Cargo.toml)
- Updates CHANGELOG.md with compare links
- Creates a git tag
- Commits changes back to the repository

### 3. Tag Mode

When a version tag is pushed:
- Creates a GitHub Release
- Generates comprehensive release notes
- Sends notifications to configured channels

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `mode` | Operation mode: `pr\|merge\|tag\|auto` | `auto` |
| `release_type` | Release type: `auto\|patch\|minor\|major` | `auto` |
| `changelog_path` | Path to CHANGELOG.md | `CHANGELOG.md` |
| `slack_webhook` | Slack webhook URL | - |
| `teams_webhook` | Teams webhook URL | - |
| `fail_on_missing_conventional_commits` | Fail if no conventional commits | `false` |
| `openai_api_key` | OpenAI API key for summaries | - |
| `anthropic_api_key` | Anthropic API key for summaries | - |
| `github_token` | GitHub token | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | The new version number |
| `changelog` | The generated changelog entry |
| `pr_body` | The generated PR body |
| `release_notes` | The generated release notes |

## Conventional Commits

ReleasePilot uses [Conventional Commits](https://www.conventionalcommits.org/) to determine version bumps:

- `feat:` → Minor version bump (1.2.0 → 1.3.0)
- `fix:` → Patch version bump (1.2.0 → 1.2.1)
- `BREAKING CHANGE:` → Major version bump (1.2.0 → 2.0.0)

Example commits:
```
feat: add user authentication
fix(api): resolve timeout issue
feat!: redesign API (BREAKING CHANGE)
```

## Version File Support

ReleasePilot supports multiple version file formats:

- **package.json** - Node.js projects
- **pyproject.toml** - Python projects
- **Cargo.toml** - Rust projects
- ***.yaml/yml** - Generic YAML files with version field

## AI-Powered Summaries

Configure AI providers for intelligent PR and release summaries:

### OpenAI
```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Anthropic
```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Notifications

### Slack Integration
```yaml
with:
  slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
```

### Microsoft Teams Integration
```yaml
with:
  teams_webhook: ${{ secrets.TEAMS_WEBHOOK }}
```

## Licensing

ReleasePilot is **free for public repositories**. Private repositories require a license.

### Purchase a License

Visit [releasepilot.io](https://releasepilot.io) to purchase an organization license.

### Configure License

Add your license key as a repository or organization secret:

```yaml
env:
  RELEASEPILOT_LICENSE: ${{ secrets.RELEASEPILOT_LICENSE }}
```

### Dry-Run Mode

Without a valid license, ReleasePilot runs in dry-run mode for private repos:
- Generates all outputs
- Posts comments showing what would be done
- Makes no actual changes to your repository

## Examples

### Basic Setup
```yaml
- uses: your-org/release-pilot@v1
```

### With All Features
```yaml
- uses: your-org/release-pilot@v1
  with:
    release_type: auto
    changelog_path: CHANGELOG.md
    slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
    teams_webhook: ${{ secrets.TEAMS_WEBHOOK }}
  env:
    RELEASEPILOT_LICENSE: ${{ secrets.RELEASEPILOT_LICENSE }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Manual Version Control
```yaml
- uses: your-org/release-pilot@v1
  with:
    mode: merge
    release_type: minor # Force minor version bump
```

## Advanced Configuration

### Custom Release Template

In `.releasepilot.yml`:
```yaml
custom_release_template: |
  ## What's Changed
  
  {{changes}}
  
  **Full Changelog**: {{compare_url}}
  
  ### Contributors
  {{contributors}}
```

### Excluding Scopes
```yaml
excluded_scopes: [ci, chore, deps, docs]
```

### Custom PR Checklist
```yaml
pr_checklist:
  - "Unit tests pass"
  - "Integration tests pass"
  - "Documentation updated"
  - "Breaking changes documented"
  - "Performance impact assessed"
```

## Troubleshooting

### No Changes Detected

Ensure you're using conventional commits:
```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
```

### License Issues

For private repositories:
1. Purchase a license at [releasepilot.io](https://releasepilot.io)
2. Add `RELEASEPILOT_LICENSE` to secrets
3. Ensure the secret is available to the workflow

### Version File Not Found

Specify the correct path in `.releasepilot.yml`:
```yaml
version_file: src/version.json
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

## Support

- 📧 Email: support@releasepilot.io
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/release-pilot/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/release-pilot/discussions)

## License

MIT © ReleasePilot

---

Made with ❤️ by the ReleasePilot team