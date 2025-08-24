const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const MONGODB_URI = process.env.MONGODB_URI;
const ANALYTICS_DB = process.env.ANALYTICS_DB || 'releasepilot';

// Analytics tracking (stores in MongoDB or fallback to memory)
let analyticsStore = {
  pageViews: [],
  uniqueVisitors: new Set(),
  conversions: [],
  revenue: 0
};

// Connect to MongoDB for analytics storage
async function getAnalyticsData() {
  if (!MONGODB_URI) {
    // Return in-memory data if no database configured
    return analyticsStore;
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(ANALYTICS_DB);
    const analytics = db.collection('daily_analytics');
    
    // Get today's data
    const today = new Date().toISOString().split('T')[0];
    const data = await analytics.findOne({ date: today });
    
    return data || analyticsStore;
  } catch (error) {
    console.error('MongoDB error:', error);
    return analyticsStore;
  } finally {
    await client.close();
  }
}

// Format daily report
async function formatDailyReport() {
  const data = await getAnalyticsData();
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate metrics
  const totalPageViews = data.pageViews?.length || 0;
  const uniqueVisitors = data.uniqueVisitors?.size || new Set(data.uniqueVisitors || []).size;
  const totalConversions = data.conversions?.length || 0;
  const totalRevenue = data.revenue || 0;
  const conversionRate = uniqueVisitors > 0 ? ((totalConversions / uniqueVisitors) * 100).toFixed(2) : 0;
  
  // Top pages
  const pageCount = {};
  (data.pageViews || []).forEach(view => {
    pageCount[view.page] = (pageCount[view.page] || 0) + 1;
  });
  
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([page, count]) => `  • ${page}: ${count} views`)
    .join('\n');

  // Traffic sources
  const sourceCount = {};
  (data.pageViews || []).forEach(view => {
    const source = view.referrer || 'Direct';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  });
  
  const topSources = Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => `  • ${source}: ${count}`)
    .join('\n');

  const message = `
<b>📊 DAILY TRAFFIC REPORT</b>
<b>Date:</b> ${today}

<b>📈 Key Metrics:</b>
• Page Views: <b>${totalPageViews}</b>
• Unique Visitors: <b>${uniqueVisitors}</b>
• Conversions: <b>${totalConversions}</b>
• Conversion Rate: <b>${conversionRate}%</b>
• Revenue: <b>$${(totalRevenue / 100).toFixed(2)}</b>

<b>🔝 Top Pages:</b>
${topPages || '  No data available'}

<b>🌐 Traffic Sources:</b>
${topSources || '  No data available'}

<b>💰 Sales Performance:</b>
• New Licenses: ${totalConversions}
• Average Order Value: $${totalConversions > 0 ? ((totalRevenue / totalConversions) / 100).toFixed(2) : '0.00'}

<b>🔔 Alerts:</b>
${totalPageViews < 10 ? '⚠️ Low traffic detected' : '✅ Normal traffic levels'}
${conversionRate < 1 ? '⚠️ Low conversion rate' : '✅ Good conversion rate'}

#daily_report #analytics
`;

  return message;
}

// Send Telegram message
async function sendTelegramMessage(message) {
  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

// Main handler - can be triggered by cron or manually
exports.handler = async (event, context) => {
  // Verify Telegram credentials
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Telegram integration not configured' })
    };
  }

  try {
    // Generate and send the daily report
    const report = await formatDailyReport();
    const sent = await sendTelegramMessage(report);

    if (sent) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Daily report sent successfully' 
        })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          message: 'Failed to send daily report' 
        })
      };
    }

  } catch (error) {
    console.error('Daily report error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate daily report',
        details: error.message 
      })
    };
  }
};