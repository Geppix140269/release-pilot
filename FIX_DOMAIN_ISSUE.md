# URGENT: Fix Domain Configuration

## The Problem
- ✅ **release-pilot.netlify.app** works perfectly on mobile and desktop
- ❌ **releasepilot.net** doesn't load at all (SSL/DNS issue)

## Solution Steps

### 1. Check Netlify Domain Settings
1. Go to https://app.netlify.com
2. Select your "release-pilot" site
3. Go to "Domain settings"
4. Check if releasepilot.net shows any errors

### 2. Likely Issues & Fixes

#### Option A: Domain Not Verified
- Click "Verify DNS configuration" in Netlify
- Make sure the domain status is "Netlify DNS" or "External DNS"

#### Option B: DNS Records Wrong
If using external DNS (like Namecheap, GoDaddy), you need:
```
Type: A Record
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: release-pilot.netlify.app
```

#### Option C: SSL Certificate Issue
- In Netlify > Domain settings > HTTPS
- Click "Renew certificate" or "Provision certificate"
- Wait 5-10 minutes for it to propagate

### 3. Quick Temporary Fix
For now, just use the working Netlify subdomain:
- Share this link: **https://release-pilot.netlify.app**
- It works perfectly on mobile and desktop

### 4. To Make index-simple.html the Main Page
In netlify.toml, add:
```toml
[[redirects]]
  from = "/"
  to = "/index-simple.html"
  status = 200
```

## Test Links
- Working: https://release-pilot.netlify.app
- Working: https://release-pilot.netlify.app/index-simple.html
- Working: https://release-pilot.netlify.app/index-mobile-fix.html
- Not Working: https://releasepilot.net (DNS/SSL issue)

## Next Steps
1. Fix DNS in Netlify dashboard
2. Wait for SSL certificate to provision (can take up to 24 hours)
3. Use release-pilot.netlify.app for now

The site is WORKING - just the custom domain needs fixing in Netlify!