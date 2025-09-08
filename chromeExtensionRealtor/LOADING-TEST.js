// EXTENSION LOADING TEST - Paste this into realtor.com console
console.log("🧪 TESTING EXTENSION LOADING AFTER SAFETY FIXES");

setTimeout(() => {
    console.log("\n=== POST-SAFETY CHECK RESULTS ===");
    
    // Test if modules are now available
    console.log("window.log:", typeof window.log !== 'undefined');
    console.log("window.ContactExtractor:", typeof window.ContactExtractor !== 'undefined');
    console.log("window.AgentExtractor:", typeof window.AgentExtractor !== 'undefined');
    console.log("window.BioExtractor:", typeof window.BioExtractor !== 'undefined');
    console.log("window.extractor:", typeof window.extractor !== 'undefined');
    
    // Test extension button
    const button = document.querySelector('[data-extension-button]');
    console.log("Extension button exists:", !!button);
    
    // Test ContactExtractor methods if available
    if (typeof window.ContactExtractor !== 'undefined') {
        console.log("\n=== CONTACTEXTRACTOR TEST ===");
        try {
            const phone = window.ContactExtractor.extractCleanPhone();
            console.log("📞 Phone extraction result:", phone);
            
            const email = window.ContactExtractor.extractCleanEmail();
            console.log("📧 Email extraction result:", email);
            
            const office = window.ContactExtractor.extractOfficeData();
            console.log("🏢 Office extraction result:", office);
        } catch (error) {
            console.error("❌ ContactExtractor test failed:", error);
        }
    }
    
    // Test manual extraction via main extractor
    if (typeof window.extractor !== 'undefined') {
        console.log("\n=== MAIN EXTRACTOR TEST ===");
        try {
            const contactData = window.extractor.extractContactData();
            console.log("📱 Contact data via main extractor:", contactData);
        } catch (error) {
            console.error("❌ Main extractor test failed:", error);
        }
    }
    
    console.log("\n🏁 LOADING TEST COMPLETE");
}, 2000); // Wait 2 seconds for extension to fully load
