// URGENT FIX TEST: Test if ContactExtractor static methods work
console.log('🧪 TESTING CONTACTEXTRACTOR STATIC METHODS...');

// Wait for page to load
setTimeout(() => {
    if (typeof window.ContactExtractor !== 'undefined') {
        console.log('✅ ContactExtractor available');
        
        // Test static method calls (the correct way)
        console.log('📞 Testing static extractCleanPhone()...');
        const phone = window.ContactExtractor.extractCleanPhone();
        console.log('📞 Phone result:', phone);
        
        console.log('📧 Testing static extractCleanEmail()...');
        const email = window.ContactExtractor.extractCleanEmail();
        console.log('📧 Email result:', email);
        
        console.log('🏢 Testing static extractOfficeData()...');
        const office = window.ContactExtractor.extractOfficeData();
        console.log('🏢 Office result:', office);
        
        // Compare with what the extension was trying before
        console.log('🔍 COMPARISON - What extension should return:');
        const contact = {};
        contact.phone = window.ContactExtractor.extractCleanPhone();
        contact.email = window.ContactExtractor.extractCleanEmail();
        const officeData = window.ContactExtractor.extractOfficeData();
        contact.officePhone = officeData.phone;
        contact.officeName = officeData.name;
        contact.officeAddress = officeData.address;
        
        console.log('🎯 FINAL CONTACT DATA:', contact);
        
    } else {
        console.error('❌ ContactExtractor NOT available');
    }
}, 1000);
