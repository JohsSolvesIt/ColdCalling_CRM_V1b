// MINIMAL EXTENSION DEBUG - Run this in console on realtor.com page
console.log("🔧 MINIMAL DEBUG - Testing Extension Injection");

// Test 1: Are we on the right page?
console.log("Current URL:", window.location.href);
console.log("Is realtor.com:", window.location.href.includes('realtor.com'));

// Test 2: Are any extension scripts loaded?
const allScripts = Array.from(document.scripts);
const extensionScripts = allScripts.filter(s => s.src && (s.src.includes('extension://') || s.src.includes('chrome-extension://')));
console.log("Total scripts on page:", allScripts.length);
console.log("Extension scripts found:", extensionScripts.length);

if (extensionScripts.length > 0) {
    console.log("Extension scripts:");
    extensionScripts.forEach(s => console.log("  -", s.src));
} else {
    console.log("❌ NO EXTENSION SCRIPTS FOUND - Extension not injecting!");
}

// Test 3: Check global objects
console.log("window.log available:", typeof window.log !== 'undefined');
console.log("window.ContactExtractor available:", typeof window.ContactExtractor !== 'undefined');
console.log("window.extractor available:", typeof window.extractor !== 'undefined');

// Test 4: Check for extension button
const button = document.querySelector('[data-extension-button]');
console.log("Extension button found:", !!button);

// Test 5: Simple phone search
const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
console.log("Tel links found:", phoneLinks.length);
phoneLinks.forEach((link, i) => console.log(`  ${i+1}. ${link.href}`));

console.log("🏁 MINIMAL DEBUG COMPLETE");
