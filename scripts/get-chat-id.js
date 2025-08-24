#!/usr/bin/env node

/**
 * Helper script to get your Telegram chat ID
 * Usage: node get-chat-id.js
 */

const https = require('https');

const BOT_TOKEN = '8053371099:AAHOfPP_5_b1a_-gYzx7BkImjtzTEUdwYGM';

console.log('🔍 Fetching recent messages to find your chat ID...\n');

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${BOT_TOKEN}/getUpdates`,
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (!response.ok) {
        console.error('❌ Error from Telegram API:', response.description);
        return;
      }

      if (response.result.length === 0) {
        console.log('📭 No messages found.\n');
        console.log('Please follow these steps:');
        console.log('1. Open Telegram');
        console.log('2. Search for @ReleasePilotBot');
        console.log('3. Send /start or any message');
        console.log('4. Run this script again\n');
        return;
      }

      console.log('📬 Found messages! Here are the chat IDs:\n');
      
      const chats = new Map();
      
      response.result.forEach(update => {
        if (update.message) {
          const chat = update.message.chat;
          const chatInfo = {
            id: chat.id,
            type: chat.type,
            name: chat.title || chat.username || `${chat.first_name || ''} ${chat.last_name || ''}`.trim(),
            lastMessage: update.message.text
          };
          chats.set(chat.id, chatInfo);
        }
      });

      chats.forEach(chat => {
        console.log('─'.repeat(50));
        console.log(`📍 Chat ID: ${chat.id}`);
        console.log(`   Type: ${chat.type}`);
        console.log(`   Name: ${chat.name}`);
        console.log(`   Last message: "${chat.lastMessage?.substring(0, 50)}..."`);
        console.log();
      });

      console.log('─'.repeat(50));
      console.log('\n✅ Copy your chat ID from above and use it in:');
      console.log('   • Netlify environment variable: TELEGRAM_CHAT_ID');
      console.log('   • Test script: node test-telegram.js YOUR_CHAT_ID\n');

    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();