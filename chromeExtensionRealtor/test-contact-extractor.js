/**
 * Quick test to verify ContactExtractor functionality
 * Run this in browser console after extension loads
 */

console.log('🧪 Testing ContactExtractor Module...');

// Check if ContactExtractor is loaded
if (typeof window.ContactExtractor !== 'undefined') {
    console.log('✅ ContactExtractor module is available');
    
    try {
        // Test phone extraction
        console.log('\n📞 Testing phone extraction...');
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log('Phone result:', phone);
        
        // Test email extraction
        console.log('\n📧 Testing email extraction...');
        const email = window.ContactExtractor.extractCleanEmail();
        console.log('Email result:', email);
        
        // Test office data extraction
        console.log('\n🏢 Testing office data extraction...');
        const office = window.ContactExtractor.extractOfficeData();
        console.log('Office result:', office);
        
        // Summary
        console.log('\n📊 EXTRACTION SUMMARY:');
        console.log('Phone:', phone || 'Not found');
        console.log('Email:', email || 'Not found');
        console.log('Office:', office);
        
        if (phone !== 'Not found' || email !== 'Not found') {
            console.log('🎯 SUCCESS: ContactExtractor is working!');
        } else {
            console.log('⚠️ WARNING: No data extracted - check page content');
        }
        
    } catch (error) {
        console.error('❌ Error testing ContactExtractor:', error);
    }
    
} else {
    console.error('❌ ContactExtractor module is NOT available');
    console.log('Extension may not be loaded or script order is wrong');
}

// Also test if the content script's extractContactData would work
if (typeof window.extractor !== 'undefined' && window.extractor.extractContactData) {
    console.log('\n🧪 Testing content script extractContactData...');
    try {
        const result = window.extractor.extractContactData();
        console.log('Content script result:', result);
    } catch (error) {
        console.error('❌ Content script error:', error);
    }
} else {
    console.log('ℹ️ Content script extractor not available for testing');
}
