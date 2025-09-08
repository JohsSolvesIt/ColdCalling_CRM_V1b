// FINAL VERIFICATION TEST SCRIPT
console.log("🧪 FINAL EXTENSION TEST STARTING...");

// Test 1: Check if content script loaded
setTimeout(() => {
    console.log("=== EXTENSION LOADING VERIFICATION ===");
    
    // Check main content script
    if (typeof window.RealtorDataExtractor !== 'undefined') {
        console.log("✅ RealtorDataExtractor class loaded successfully");
    } else {
        console.log("❌ RealtorDataExtractor class NOT loaded");
    }
    
    // Check if instance was created
    if (typeof window.extractor !== 'undefined') {
        console.log("✅ RealtorDataExtractor instance created successfully");
    } else {
        console.log("❌ RealtorDataExtractor instance NOT created");
    }
    
    // Check extraction button
    const button = document.getElementById('realtor-extractor-btn');
    if (button) {
        console.log("✅ Extraction button found in DOM");
    } else {
        console.log("❌ Extraction button NOT found in DOM");
    }
    
    // Test ContactExtractor
    if (typeof window.ContactExtractor !== 'undefined') {
        console.log("✅ ContactExtractor module available");
        try {
            const phone = window.ContactExtractor.extractCleanPhone();
            console.log("📞 Phone extraction result:", phone);
        } catch (error) {
            console.log("❌ Phone extraction error:", error.message);
        }
    } else {
        console.log("❌ ContactExtractor module NOT available");
    }
    
    console.log("=== VERIFICATION COMPLETE ===");
}, 2000);

console.log("🏁 Final test script loaded - results in 2 seconds...");
