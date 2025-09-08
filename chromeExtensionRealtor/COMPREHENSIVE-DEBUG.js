// COMPREHENSIVE EXTENSION DEBUG - Paste this in console
console.log("🔍 COMPREHENSIVE EXTENSION DEBUG");

// Test 1: Extension Context
console.log("\n=== 1. EXTENSION MODULE AVAILABILITY ===");
console.log("ContactExtractor available:", typeof window.ContactExtractor !== 'undefined');
console.log("AgentExtractor available:", typeof window.AgentExtractor !== 'undefined');
console.log("BioExtractor available:", typeof window.BioExtractor !== 'undefined');
console.log("log object available:", typeof log !== 'undefined');

// Test 2: Extension Content Script
console.log("\n=== 2. CONTENT SCRIPT STATUS ===");
console.log("window.extractor exists:", typeof window.extractor !== 'undefined');
console.log("Extension button found:", !!document.querySelector('[data-extension-button]'));

// Test 3: Manifest Host Permissions Check
console.log("\n=== 3. CURRENT PAGE INFO ===");
console.log("Current URL:", window.location.href);
console.log("Domain:", window.location.hostname);
console.log("Protocol:", window.location.protocol);

// Test 4: Script Tags Check
console.log("\n=== 4. LOADED SCRIPTS CHECK ===");
const scripts = Array.from(document.querySelectorAll('script[src]'));
const extensionScripts = scripts.filter(s => s.src.includes('extension://') || s.src.includes('chrome-extension://'));
console.log("Extension scripts found:", extensionScripts.length);
extensionScripts.forEach(script => console.log("  - Script:", script.src));

// Test 5: ContactExtractor Deep Test (if available)
if (typeof window.ContactExtractor !== 'undefined') {
    console.log("\n=== 5. CONTACTEXTRACTOR DEEP TEST ===");
    
    try {
        console.log("Testing extractCleanPhone()...");
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log("📞 Phone result:", phone);
        
        console.log("Testing extractCleanEmail()...");
        const email = window.ContactExtractor.extractCleanEmail();
        console.log("📧 Email result:", email);
        
        console.log("Testing extractOfficeData()...");
        const office = window.ContactExtractor.extractOfficeData();
        console.log("🏢 Office result:", office);
    } catch (error) {
        console.error("❌ ContactExtractor method error:", error);
    }
} else {
    console.log("\n=== 5. CONTACTEXTRACTOR NOT AVAILABLE ===");
    console.log("❌ Extension not properly injected into page");
}

// Test 6: Manual Contact Data Test
console.log("\n=== 6. MANUAL CONTACT SEARCH ===");
const phoneElements = document.querySelectorAll('a[href^="tel:"], [data-testid*="phone"], .phone, .contact-phone');
console.log("Phone elements found:", phoneElements.length);
phoneElements.forEach((el, i) => console.log(`  ${i+1}. ${el.textContent?.trim() || el.href}`));

const emailElements = document.querySelectorAll('a[href^="mailto:"], [data-testid*="email"], .email');
console.log("Email elements found:", emailElements.length);
emailElements.forEach((el, i) => console.log(`  ${i+1}. ${el.textContent?.trim() || el.href}`));

// Test 7: Try to trigger extraction manually
if (typeof window.extractor !== 'undefined' && window.extractor.extractContactData) {
    console.log("\n=== 7. MANUAL EXTRACTION TEST ===");
    try {
        const result = window.extractor.extractContactData();
        console.log("Manual extraction result:", result);
    } catch (error) {
        console.error("Manual extraction error:", error);
    }
}

console.log("\n🏁 DEBUG COMPLETE");
