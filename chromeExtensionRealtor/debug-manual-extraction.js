/**
 * MANUAL EXTRACTION TEST - Try to manually extract contact info
 * Copy and paste this into the browser console on the realtor page
 */

console.log('📱 MANUAL CONTACT EXTRACTION TEST');
console.log('=================================');

// Manual phone extraction
console.log('🔍 Looking for phone numbers manually...');

// Strategy 1: Look for tel: links
const telLinks = document.querySelectorAll('a[href^="tel:"]');
console.log(`Found ${telLinks.length} tel: links`);
telLinks.forEach((link, i) => {
    const phone = link.href.replace('tel:', '').trim();
    console.log(`  Tel link ${i + 1}: ${phone} (text: "${link.textContent?.trim()}")`);
});

// Strategy 2: Look for phone patterns in page text
const pageText = document.body.textContent;
const phonePatterns = [
    /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,  // (323) 610-0231
    /\d{3}[-\s]\d{3}[-\s]\d{4}/g,     // 323-610-0231 or 323 610 0231
    /\d{3}\.\d{3}\.\d{4}/g            // 323.610.0231
];

phonePatterns.forEach((pattern, index) => {
    const matches = pageText.match(pattern);
    if (matches) {
        console.log(`Pattern ${index + 1} found ${matches.length} matches:`, matches.slice(0, 3));
    }
});

// Strategy 3: Look for email addresses
console.log('\n🔍 Looking for email addresses manually...');
const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const emailMatches = pageText.match(emailPattern);
if (emailMatches) {
    console.log('Found emails:', emailMatches.filter(email => !email.includes('realtor.com')));
} else {
    console.log('No email addresses found');
}

// Strategy 4: Look for contact buttons
console.log('\n🔍 Looking for contact buttons...');
const contactButtons = document.querySelectorAll('button, a, [role="button"]');
const phoneButtons = [];
const emailButtons = [];

contactButtons.forEach(button => {
    const text = (button.textContent || '').toLowerCase();
    const href = button.href || '';
    
    if (text.includes('call') || text.includes('phone') || href.startsWith('tel:')) {
        phoneButtons.push({
            text: button.textContent?.trim(),
            href: href,
            type: 'phone'
        });
    }
    
    if (text.includes('email') || text.includes('message') || href.startsWith('mailto:')) {
        emailButtons.push({
            text: button.textContent?.trim(),
            href: href,
            type: 'email'
        });
    }
});

console.log(`Found ${phoneButtons.length} phone-related buttons:`, phoneButtons);
console.log(`Found ${emailButtons.length} email-related buttons:`, emailButtons);

console.log('\n✅ Manual extraction complete');
console.log('\n💡 If this finds contact info but the extension doesn\'t, the issue is with extension loading.');
