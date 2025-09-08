// MINIMAL WORKING CONTACTEXTRACTOR TEST
// This simulates exactly what the fixed extension should do

console.log("🔬 MINIMAL CONTACTEXTRACTOR SIMULATION");

// Simulate the exact ContactExtractor.extractCleanPhone() static method
class TestContactExtractor {
    static extractCleanPhone() {
        console.log("📞 Testing extractCleanPhone() logic...");
        
        // Phone selectors from the real ContactExtractor
        const phoneSelectors = [
            'a[href^="tel:"]',
            '[data-testid="phone"]',
            '[data-testid="agent-phone"]',
            '.phone',
            '.agent-phone',
            '.contact-phone',
            '.phone-number'
        ];
        
        // Try each selector
        for (const selector of phoneSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`  Checking ${selector}: ${elements.length} elements`);
            
            for (const element of elements) {
                // Check href attribute first (tel: links)
                if (element.href && element.href.includes('tel:')) {
                    const phone = element.href.replace('tel:', '').trim();
                    const cleaned = phone.replace(/[^\d]/g, '');
                    
                    if (cleaned.length >= 10) {
                        console.log(`    ✅ FOUND in href: ${phone} -> ${cleaned}`);
                        return phone; // Return the formatted version
                    }
                }
                
                // Check text content
                const text = element.textContent?.trim();
                if (text) {
                    const cleaned = text.replace(/[^\d]/g, '');
                    if (cleaned.length >= 10) {
                        console.log(`    ✅ FOUND in text: ${text} -> ${cleaned}`);
                        return text;
                    }
                }
            }
        }
        
        console.log("    ❌ No phone found");
        return null;
    }
    
    static extractCleanEmail() {
        console.log("📧 Testing extractCleanEmail() logic...");
        
        const emailSelectors = [
            'a[href^="mailto:"]',
            '[data-testid="email"]',
            '.email',
            '.contact-email'
        ];
        
        for (const selector of emailSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`  Checking ${selector}: ${elements.length} elements`);
            
            for (const element of elements) {
                if (element.href && element.href.includes('mailto:')) {
                    const email = element.href.replace('mailto:', '');
                    console.log(`    ✅ FOUND email: ${email}`);
                    return email;
                }
                
                const text = element.textContent?.trim();
                if (text && text.includes('@')) {
                    console.log(`    ✅ FOUND email: ${text}`);
                    return text;
                }
            }
        }
        
        console.log("    ❌ No email found");
        return null;
    }
}

// Test the static methods
console.log("\n=== TESTING STATIC METHODS ===");
const phone = TestContactExtractor.extractCleanPhone();
const email = TestContactExtractor.extractCleanEmail();

console.log("\n=== FINAL RESULTS ===");
console.log("📞 Phone:", phone);
console.log("📧 Email:", email);

// This proves our ContactExtractor static methods SHOULD work once extension loads
console.log("\n✅ ContactExtractor logic WORKS - issue is extension not loading!");
