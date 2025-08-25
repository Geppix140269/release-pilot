# ReleasePilot - Honest Technical Documentation
*No marketing BS - Just facts about what it does and doesn't do*

## 🎯 What ReleasePilot ACTUALLY Is

**ReleasePilot** is a GitHub Action and Azure DevOps extension that uses OpenAI's GPT-4 to:
1. Read your commit messages and pull request descriptions
2. Generate human-readable release notes
3. Calculate semantic version numbers
4. Optionally deploy to cloud services

**NEW**: Also provides AI code review for pull requests (Azure DevOps only for now)

## ✅ What It REALLY Does

### Features That Actually Work:
- ✅ Reads commits from GitHub/Azure DevOps via their APIs
- ✅ Sends commit messages to OpenAI GPT-4 to generate summaries
- ✅ Updates version numbers in package.json and VERSION files
- ✅ Creates git tags with generated release notes
- ✅ Can trigger deployments (you still need deployment scripts)
- ✅ Posts notifications to Slack/Teams webhooks
- ✅ Reviews code changes and posts comments on PRs (Azure DevOps)

### What It DOESN'T Do:
- ❌ Does NOT read your actual source code (only commit messages)
- ❌ Does NOT fix bugs or write code for you
- ❌ Does NOT replace human code review completely
- ❌ Does NOT deploy without your existing deployment setup
- ❌ Does NOT work offline (requires OpenAI API)
- ❌ Does NOT guarantee perfect release notes (AI can misunderstand)

## 💰 Real Costs

### What You're Actually Paying For:
1. **Our Service**: $19-199/month depending on tier
2. **OpenAI API**: ~$0.002 per release (you provide your own key)
3. **Your Time Saved**: ~10 hours/month if you do weekly releases

### Honest Time Savings:
- **Before**: Writing release notes manually = 30 minutes per release
- **After**: Reviewing AI-generated notes = 5 minutes per release
- **Actual Savings**: 25 minutes per release × 4 releases = ~100 minutes/month

*Not the "10 hours" we claim in marketing - that assumes you're doing daily releases with complex changelogs*

## 🔧 How to ACTUALLY Use It

### "Idiot Proof" Setup Guide

#### Step 1: Do You Need This?
Ask yourself:
- Do you currently write release notes? (If no, you don't need this)
- Do you use GitHub or Azure DevOps? (If no, this won't work)
- Do you do releases regularly? (If < 1/month, probably not worth it)

#### Step 2: Get OpenAI API Key
1. Go to https://platform.openai.com
2. Sign up (requires credit card)
3. Create API key
4. Add $5 credit (will last ~2500 releases)

#### Step 3: Install ReleasePilot

**For GitHub:**
```yaml
# In .github/workflows/release.yml
- uses: Geppix140269/release-pilot@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

**For Azure DevOps:**
```yaml
# In azure-pipelines.yml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
```

#### Step 4: What Happens
1. You push code with commit message: `fix: user login bug`
2. ReleasePilot reads this
3. Sends to GPT-4: "Summarize: fix: user login bug"
4. GPT-4 returns: "Fixed authentication issue affecting user login"
5. Creates release notes with this text
6. Bumps version from 1.0.0 → 1.0.1
7. Creates git tag v1.0.1

**That's literally it.**

## 📊 Honest Comparison

### ReleasePilot vs Competitors (FACTS ONLY)

| Feature | ReleasePilot | Semantic Release | Release Please | CodeRabbit |
|---------|--------------|------------------|----------------|------------|
| **What it is** | AI release notes | Rule-based versioning | Google's tool | AI code review |
| **AI-powered** | Yes (GPT-4) | No | No | Yes |
| **Price** | $19-199/mo | Free | Free | $30/mo |
| **Setup time** | 2 minutes | 30 minutes | 15 minutes | 5 minutes |
| **Requires config** | Minimal | Extensive | Moderate | Minimal |
| **Code review** | Yes (Azure only) | No | No | Yes |
| **Release notes** | AI-generated | Template-based | Template-based | No |
| **Works with** | GitHub, Azure | GitHub, GitLab | GitHub | GitHub, GitLab |
| **Self-hosted option** | No | Yes | Yes | No |

### When to Use What:

**Use ReleasePilot if:**
- You want AI-generated release notes
- You don't want to configure templates
- You're okay with paying for convenience
- You use Azure DevOps and want code review

**Use Semantic Release if:**
- You want free and open source
- You follow strict conventional commits
- You're okay with complex configuration
- You need full control

**Use CodeRabbit if:**
- You ONLY need code review
- You don't care about releases
- You use GitHub/GitLab

## 🎭 Marketing vs Reality

### What We Say vs What's True:

| Marketing Claim | Reality |
|-----------------|---------|
| "Save 10+ hours/month" | Save 1-2 hours if you do weekly releases |
| "Zero configuration" | You need to add API key and choose settings |
| "AI understands your code" | AI only reads commit messages, not code |
| "Automatic deployments" | Triggers YOUR deployment scripts |
| "95% fewer errors" | No data to support this claim |
| "Enterprise-ready" | It's a simple API wrapper, not enterprise software |

## 💳 Honest Pricing Tiers

### What Each Tier ACTUALLY Gives You:

#### ReleasePilot Classic - $19/month
- Basic release notes generation
- Version bumping
- GitHub only
- **Best for**: Small projects, occasional releases
- **Reality**: This is all most people need

#### ReleasePilot Professional - $49/month
- Everything in Classic
- Azure DevOps support
- Deployment triggers
- **Best for**: Teams doing weekly releases
- **Reality**: Azure support is the main value here

#### ReleasePilot Teams - $99/month
- Everything in Professional
- AI Code Review (Azure DevOps only)
- Priority support (we respond faster)
- **Best for**: Teams wanting code review
- **Reality**: Code review is why you'd pay this

#### ReleasePilot Enterprise - $199/month
- Everything in Teams
- SLA (99.9% uptime promise)
- Custom integration help
- **Best for**: Companies needing guarantees
- **Reality**: Same product, just with promises

## 🚨 Important Limitations

### Things to Know Before Buying:

1. **Requires Internet**: No offline mode
2. **OpenAI Dependency**: If OpenAI is down, we're down
3. **Not Magic**: AI can misunderstand commits
4. **No Source Code Access**: We don't read your actual code
5. **English Only**: Works best with English commit messages
6. **Rate Limits**: OpenAI limits = ~60 releases/minute max
7. **No Guarantees**: AI output quality varies

## 🤔 FAQ - Honest Answers

**Q: Will this replace my release manager?**
A: No. It's a tool to help write release notes faster.

**Q: Is my code safe?**
A: We don't read your code. Only commit messages. OpenAI sees these messages.

**Q: What if AI writes wrong release notes?**
A: You should always review before publishing. AI isn't perfect.

**Q: Can I use my own AI model?**
A: No. We're hardcoded to OpenAI's API currently.

**Q: Is this worth $49/month?**
A: If you spend > 2 hours/month on release notes, probably yes.

**Q: Why not use free alternatives?**
A: Free tools require more setup and don't use AI. We're paying for convenience.

## 📞 Real Support

**What "24/7 Support" Actually Means:**
- Email: We respond within 24 hours (usually faster)
- No phone support
- No real-time chat
- GitHub Issues: Best way to get help
- We're a small team (honestly, it's mostly one person)

## 🎯 Bottom Line

**ReleasePilot is good for:**
- Teams that regularly write release notes
- People who want AI-generated summaries
- Azure DevOps users wanting code review
- Those willing to pay for convenience

**ReleasePilot is NOT for:**
- Projects with < monthly releases
- Teams wanting 100% accuracy
- Offline environments
- High-security environments (uses external AI)

---

*This document contains factual information about ReleasePilot capabilities. Marketing materials may emphasize benefits more strongly. When in doubt, try the free trial first.*