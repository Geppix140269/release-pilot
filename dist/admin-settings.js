// Admin Dashboard Configuration
// Add this to your admin.html to connect real data sources

const ADMIN_CONFIG = {
    // Google Analytics (replace with your tracking ID)
    googleAnalyticsId: 'G-XXXXXXXXXX',
    
    // GitHub API (public data, no auth needed)
    githubRepo: 'geppix140269/release-pilot',
    
    // Stripe API (you'll need to create a read-only API key)
    stripePublishableKey: 'pk_live_...',
    
    // Your backend API endpoints (when you set them up)
    apiEndpoints: {
        metrics: '/api/metrics',
        customers: '/api/customers',
        activity: '/api/activity'
    }
};

// Function to fetch GitHub stars
async function fetchGitHubStars() {
    try {
        const response = await fetch(`https://api.github.com/repos/${ADMIN_CONFIG.githubRepo}`);
        const data = await response.json();
        return {
            stars: data.stargazers_count,
            forks: data.forks_count,
            watchers: data.subscribers_count
        };
    } catch (error) {
        console.error('Error fetching GitHub data:', error);
        return { stars: 0, forks: 0, watchers: 0 };
    }
}

// Function to track custom events
function trackEvent(eventName, eventData) {
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Store locally for dashboard
    const events = JSON.parse(localStorage.getItem('releasepilot_events') || '[]');
    events.push({
        name: eventName,
        data: eventData,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events
    if (events.length > 100) {
        events.shift();
    }
    
    localStorage.setItem('releasepilot_events', JSON.stringify(events));
}

// Function to simulate real-time data updates
function simulateRealTimeData() {
    const metrics = JSON.parse(localStorage.getItem('releasepilot_metrics') || '{}');
    
    // Simulate visitor changes
    if (Math.random() > 0.7) {
        metrics.visitorsToday = (metrics.visitorsToday || 0) + 1;
        updateMetricDisplay('visitorsToday', metrics.visitorsToday);
    }
    
    // Simulate trial starts
    if (Math.random() > 0.95) {
        metrics.activeTrials = (metrics.activeTrials || 0) + 1;
        updateMetricDisplay('activeTrials', metrics.activeTrials);
        addActivityItem('New trial started');
    }
    
    // Simulate conversions
    if (Math.random() > 0.98) {
        metrics.payingCustomers = (metrics.payingCustomers || 0) + 1;
        metrics.mrr = (metrics.mrr || 0) + 49;
        updateMetricDisplay('payingCustomers', metrics.payingCustomers);
        updateMetricDisplay('mrr', `$${metrics.mrr}`);
        addActivityItem('New customer converted! 🎉');
    }
    
    localStorage.setItem('releasepilot_metrics', JSON.stringify(metrics));
}

// Function to update metric display with animation
function updateMetricDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.transform = 'scale(1.2)';
        element.textContent = value;
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }
}

// Function to add activity item
function addActivityItem(description) {
    const feedContainer = document.getElementById('activityFeed');
    if (feedContainer) {
        const newItem = document.createElement('div');
        newItem.className = 'activity-item';
        newItem.innerHTML = `
            <div class="activity-time">Just now</div>
            <div class="activity-description">${description}</div>
        `;
        feedContainer.insertBefore(newItem, feedContainer.firstChild);
        
        // Keep only last 10 items
        while (feedContainer.children.length > 10) {
            feedContainer.removeChild(feedContainer.lastChild);
        }
    }
}

// Function to export data as CSV
function exportDataAsCSV() {
    const metrics = JSON.parse(localStorage.getItem('releasepilot_metrics') || '{}');
    const events = JSON.parse(localStorage.getItem('releasepilot_events') || '[]');
    
    let csv = 'Metric,Value\\n';
    csv += `Visitors Today,${metrics.visitorsToday || 0}\\n`;
    csv += `GitHub Stars,${metrics.githubStars || 0}\\n`;
    csv += `Active Trials,${metrics.activeTrials || 0}\\n`;
    csv += `Paying Customers,${metrics.payingCustomers || 0}\\n`;
    csv += `MRR,$${metrics.mrr || 0}\\n`;
    csv += `\\nRecent Events\\n`;
    csv += 'Timestamp,Event,Data\\n';
    
    events.forEach(event => {
        csv += `${event.timestamp},${event.name},"${JSON.stringify(event.data)}"\\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `releasepilot-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Initialize real-time updates
if (typeof window !== 'undefined') {
    // Update GitHub stars every 5 minutes
    setInterval(async () => {
        const githubData = await fetchGitHubStars();
        const metrics = JSON.parse(localStorage.getItem('releasepilot_metrics') || '{}');
        metrics.githubStars = githubData.stars;
        localStorage.setItem('releasepilot_metrics', JSON.stringify(metrics));
        updateMetricDisplay('githubStars', githubData.stars);
    }, 300000);
    
    // Simulate real-time data every 5 seconds
    setInterval(simulateRealTimeData, 5000);
}