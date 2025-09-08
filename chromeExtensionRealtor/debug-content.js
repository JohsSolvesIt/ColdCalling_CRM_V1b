// MINIMAL DEBUG CONTENT SCRIPT
console.log("🟢 DEBUG EXTENSION INJECTED SUCCESSFULLY!");

// Basic phone extraction test
const phoneElements = document.querySelectorAll('a[href^="tel:"]');
console.log("📞 Tel links found:", phoneElements.length);
phoneElements.forEach((link, i) => {
    console.log(`  ${i+1}. ${link.href} - ${link.textContent?.trim()}`);
});

// Make available globally for console testing
window.debugExtractor = {
    findPhones: () => {
        const phones = [];
        document.querySelectorAll('a[href^="tel:"]').forEach(link => {
            phones.push({
                href: link.href,
                text: link.textContent?.trim(),
                cleanPhone: link.href.replace('tel:', '').replace(/\D/g, '')
            });
        });
        return phones;
    },
    
    findEmails: () => {
        const emails = [];
        document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
            emails.push({
                href: link.href,
                text: link.textContent?.trim(),
                email: link.href.replace('mailto:', '')
            });
        });
        return emails;
    }
};

console.log("🔧 Debug extractor available as window.debugExtractor");
console.log("Usage: window.debugExtractor.findPhones()");
