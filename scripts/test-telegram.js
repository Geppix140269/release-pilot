#!/usr/bin/env node

/**
 * Test script for Telegram bot integration
 * Usage: node test-telegram.js YOUR_CHAT_ID
 */

const https = require('https');

// Bot configuration
const BOT_TOKEN = '8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM';
const TELEGRAM_API = 'api.telegram.org';

// Get chat ID from command line
const chatId = process.argv[2];

if (!chatId) {
  console.log('❌ Please provide your chat ID as an argument');
  console.log('Usage: node test-telegram.js YOUR_CHAT_ID');
  console.log('\nTo get your chat ID:');
  console.log('1. Send a message to @ReleasePilotBot');
  console.log('2. Open: https://api.telegram.org/bot' + BOT_TOKEN + '/getUpdates');
  console.log('3. Find your chat ID in the response');
  process.exit(1);
}

// Test messages
const messages = [
  {
    text: '✅ <b>Telegram Integration Test</b>\n\nYour ReleasePilot bot is successfully connected!',
    delay: 0
  },
  {
    text: `🎉 <b>Sample License Sale Notification</b>

<b>Customer Details:</b>
• Email: demo@example.com
• Name: Demo User
• Country: United States

<b>Purchase Details:</b>
• Plan: <b>Professional</b>
• Amount: <b>$49.00</b>
• Payment: Card
• License: <code>RP-DEMO-1234-5678</code>

<b>Timestamp:</b> ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  dateStyle: 'medium',
  timeStyle: 'medium'
})} UTC`,
    delay: 2000
  },
  {
    text: `📊 <b>Sample Daily Report</b>

<b>📈 Today's Metrics:</b>
• Page Views: <b>342</b>
• Unique Visitors: <b>127</b>
• Conversions: <b>3</b>
• Conversion Rate: <b>2.36%</b>
• Revenue: <b>$147.00</b>

<b>🔝 Top Pages:</b>
  • Homepage: 145 views
  • Pricing: 78 views
  • Features: 45 views

<b>🌐 Traffic Sources:</b>
  • Google: 89
  • Direct: 56
  • GitHub: 34`,
    delay: 4000
  }
];

// Send message function
function sendMessage(message, chatId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: TELEGRAM_API,
      port: 443,
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const response = JSON.parse(responseData);
        if (response.ok) {
          resolve(response);
        } else {
          reject(new Error(response.description || 'Failed to send message'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Telegram bot test...\n');
  console.log(`📍 Sending to chat ID: ${chatId}\n`);

  for (const message of messages) {
    if (message.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, message.delay));
    }

    try {
      console.log('📤 Sending test message...');
      const result = await sendMessage(message, chatId);
      console.log('✅ Message sent successfully!\n');
    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
      
      if (error.message.includes('chat not found')) {
        console.log('\n💡 Make sure you have:');
        console.log('1. Started a conversation with @ReleasePilotBot');
        console.log('2. Used the correct chat ID');
      }
      
      process.exit(1);
    }
  }

  console.log('🎉 All tests completed successfully!');
  console.log('\n✅ Your Telegram integration is ready for production.');
  console.log('\n📝 Next steps:');
  console.log('1. Add these to Netlify environment variables:');
  console.log(`   TELEGRAM_BOT_TOKEN=${BOT_TOKEN}`);
  console.log(`   TELEGRAM_CHAT_ID=${chatId}`);
  console.log('2. Deploy to Netlify');
  console.log('3. Start receiving real notifications!');
}

// Run the tests
runTests().catch(console.error);