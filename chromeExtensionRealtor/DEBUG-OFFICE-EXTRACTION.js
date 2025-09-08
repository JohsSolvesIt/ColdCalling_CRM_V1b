// OFFICE EXTRACTION DEBUG - Paste this into Becky Prescott's page console
console.log("🔍 DEBUGGING OFFICE EXTRACTION");

if (typeof window.ContactExtractor !== 'undefined') {
    console.log("✅ ContactExtractor available, testing office extraction...");
    
    // Test office name extraction
    console.log("🏢 Testing office name extraction:");
    const officeName = window.ContactExtractor.extractCleanOfficeName();
    console.log("Office Name Result:", officeName);
    
    // Test office address extraction
    console.log("📍 Testing office address extraction:");
    const officeAddress = window.ContactExtractor.extractOfficeAddress();
    console.log("Office Address Result:", officeAddress);
    
    // Test office phone extraction
    console.log("📞 Testing office phone extraction:");
    const officePhone = window.ContactExtractor.extractOfficePhone();
    console.log("Office Phone Result:", officePhone);
    
    // Test full office data
    console.log("🏢 Testing full office data extraction:");
    const fullOfficeData = window.ContactExtractor.extractOfficeData();
    console.log("Full Office Data:", fullOfficeData);
    
    // Look for office-related text on page
    console.log("🔍 Searching page for office-related keywords:");
    const pageText = document.body.textContent;
    const officeKeywords = ['realty', 'real estate', 'properties', 'group', 'associates', 'masiello'];
    officeKeywords.forEach(keyword => {
        const regex = new RegExp(`[^\\n]*${keyword}[^\\n]*`, 'gi');
        const matches = pageText.match(regex);
        if (matches) {
            console.log(`Found "${keyword}":`, matches.slice(0, 3));
        }
    });
    
} else {
    console.log("❌ ContactExtractor not available");
}
