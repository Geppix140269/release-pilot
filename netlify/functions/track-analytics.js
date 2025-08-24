const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const ANALYTICS_DB = process.env.ANALYTICS_DB || 'releasepilot';

// In-memory fallback storage
let memoryStore = {
  pageViews: [],
  uniqueVisitors: new Set(),
  conversions: [],
  revenue: 0
};

// Save analytics data
async function saveAnalytics(data) {
  if (!MONGODB_URI) {
    // Use in-memory storage if no database
    if (data.type === 'pageview') {
      memoryStore.pageViews.push(data);
      if (data.visitorId) {
        memoryStore.uniqueVisitors.add(data.visitorId);
      }
    } else if (data.type === 'conversion') {
      memoryStore.conversions.push(data);
      memoryStore.revenue += data.amount || 0;
    }
    return true;
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(ANALYTICS_DB);
    const analytics = db.collection('daily_analytics');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Update today's analytics
    const update = {};
    if (data.type === 'pageview') {
      update.$push = { pageViews: data };
      if (data.visitorId) {
        update.$addToSet = { uniqueVisitors: data.visitorId };
      }
    } else if (data.type === 'conversion') {
      update.$push = { conversions: data };
      update.$inc = { revenue: data.amount || 0 };
    }
    
    await analytics.updateOne(
      { date: today },
      update,
      { upsert: true }
    );
    
    return true;
  } catch (error) {
    console.error('MongoDB error:', error);
    return false;
  } finally {
    await client.close();
  }
}

// Parse user agent for device info
function parseUserAgent(userAgent) {
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  let device = 'Desktop';
  if (isMobile) device = 'Mobile';
  if (isTablet) device = 'Tablet';
  
  let browser = 'Unknown';
  if (/Chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent)) browser = 'Safari';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';
  
  return { device, browser };
}

// Get visitor ID from cookies or generate new one
function getVisitorId(cookies) {
  const cookieString = cookies || '';
  const visitorMatch = cookieString.match(/visitor_id=([^;]+)/);
  
  if (visitorMatch) {
    return visitorMatch[1];
  }
  
  // Generate new visitor ID
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main handler for analytics tracking
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const timestamp = new Date().toISOString();
    
    // Get visitor ID
    const visitorId = getVisitorId(event.headers.cookie);
    
    // Parse user agent
    const { device, browser } = parseUserAgent(event.headers['user-agent'] || '');
    
    // Prepare analytics data
    const analyticsData = {
      ...data,
      timestamp,
      visitorId,
      device,
      browser,
      ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown',
      referrer: event.headers.referer || event.headers.referrer || 'direct'
    };
    
    // Save to database
    const saved = await saveAnalytics(analyticsData);
    
    // Set visitor cookie
    const setCookie = `visitor_id=${visitorId}; Path=/; Max-Age=31536000; SameSite=Lax`;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': setCookie
      },
      body: JSON.stringify({ 
        success: saved,
        visitorId 
      })
    };

  } catch (error) {
    console.error('Analytics error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to track analytics',
        details: error.message 
      })
    };
  }
};