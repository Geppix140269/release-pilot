# ReleasePilot - The "Idiot Proof" Guide
*So simple, your manager could set it up*

## 🤷 What Is This Thing?

**Imagine you have a robot that:**
1. Watches what code you change
2. Writes a summary of what you did
3. Tells everyone about the update
4. Gives your update a number (like v2.0)

That's ReleasePilot. It's a robot that writes your release notes.

---

## 🎯 Do I Need This?

### Answer These Questions:

**Question 1:** Do you use GitHub or Azure DevOps?
- ✅ Yes → Continue
- ❌ No → Stop. This won't work for you.

**Question 2:** Do you currently write release notes?
- ✅ Yes → Continue  
- ❌ No → Stop. You don't need this.

**Question 3:** Is writing release notes annoying?
- ✅ Yes → You need ReleasePilot
- ❌ No → You're lying or you're weird

---

## 🚀 The 5-Minute Setup

### Step 1: Get Your AI Password (OpenAI Key)

1. **Go to this website:** https://platform.openai.com
2. **Click:** "Sign Up" (green button)
3. **Enter:** Your email
4. **Pay:** $5 (minimum, lasts months)
5. **Click:** "API Keys" → "Create New Secret Key"
6. **Copy the key** (looks like: sk-abc123xyz...)
7. **SAVE IT SOMEWHERE** (you can't see it again!)

*Think of this like Netflix - you need an account to use it*

### Step 2: Install ReleasePilot

#### If Using GitHub:

1. **Create file:** `.github/workflows/release.yml`
2. **Copy this exactly:**

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: Geppix140269/release-pilot@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

3. **Add your OpenAI key:**
   - Go to Settings → Secrets → Actions
   - Click "New repository secret"
   - Name: `OPENAI_API_KEY`
   - Value: (paste your key from Step 1)
   - Click "Add secret"

#### If Using Azure DevOps:

1. **Install from Marketplace:**
   - Go to: https://marketplace.visualstudio.com/items?itemName=ReleasePilot
   - Click: "Get it free"
   - Select: Your organization
   - Click: "Install"

2. **Add to your pipeline:**

```yaml
- task: ReleasePilot@1
  inputs:
    openaiApiKey: $(OPENAI_API_KEY)
```

3. **Add your OpenAI key:**
   - Go to: Pipelines → Library
   - Click: "+ Variable group"
   - Name: "ReleasePilot"
   - Add variable: `OPENAI_API_KEY` = your key
   - Save

### Step 3: Make It Work

**Write commits like this:**
- `fix: login button not working`
- `feat: add dark mode`
- `docs: update readme`

**NOT like this:**
- `asdfasdf`
- `stuff`
- `fixed thing`

### Step 4: See The Magic

1. Push your code
2. Wait 30 seconds
3. Check "Releases" tab
4. 🎉 Your release notes are there!

---

## 📝 Real Examples

### What You Write:
```
git commit -m "fix: users couldn't reset password on mobile"
```

### What ReleasePilot Creates:
```
## Version 1.2.3 - January 26, 2025

### 🐛 Bug Fixes
- Fixed password reset functionality not working on mobile devices
```

### What You Write:
```
git commit -m "feat: add export to PDF feature"
```

### What ReleasePilot Creates:
```
## Version 1.3.0 - January 26, 2025

### ✨ New Features
- Added ability to export documents as PDF files
```

---

## 💰 Pricing Explained Simply

### Free Forever Option:
**DON'T BUY FROM US** - Use these free tools instead:
- `semantic-release` - Free but complex setup
- `release-please` - Google's free tool
- Do it manually - Your time is free(?)

### Our Paid Options:

#### Cheap ($19/month) - "ReleasePilot Classic"
- **What it does:** Makes release notes
- **What it doesn't:** No code review, GitHub only
- **Who needs it:** Solo developers

#### Normal ($49/month) - "ReleasePilot Pro"
- **What it does:** Classic + Azure DevOps support
- **What it doesn't:** No code review
- **Who needs it:** Small teams

#### Expensive ($99/month) - "ReleasePilot Teams"
- **What it does:** Everything + AI code review
- **What it doesn't:** Won't make coffee
- **Who needs it:** Teams who want code review

#### Silly ($199/month) - "ReleasePilot Enterprise"
- **What it does:** Same as Teams + we promise not to break
- **What it doesn't:** Nothing extra really
- **Who needs it:** Big companies that need receipts

---

## 🤔 Common Problems & Fixes

### "It's not working!"

**Check these:**
1. Did you add the OpenAI key?
2. Is the key typed correctly?
3. Did you save/commit the workflow file?
4. Are you pushing to the right branch?

### "The release notes are wrong!"

**Fix:**
- Write better commit messages
- The AI is only as smart as what you tell it
- Always review before publishing

### "It costs too much!"

**Reality check:**
- Your time: $50-100/hour
- Time saved: 2 hours/month
- Cost: $49/month
- **You save money if you value your time**

### "Can I try it first?"

**Yes:**
1. Sign up for OpenAI ($5 minimum)
2. Use the free GitHub Action
3. Only pay us if you like it

---

## 🚫 When NOT to Use ReleasePilot

**Don't use if:**
- You release once a year
- You don't write release notes anyway
- Your commits are all "fixed stuff"
- You work offline
- You handle government secrets

---

## 📞 Getting Help

### Best Way (Fast):
1. Check this guide again
2. Google your error message
3. Check our GitHub Issues

### Okay Way (Slower):
1. Email: support@releasepilot.net
2. Wait 24 hours
3. Get response

### Bad Way (Won't Work):
1. Calling us (no phone)
2. Showing up at our office (we work remote)
3. Asking ChatGPT (it doesn't know our product)

---

## 🎓 Advanced Stuff (Optional)

### Make Better Release Notes:

**Good Commits:**
```
feat: add CSV export for user data
fix: prevent SQL injection in search
perf: optimize image loading by 50%
```

**Bad Commits:**
```
update
fixed
changes
work in progress
```

### Customize Output:

```yaml
- uses: Geppix140269/release-pilot@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    style: detailed  # or 'simple'
    include-stats: true
    notify-slack: true
```

---

## ✅ Quick Checklist

Before buying:
- [ ] I use GitHub or Azure DevOps
- [ ] I write release notes regularly
- [ ] I understand this uses AI (not magic)
- [ ] I'm okay with $19-99/month
- [ ] I have 5 minutes to set it up

After setup:
- [ ] OpenAI key added
- [ ] Workflow file created
- [ ] Pushed to correct branch
- [ ] Checked releases tab
- [ ] Celebrated with coffee

---

## 🤝 The Honest Promise

**We promise:**
- It will generate release notes
- It will save you some time
- It will mostly work

**We DON'T promise:**
- Perfect release notes
- To revolutionize your life
- 100% uptime
- That AI won't say something dumb

---

*Still confused? That's okay. Email support@releasepilot.net and we'll help. Or just use the free alternatives - we won't be offended.*