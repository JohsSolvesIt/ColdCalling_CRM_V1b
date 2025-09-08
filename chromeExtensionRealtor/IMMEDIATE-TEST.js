// IMMEDIATE EXTENSION TEST - Paste this into realtor.com console
console.log("🔥 IMMEDIATE EXTENSION TEST AFTER LOG FIX");

// Check if modules loaded
console.log("window.log available:", typeof window.log !== 'undefined');
console.log("window.ContactExtractor available:", typeof window.ContactExtractor !== 'undefined');
console.log("window.extractor available:", typeof window.extractor !== 'undefined');
console.log("window.RealtorDataExtractor available:", typeof window.RealtorDataExtractor !== 'undefined');

// If ContactExtractor is available, test it immediately
if (typeof window.ContactExtractor !== 'undefined') {
    console.log("🎯 CONTACT EXTRACTOR TEST:");
    try {
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log("📞 Phone:", phone);
        
        const email = window.ContactExtractor.extractCleanEmail();
        console.log("📧 Email:", email);
        
        const office = window.ContactExtractor.extractOfficeData();
        console.log("🏢 Office:", office);
    } catch (error) {
        console.error("❌ Error testing ContactExtractor:", error);
    }
} else {
    console.log("❌ ContactExtractor not available - extension not loaded");
}
