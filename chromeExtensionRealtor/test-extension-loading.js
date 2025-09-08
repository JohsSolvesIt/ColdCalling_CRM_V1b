// Test if extension is actually loading and running
console.log("🧪 EXTENSION LOADING TEST SCRIPT");

// Check if content script has loaded
if (typeof window.RealtorDataExtractor !== 'undefined') {
    console.log("✅ RealtorDataExtractor class available");
} else {
    console.log("❌ RealtorDataExtractor class NOT available");
}

// Check if ContactExtractor module loaded
if (typeof window.ContactExtractor !== 'undefined') {
    console.log("✅ ContactExtractor module available");
    
    // Test contact extraction directly
    try {
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log("📞 ContactExtractor.extractCleanPhone() result:", phone);
    } catch (error) {
        console.log("❌ ContactExtractor.extractCleanPhone() error:", error);
    }
} else {
    console.log("❌ ContactExtractor module NOT available");
}

// Check if content script instance exists
if (typeof window.realtorExtractorInstance !== 'undefined') {
    console.log("✅ Content script instance exists");
} else {
    console.log("❌ Content script instance NOT exists");
}

// Check if extension button exists
const button = document.getElementById('realtor-extractor-btn');
if (button) {
    console.log("✅ Extension button found in DOM");
} else {
    console.log("❌ Extension button NOT found in DOM");
}

console.log("🏁 Extension loading test complete");
