const fetch = require('node-fetch');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
};

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

// Format license sale notification
function formatSaleNotification(data) {
  const { customer, plan, amount, currency, paymentMethod, licenseKey } = data;
  
  const message = `
<b>🎉 NEW LICENSE SALE!</b>

<b>Customer Details:</b>
• Email: ${customer.email}
• Name: ${customer.name || 'Not provided'}
• Country: ${customer.country || 'Unknown'}

<b>Purchase Details:</b>
• Plan: <b>${plan}</b>
• Amount: <b>${formatCurrency(amount, currency)}</b>
• Payment: ${paymentMethod}
• License: <code>${licenseKey}</code>

<b>Timestamp:</b> ${new Date().toLocaleString('en-US', { 
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'medium'
  })} UTC

#sale #${plan.toLowerCase().replace(/\s+/g, '_')}
`;

  return message;
}

// Main handler for license sale notifications
exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify Telegram credentials are configured
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Telegram integration not configured' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.customer || !data.plan || !data.amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Format and send the notification
    const message = formatSaleNotification(data);
    const sent = await sendTelegramMessage(message);

    if (sent) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Notification sent successfully' 
        })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          message: 'Failed to send notification' 
        })
      };
    }

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};