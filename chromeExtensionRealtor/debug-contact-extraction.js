/**
 * Debug Contact Extraction for Becky Prescott
 * Test script to diagnose contact extraction issues
 */

// Test contact extraction with enhanced debugging
function debugContactExtraction() {
    console.log('🔍 DEBUG: Starting contact extraction test...');
    
    // Check if page content is available
    const bodyText = document.body.textContent;
    console.log('📄 Page text length:', bodyText.length);
    console.log('📄 Page contains Becky:', bodyText.includes('Becky'));
    console.log('📄 Page contains contact:', bodyText.includes('contact'));
    
    // Look for phone patterns manually
    const phonePatterns = [
        /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,  // (323) 610-0231
        /\d{3}[-\s]\d{3}[-\s]\d{4}/g,     // 323-610-0231 or 323 610 0231
        /\d{3}\.\d{3}\.\d{4}/g,           // 323.610.0231
    ];
    
    console.log('📞 Looking for phone patterns in page text...');
    for (const pattern of phonePatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
            console.log('📞 Found phone matches:', matches);
        }
    }
    
    // Look for email patterns
    const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    const emailMatches = bodyText.match(emailPattern);
    console.log('📧 Email matches found:', emailMatches);
    
    // Check common contact selectors
    const phoneSelectors = [
        '[data-testid="phone"]',
        '[data-testid="agent-phone"]',
        '.phone',
        '.agent-phone',
        '.contact-phone',
        '.phone-number',
        'a[href^="tel:"]',
        '[href*="tel:"]'
    ];
    
    console.log('📞 Checking phone selectors...');
    for (const selector of phoneSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`📞 ${selector}: found ${elements.length} elements`);
        if (elements.length > 0) {
            elements.forEach((el, i) => {
                console.log(`  Element ${i}:`, el.textContent?.trim() || el.href);
            });
        }
    }
    
    // Check email selectors
    const emailSelectors = [
        '[data-testid="email"]',
        '.email',
        'a[href^="mailto:"]',
        '[href*="mailto:"]'
    ];
    
    console.log('📧 Checking email selectors...');
    for (const selector of emailSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`📧 ${selector}: found ${elements.length} elements`);
        if (elements.length > 0) {
            elements.forEach((el, i) => {
                console.log(`  Element ${i}:`, el.textContent?.trim() || el.href);
            });
        }
    }
    
    // Look for contact buttons or interactive elements
    const buttonSelectors = [
        'button[data-testid*="contact"]',
        'button[data-testid*="phone"]',
        'button[data-testid*="email"]',
        '.contact-button',
        '.phone-button',
        '.email-button'
    ];
    
    console.log('🔘 Checking contact buttons...');
    for (const selector of buttonSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔘 ${selector}: found ${elements.length} elements`);
        if (elements.length > 0) {
            elements.forEach((el, i) => {
                console.log(`  Button ${i}:`, el.textContent?.trim(), el.getAttribute('data-testid'));
            });
        }
    }
    
    // Check if contact info might be behind a modal or hidden
    const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden, [hidden]');
    console.log(`🙈 Found ${hiddenElements.length} hidden elements`);
    
    // Sample some hidden elements for contact info
    let hiddenContactCount = 0;
    for (const el of hiddenElements) {
        if (hiddenContactCount > 5) break; // Don't check too many
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('phone') || text.includes('email') || text.includes('contact')) {
            console.log('🙈 Hidden element with contact info:', el.textContent?.slice(0, 100));
            hiddenContactCount++;
        }
    }
}

// Run the debug test
debugContactExtraction();
