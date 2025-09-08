// EXTENSION LOADING DIAGNOSTIC
console.log("🚨 EXTENSION LOADING DIAGNOSTIC");

// Check if this is a realtor.com page
const isRealtorPage = window.location.hostname.includes('realtor.com');
console.log("📍 Current hostname:", window.location.hostname);
console.log("📍 Is realtor.com page:", isRealtorPage);

if (!isRealtorPage) {
    console.log("❌ This diagnostic should be run on a realtor.com page");
    console.log("❌ Current URL:", window.location.href);
    console.log("❌ Extension content scripts only inject on realtor.com pages");
} else {
    console.log("✅ Running on correct domain");
    
    // Check if ANY extension content is present
    const scripts = Array.from(document.scripts);
    const extensionScripts = scripts.filter(script => 
        script.src && script.src.includes('chrome-extension')
    );
    
    console.log("📊 Total scripts on page:", scripts.length);
    console.log("📊 Extension scripts found:", extensionScripts.length);
    
    if (extensionScripts.length > 0) {
        console.log("✅ Extension scripts detected:");
        extensionScripts.forEach(script => console.log("  →", script.src));
    } else {
        console.log("❌ No extension scripts found - extension not injecting");
    }
    
    // Check for our specific globals
    const globals = [
        'log', 'ContactExtractor', 'extractor', 'RealtorDataExtractor'
    ];
    
    console.log("🔍 Checking for extension globals:");
    globals.forEach(global => {
        const exists = typeof window[global] !== 'undefined';
        console.log(`  ${exists ? '✅' : '❌'} window.${global}:`, exists);
    });
}

// Instructions for user
console.log("\n📋 EXTENSION TROUBLESHOOTING STEPS:");
console.log("1. Go to chrome://extensions/");
console.log("2. Find 'Realtor Data Extractor'");
console.log("3. Check if it's ENABLED (toggle should be blue)");
console.log("4. Click the refresh/reload button ↻");
console.log("5. Check for any ERROR messages in red");
console.log("6. Reload this realtor.com page");
console.log("7. Run this diagnostic again");
