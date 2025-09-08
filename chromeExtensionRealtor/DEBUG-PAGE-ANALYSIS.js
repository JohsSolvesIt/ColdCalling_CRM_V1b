// PAGE ANALYSIS FOR OFFICE INFO - Paste this into Becky Prescott's page console
console.log("🔍 ANALYZING PAGE FOR OFFICE INFORMATION");

// Look for all elements that might contain office information
const potentialOfficeElements = [
    ...document.querySelectorAll('[class*="office"]'),
    ...document.querySelectorAll('[class*="brokerage"]'),
    ...document.querySelectorAll('[class*="company"]'),
    ...document.querySelectorAll('[data-testid*="office"]'),
    ...document.querySelectorAll('[data-testid*="company"]'),
    ...document.querySelectorAll('*')
].filter(el => {
    const text = el.textContent || '';
    const lowerText = text.toLowerCase();
    return lowerText.includes('masiello') || 
           lowerText.includes('realty') || 
           lowerText.includes('real estate') ||
           lowerText.includes('group') ||
           lowerText.includes('properties');
});

console.log(`Found ${potentialOfficeElements.length} potential office elements:`);

potentialOfficeElements.slice(0, 10).forEach((el, index) => {
    console.log(`${index + 1}. Tag: ${el.tagName}, Class: ${el.className}, Text: "${el.textContent?.trim().substring(0, 100)}"`);
});

// Look for specific Masiello references since we know that's in the website URL
console.log("\n🔍 Looking for 'Masiello' references:");
const masielloElements = [...document.querySelectorAll('*')].filter(el => 
    el.textContent && el.textContent.toLowerCase().includes('masiello')
);

masielloElements.forEach((el, index) => {
    console.log(`Masiello ${index + 1}: ${el.tagName}.${el.className} - "${el.textContent.trim()}"`);
});

// Check if there's a specific pattern in the page structure
console.log("\n🔍 Looking for address patterns:");
const addressRegex = /\d+\s+[A-Za-z\s,]+\s+[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}/g;
const addressMatches = document.body.textContent.match(addressRegex);
if (addressMatches) {
    console.log("Found address patterns:", addressMatches);
} else {
    console.log("No address patterns found");
}
