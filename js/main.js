// ReleasePilot - Main JavaScript

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Navigation Scroll Effect =====
let lastScroll = 0;
const nav = document.querySelector('nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe all animatable elements
document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// ===== Copy Code Blocks =====
document.querySelectorAll('.code-block').forEach(block => {
    const button = document.createElement('button');
    button.className = 'copy-code-btn';
    button.textContent = 'Copy';
    button.onclick = () => {
        const code = block.querySelector('pre').textContent;
        navigator.clipboard.writeText(code);
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    };
    block.appendChild(button);
});

// ===== Pricing Toggle (Monthly/Annual) =====
function togglePricing() {
    const toggle = document.getElementById('pricing-toggle');
    const prices = document.querySelectorAll('.price-value');
    const periods = document.querySelectorAll('.price-period');
    
    if (toggle && toggle.checked) {
        // Annual pricing (20% off)
        prices.forEach(price => {
            const monthly = parseInt(price.dataset.monthly);
            const annual = Math.floor(monthly * 12 * 0.8);
            price.textContent = annual;
        });
        periods.forEach(period => {
            period.textContent = '/year';
        });
    } else {
        // Monthly pricing
        prices.forEach(price => {
            price.textContent = price.dataset.monthly;
        });
        periods.forEach(period => {
            period.textContent = '/month';
        });
    }
}

// ===== Feature Tabs =====
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// ===== Testimonial Carousel =====
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial');

function showTestimonial(index) {
    testimonials.forEach(t => t.classList.remove('active'));
    if (testimonials[index]) {
        testimonials[index].classList.add('active');
    }
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(currentTestimonial);
}

function prevTestimonial() {
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    showTestimonial(currentTestimonial);
}

// Auto-rotate testimonials
if (testimonials.length > 0) {
    setInterval(nextTestimonial, 5000);
}

// ===== Mobile Menu Toggle =====
function toggleMobileMenu() {
    const menu = document.querySelector('.nav-links');
    const burger = document.querySelector('.mobile-menu-btn');
    
    menu.classList.toggle('active');
    burger.classList.toggle('active');
}

// ===== Form Validation =====
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('newsletter-email').value;
    const message = document.getElementById('newsletter-message');
    
    if (validateEmail(email)) {
        // In real app, send to backend
        message.textContent = 'Thank you for subscribing!';
        message.className = 'success-message';
        document.getElementById('newsletter-email').value = '';
    } else {
        message.textContent = 'Please enter a valid email address';
        message.className = 'error-message';
    }
}

// ===== Load More Features =====
function loadMoreFeatures() {
    const hiddenFeatures = document.querySelectorAll('.feature-card.hidden');
    hiddenFeatures.forEach((feature, index) => {
        if (index < 3) {
            feature.classList.remove('hidden');
            feature.classList.add('animate-in');
        }
    });
    
    if (document.querySelectorAll('.feature-card.hidden').length === 0) {
        document.getElementById('load-more-btn').style.display = 'none';
    }
}

// ===== Initialize on DOM Load =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animations
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
    
    // Set current year in footer
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Initialize first testimonial
    if (testimonials.length > 0) {
        showTestimonial(0);
    }
});