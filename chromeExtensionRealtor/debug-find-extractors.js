/**
 * FIND ALL EXTRACTORS - Comprehensive search for any extractor objects
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🔍 COMPREHENSIVE EXTRACTOR SEARCH');
console.log('=================================');

// Check all possible extractor names
const extractorNames = [
    'extractor', 'realtorExtractor', 'ContactExtractor', 'AgentExtractor',
    'BioExtractor', 'ReviewsExtractor', 'PhotoExtractor', 'ListingsExtractor',
    'RealtorDataExtractor', 'dataExtractor', 'mainExtractor'
];

console.log('🔍 Checking specific extractor names:');
extractorNames.forEach(name => {
    const obj = window[name];
    if (obj) {
        console.log(`✅ ${name}:`, typeof obj, obj.constructor?.name);
        
        // Check if it has contact extraction methods
        const methods = ['extractContactData', 'extractCleanPhone', 'extractCleanEmail'];
        methods.forEach(method => {
            if (typeof obj[method] === 'function') {
                console.log(`  - ${method}: ✅`);
            }
        });
    } else {
        console.log(`❌ ${name}: not found`);
    }
});

// Search window object for anything that looks like an extractor
console.log('\n🔍 Searching window for extractor-like objects:');
const windowKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('extract') || 
    key.toLowerCase().includes('realtor') ||
    key.toLowerCase().includes('agent') ||
    key.toLowerCase().includes('contact')
);

if (windowKeys.length > 0) {
    console.log('Found potential extractor objects:', windowKeys);
    windowKeys.forEach(key => {
        const obj = window[key];
        console.log(`${key}:`, typeof obj, obj?.constructor?.name);
    });
} else {
    console.log('No extractor-like objects found in window');
}

// Check for any objects with extractContactData method
console.log('\n🔍 Searching for objects with extractContactData method:');
let foundExtractors = [];
for (const key in window) {
    try {
        const obj = window[key];
        if (obj && typeof obj === 'object' && typeof obj.extractContactData === 'function') {
            foundExtractors.push(key);
            console.log(`✅ Found extractContactData in: ${key}`);
        }
    } catch (e) {
        // Skip properties that can't be accessed
    }
}

if (foundExtractors.length === 0) {
    console.log('❌ No objects with extractContactData method found');
}

console.log('\n✅ Search complete');
