/**
 * TEST MAIN EXTRACTION - Check if content.js is using ContactExtractor
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🧪 TESTING MAIN EXTRACTION FLOW');
console.log('===============================');

// Test if content.js extractor is available
if (typeof window.extractor !== 'undefined' && window.extractor) {
    console.log('✅ Main extractor (content.js) found');
    
    // Test if it has extractContactData method
    if (typeof window.extractor.extractContactData === 'function') {
        console.log('✅ extractContactData method found');
        
        try {
            console.log('🧪 Testing extractContactData()...');
            const result = window.extractor.extractContactData();
            console.log('📱 Result from main extractor:', result);
        } catch (error) {
            console.error('❌ Error calling extractContactData:', error.message);
        }
    } else {
        console.log('❌ extractContactData method not found');
    }
} else {
    console.log('❌ Main extractor not found');
}

// Compare with direct ContactExtractor call
console.log('\n🆚 COMPARISON:');
if (typeof window.ContactExtractor !== 'undefined') {
    try {
        const directResult = window.ContactExtractor.extractContactData();
        console.log('📱 Direct ContactExtractor result:', directResult);
    } catch (error) {
        console.error('❌ Direct ContactExtractor error:', error.message);
    }
} else {
    console.log('❌ ContactExtractor not available');
}

console.log('\n✅ Test complete');
