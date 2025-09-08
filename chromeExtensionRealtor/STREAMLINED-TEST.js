// STREAMLINED EXTENSION TEST - Paste this into realtor.com console
console.log("🎯 STREAMLINED EXTENSION TEST (NO POPUP/UI VERSION)");

// Check if modules loaded
console.log("window.log available:", typeof window.log !== 'undefined');
console.log("window.ContactExtractor available:", typeof window.ContactExtractor !== 'undefined');
console.log("window.extractor available:", typeof window.extractor !== 'undefined');
console.log("window.RealtorDataExtractor available:", typeof window.RealtorDataExtractor !== 'undefined');

// Check if the extension button was removed (should be missing now)
const button = document.querySelector('#realtor-extractor-btn');
console.log("UI button removed:", button === null);

// Check for extension scripts
const scripts = Array.from(document.scripts);
const extensionScripts = scripts.filter(script => 
    script.src && script.src.includes('chrome-extension')
);
console.log("Extension scripts found:", extensionScripts.length);

// If ContactExtractor is available, test it
if (typeof window.ContactExtractor !== 'undefined') {
    console.log("🎯 CONTACT EXTRACTION TEST:");
    try {
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log("📞 Phone:", phone);
        
        const email = window.ContactExtractor.extractCleanEmail();
        console.log("📧 Email:", email);
        
        const office = window.ContactExtractor.extractOfficeData();
        console.log("🏢 Office:", office);
        
        console.log("✅ Contact extraction working!");
    } catch (error) {
        console.error("❌ Contact extraction error:", error);
    }
} else {
    console.log("❌ Extension still not loading");
}

console.log("🔄 RELOAD THE EXTENSION IN CHROME://EXTENSIONS/ AND TEST AGAIN");
