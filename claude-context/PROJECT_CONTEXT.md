# ReleasePilot Project Context

## Project Overview
ReleasePilot is a SaaS GitHub Action product that automates GitHub releases with AI. Recently launched on GitHub Marketplace.

## Current Status
- **Live Site**: https://releasepilot.net
- **GitHub Marketplace**: Published and live
- **Stripe Integration**: Active with promo codes configured
- **Admin Dashboard**: Password-protected at /admin-protected.html (username: admin, password: ReleasePilot2024!)

## Active Issues
### Critical: OG Image Not Displaying
Despite multiple attempts, the Open Graph image is not showing on social media previews.
- Image file: `/og-image.png` (22KB, 1200x630px, JPEG format despite .png extension)
- Meta tags properly configured in index.html
- Multiple deployments completed
- Social media caches cleared multiple times
- **Still not working as of last check**

## Promo Codes (Active in Stripe)
1. **LAUNCH50** - 50% off for 3 months (Launch Week Special)
2. **EARLY30** - 30% off forever (Early Adopter)
3. **FAMILY100** - 100% off forever (Friends & Family)
4. **ANNUAL20** - 20% off (Annual Plan Discount)
5. **STUDENT** - 50% off (Student Discount)
6. **LIFETIME100** - 100% off forever (Lifetime Deal for influencers)

## Key Files Structure
```
/
├── index.html (main landing page with analytics)
├── admin-protected.html (password-protected admin dashboard)
├── admin-real.html (real-time analytics dashboard)
├── analytics.js (visitor tracking system)
├── og-image.png (Open Graph image - NOT WORKING)
├── netlify.toml (deployment configuration)
├── marketing/
│   ├── LAUNCH_ROADMAP.md (30-day launch plan)
│   ├── STRIPE_PROMO_GUIDE.md (promo code setup)
│   ├── GITHUB_SEO_GUIDE.md (1000 stars strategy)
│   ├── SALES_PLAYBOOK.md (sales training)
│   ├── QUICK_REFERENCE.md (sales cheat sheet)
│   ├── EMAIL_TEMPLATES.md (outreach templates)
│   └── PROMO_LINKS_QUICK_REFERENCE.md (payment links)
└── netlify/
    └── functions/ (serverless functions)

```

## Recent Work Completed
1. Created comprehensive launch strategy with 30-day roadmap
2. Built real-time analytics tracking system
3. Implemented password-protected admin dashboard
4. Set up Stripe payment links with promo codes
5. Created marketing materials for non-technical audience
6. Fixed multiple technical issues (payment buttons, mobile access)

## Immediate Priorities
1. **FIX OG IMAGE** - Critical for social media marketing
2. Monitor real analytics data
3. Execute launch marketing plan
4. Track promo code usage in Stripe

## Technical Stack
- **Hosting**: Netlify
- **Payments**: Stripe
- **Analytics**: Custom JavaScript (localStorage-based)
- **Auth**: Basic JavaScript password protection
- **CI/CD**: GitHub Actions

## Important URLs
- Production: https://releasepilot.net
- Admin Dashboard: https://releasepilot.net/admin-protected.html
- GitHub Action: https://github.com/marketplace/actions/releasepilot
- Stripe Dashboard: https://dashboard.stripe.com

## Debug Tools
- Facebook Debugger: https://developers.facebook.com/tools/debug/
- LinkedIn Inspector: https://www.linkedin.com/post-inspector/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

## Notes for Next Session
The OG image issue has been persistent despite:
- Reducing image size to 22KB
- Ensuring correct dimensions (1200x630)
- Adding all required meta tags
- Multiple deployments
- Cache clearing on social platforms

Consider trying:
1. Uploading image to a CDN instead of serving from site
2. Creating a completely new image file
3. Testing with different image format (actual PNG vs JPEG)
4. Checking Netlify response headers for the image

## Contact & Support
- Primary communication: Through GitHub/Claude interface
- Stripe support needed for: Verifying promo codes are active
- Netlify support needed for: Investigating image serving issues