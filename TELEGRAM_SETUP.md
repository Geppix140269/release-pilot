# Telegram Bot Setup - ReleasePilot

## Your Bot Information
- **Bot Username**: @ReleasePilotBot
- **Bot URL**: https://t.me/ReleasePilotBot
- **Bot Token**: `8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM`

⚠️ **IMPORTANT**: Keep this token secure! Anyone with this token can control your bot.

## Step 1: Get Your Chat ID

### Option A: Direct Message (Recommended)
1. Open Telegram and go to: https://t.me/ReleasePilotBot
2. Click "Start" or send `/start`
3. Send any message like "Hello"
4. Open this URL in your browser:
   ```
   https://api.telegram.org/bot8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM/getUpdates
   ```
5. Look for `"chat":{"id":YOUR_CHAT_ID}` in the response
6. Copy your chat ID (it's a number like `123456789`)

### Option B: Group Chat
1. Add @ReleasePilotBot to your group
2. Send a message mentioning the bot: `@ReleasePilotBot hello`
3. Open the getUpdates URL above
4. Find the chat ID (negative number for groups like `-123456789`)

## Step 2: Test Your Setup

Run this command to test (replace YOUR_CHAT_ID):

```bash
curl -X POST https://api.telegram.org/bot8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "YOUR_CHAT_ID",
    "text": "🎉 ReleasePilot Connected! You will receive notifications here.",
    "parse_mode": "HTML"
  }'
```

## Step 3: Add to Netlify Environment Variables

In your Netlify dashboard, add these environment variables:

```
TELEGRAM_BOT_TOKEN=8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE
```

## Step 4: Configure Bot Settings (Optional)

Send these commands to @BotFather to customize your bot:

### Set Description
```
/setdescription
@ReleasePilotBot
ReleasePilot notification bot for license sales and daily traffic reports. Get instant alerts when customers purchase licenses and comprehensive analytics reports.
```

### Set About Text
```
/setabouttext
@ReleasePilotBot
Official ReleasePilot notification system. Provides real-time sales alerts and daily traffic analytics.
```

### Set Commands
```
/setcommands
@ReleasePilotBot
status - Check bot connection status
report - Get current day's traffic report
test - Send test notification
```

## What You'll Receive

### 1. License Sale Notifications
Every time someone purchases a license, you'll get:
```
🎉 NEW LICENSE SALE!

Customer Details:
• Email: customer@example.com
• Name: John Doe
• Country: United States

Purchase Details:
• Plan: Professional
• Amount: $49.00
• Payment: Card
• License: RP-ABC123-DEF4-5678

Timestamp: Jan 24, 2025, 3:45 PM UTC
```

### 2. Daily Traffic Reports (9 AM UTC)
```
📊 DAILY TRAFFIC REPORT
Date: 2025-01-24

📈 Key Metrics:
• Page Views: 523
• Unique Visitors: 187
• Conversions: 4
• Conversion Rate: 2.14%
• Revenue: $216.00

🔝 Top Pages:
  • /: 234 views
  • /pricing: 89 views
  • /features: 67 views

🌐 Traffic Sources:
  • Google: 145
  • Direct: 89
  • ProductHunt: 45
```

## Troubleshooting

### Bot Not Responding?
1. Check token is correct
2. Ensure bot is started (send `/start`)
3. Verify chat ID is correct

### Not Receiving Notifications?
1. Check Netlify environment variables
2. Review function logs in Netlify dashboard
3. Test with manual curl command above

### Messages Not Formatting?
- Ensure `parse_mode: "HTML"` is set in function code
- Check for HTML syntax errors in messages

## Security Notes

1. **Never commit the bot token to Git**
2. **Use environment variables only**
3. **Regenerate token if compromised**: Send `/revoke` to @BotFather
4. **Limit bot permissions**: Only needs send message capability

## Support

For issues with:
- Bot setup: Check @BotFather documentation
- Notifications: Review Netlify function logs
- Integration: support@releasepilot.io

---

✅ Your bot is ready! Complete steps 1-3 to start receiving notifications.