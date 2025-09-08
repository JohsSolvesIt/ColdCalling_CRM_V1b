// DEBUG: Simple test to check if content script is loading
console.log("🧪 DEBUG CONTENT SCRIPT TEST STARTING...");

// Test 1: Check if our global objects exist
console.log("1. Checking global objects:");
console.log("   - window.log:", typeof window.log);
console.log("   - window.ContactExtractor:", typeof window.ContactExtractor);
console.log("   - window.RealtorDataExtractor:", typeof window.RealtorDataExtractor);
console.log("   - window.extractor:", typeof window.extractor);

// Test 2: Check current page URL
console.log("2. Current page:", window.location.href);
console.log("   - Is realtor.com page:", window.location.href.includes('realtor.com'));

// Test 3: Check if extraction button exists
const button = document.getElementById('realtor-extractor-btn');
console.log("3. Extraction button exists:", !!button);

// Test 4: Test ContactExtractor directly if available
if (typeof window.ContactExtractor !== 'undefined') {
    console.log("4. Testing ContactExtractor directly:");
    try {
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log("   - Phone extraction result:", phone);
        
        const email = window.ContactExtractor.extractCleanEmail();
        console.log("   - Email extraction result:", email);
    } catch (error) {
        console.log("   - ContactExtractor error:", error.message);
    }
} else {
    console.log("4. ContactExtractor not available");
}

// Test 5: Check if we can manually create RealtorDataExtractor
if (typeof window.RealtorDataExtractor !== 'undefined') {
    console.log("5. RealtorDataExtractor class available");
    try {
        console.log("   - Attempting to create new instance...");
        const testExtractor = new window.RealtorDataExtractor();
        console.log("   - ✅ Successfully created test instance");
    } catch (error) {
        console.log("   - ❌ Error creating instance:", error.message);
    }
} else {
    console.log("5. RealtorDataExtractor class NOT available");
}

// Test 6: Check if we can find phone numbers manually on the page
console.log("6. Manual phone number search:");
const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
console.log("   - Tel links found:", phoneLinks.length);
if (phoneLinks.length > 0) {
    phoneLinks.forEach((link, index) => {
        console.log(`   - Tel link ${index + 1}: ${link.href}`);
    });
}

// Test 7: Search for phone patterns in page text
const pageText = document.body.textContent;
const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const phoneMatches = pageText.match(phonePattern);
console.log("7. Phone patterns in page text:", phoneMatches ? phoneMatches.slice(0, 3) : "none found");

console.log("🏁 DEBUG CONTENT SCRIPT TEST COMPLETE");
