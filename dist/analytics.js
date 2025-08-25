// REAL Analytics Tracking for ReleasePilot
// This script tracks ACTUAL visitor data

(function() {
    'use strict';
    
    // Configuration
    const ANALYTICS_KEY = 'releasepilot_analytics';
    const VISITORS_KEY = 'releasepilot_visitors';
    const EVENTS_KEY = 'releasepilot_events';
    
    // Get or create visitor ID
    function getVisitorId() {
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitor_id', visitorId);
        }
        return visitorId;
    }
    
    // Get visitor info
    function getVisitorInfo() {
        return {
            id: getVisitorId(),
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            referrer: document.referrer || 'direct',
            userAgent: navigator.userAgent,
            screenResolution: window.screen.width + 'x' + window.screen.height,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            sessionId: sessionStorage.getItem('session_id') || generateSessionId()
        };
    }
    
    // Generate session ID
    function generateSessionId() {
        const sessionId = 'session_' + Date.now();
        sessionStorage.setItem('session_id', sessionId);
        return sessionId;
    }
    
    // Track page view
    function trackPageView() {
        const visitor = getVisitorInfo();
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Get existing analytics data
        let analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
        
        // Initialize today's data if not exists
        if (!analytics[today]) {
            analytics[today] = {
                pageViews: 0,
                uniqueVisitors: [],
                sessions: [],
                events: []
            };
        }
        
        // Track page view
        analytics[today].pageViews++;
        
        // Track unique visitor
        if (!analytics[today].uniqueVisitors.includes(visitor.id)) {
            analytics[today].uniqueVisitors.push(visitor.id);
        }
        
        // Track session
        if (!analytics[today].sessions.includes(visitor.sessionId)) {
            analytics[today].sessions.push(visitor.sessionId);
        }
        
        // Save analytics
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
        
        // Track visitor details
        let visitors = JSON.parse(localStorage.getItem(VISITORS_KEY) || '[]');
        visitors.push(visitor);
        
        // Keep only last 1000 visitors
        if (visitors.length > 1000) {
            visitors = visitors.slice(-1000);
        }
        
        localStorage.setItem(VISITORS_KEY, JSON.stringify(visitors));
        
        // Update real-time counter on admin page
        updateAdminDashboard(analytics[today]);
    }
    
    // Track custom event
    function trackEvent(eventName, eventData) {
        const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
        events.push({
            name: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            visitorId: getVisitorId(),
            page: window.location.pathname
        });
        
        // Keep only last 500 events
        if (events.length > 500) {
            events.shift();
        }
        
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    }
    
    // Track button clicks
    function trackButtonClicks() {
        document.addEventListener('click', function(e) {
            if (e.target.matches('.btn, button, a[href*="stripe.com"]')) {
                const buttonText = e.target.textContent.trim();
                const buttonHref = e.target.href || '';
                
                trackEvent('button_click', {
                    text: buttonText,
                    href: buttonHref,
                    class: e.target.className
                });
                
                // Track special events
                if (buttonHref.includes('stripe.com')) {
                    trackEvent('checkout_initiated', {
                        plan: buttonText,
                        url: buttonHref
                    });
                }
            }
        });
    }
    
    // Track time on page
    let startTime = Date.now();
    window.addEventListener('beforeunload', function() {
        const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', {
            seconds: timeOnPage,
            page: window.location.pathname
        });
    });
    
    // Update admin dashboard if on admin page
    function updateAdminDashboard(todayData) {
        if (window.location.pathname.includes('admin')) {
            // Update real numbers on admin dashboard
            const elements = {
                'visitorsToday': todayData.uniqueVisitors.length,
                'pageViewsToday': todayData.pageViews,
                'sessionsToday': todayData.sessions.length
            };
            
            for (const [id, value] of Object.entries(elements)) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            }
        }
    }
    
    // Get analytics summary
    window.getAnalyticsSummary = function() {
        const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const todayData = analytics[today] || { pageViews: 0, uniqueVisitors: [], sessions: [] };
        const yesterdayData = analytics[yesterday] || { pageViews: 0, uniqueVisitors: [], sessions: [] };
        
        return {
            today: {
                pageViews: todayData.pageViews,
                uniqueVisitors: todayData.uniqueVisitors.length,
                sessions: todayData.sessions.length
            },
            yesterday: {
                pageViews: yesterdayData.pageViews,
                uniqueVisitors: yesterdayData.uniqueVisitors.length,
                sessions: yesterdayData.sessions.length
            },
            last7Days: getLast7DaysData(analytics),
            topPages: getTopPages(),
            topReferrers: getTopReferrers()
        };
    };
    
    // Get last 7 days data
    function getLast7DaysData(analytics) {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0];
            const dayData = analytics[date] || { pageViews: 0, uniqueVisitors: [], sessions: [] };
            data.push({
                date: date,
                pageViews: dayData.pageViews,
                visitors: dayData.uniqueVisitors.length
            });
        }
        return data;
    }
    
    // Get top pages
    function getTopPages() {
        const visitors = JSON.parse(localStorage.getItem(VISITORS_KEY) || '[]');
        const pageCounts = {};
        
        visitors.forEach(v => {
            pageCounts[v.page] = (pageCounts[v.page] || 0) + 1;
        });
        
        return Object.entries(pageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([page, count]) => ({ page, count }));
    }
    
    // Get top referrers
    function getTopReferrers() {
        const visitors = JSON.parse(localStorage.getItem(VISITORS_KEY) || '[]');
        const referrerCounts = {};
        
        visitors.forEach(v => {
            const referrer = v.referrer || 'direct';
            const domain = referrer === 'direct' ? 'direct' : new URL(referrer).hostname;
            referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
        });
        
        return Object.entries(referrerCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([referrer, count]) => ({ referrer, count }));
    }
    
    // Initialize tracking
    trackPageView();
    trackButtonClicks();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            trackEvent('page_visible', { page: window.location.pathname });
        } else {
            trackEvent('page_hidden', { page: window.location.pathname });
        }
    });
    
    // Expose tracking functions globally
    window.ReleasePilotAnalytics = {
        trackEvent: trackEvent,
        trackPageView: trackPageView,
        getAnalyticsSummary: getAnalyticsSummary,
        getVisitorId: getVisitorId
    };
    
})();