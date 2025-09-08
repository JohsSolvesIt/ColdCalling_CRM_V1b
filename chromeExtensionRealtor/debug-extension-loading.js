/**
 * EXTENSION LOADING DIAGNOSTIC - Check if extension scripts are injected
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🔧 EXTENSION LOADING DIAGNOSTIC');
console.log('===============================');

// Check for any extension-related scripts
console.log('🔍 Checking for injected scripts:');
const scripts = document.querySelectorAll('script');
let extensionScripts = [];

scripts.forEach((script, index) => {
    if (script.src && (script.src.includes('chrome-extension') || script.src.includes('moz-extension'))) {
        extensionScripts.push(script.src);
        console.log(`✅ Extension script ${index + 1}: ${script.src}`);
    }
});

if (extensionScripts.length === 0) {
    console.log('❌ No extension scripts found in page');
} else {
    console.log(`✅ Found ${extensionScripts.length} extension scripts`);
}

// Check for global log object (should be loaded by logging-utils.js)
console.log('\n🔍 Checking for global objects:');
const globalChecks = ['log', 'window.log', 'console'];
globalChecks.forEach(check => {
    try {
        const obj = eval(check);
        console.log(`✅ ${check}: ${typeof obj}`);
    } catch (e) {
        console.log(`❌ ${check}: not available`);
    }
});

// Check document readiness
console.log('\n🔍 Page state:');
console.log(`Document ready state: ${document.readyState}`);
console.log(`URL: ${window.location.href}`);
console.log(`Domain: ${window.location.hostname}`);

// Check if we're on the right domain for the extension
const isRealtorDomain = window.location.hostname.includes('realtor.com');
console.log(`Is realtor.com domain: ${isRealtorDomain ? '✅' : '❌'}`);

// Try to manually trigger any auto-extraction
console.log('\n🧪 Looking for auto-extraction triggers:');
if (window.location.href.includes('autoExtract=true')) {
    console.log('✅ Auto-extraction URL parameter found');
} else {
    console.log('❌ Auto-extraction URL parameter not found');
}

console.log('\n✅ Diagnostic complete');
console.log('\n💡 Next steps:');
console.log('1. If no extension scripts found: Extension not loading');
console.log('2. If scripts found but no globals: Script execution failed');
console.log('3. Check Chrome Developer Tools > Sources > Content Scripts');
