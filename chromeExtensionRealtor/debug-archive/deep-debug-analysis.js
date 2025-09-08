// DEEP DEBUGGING SCRIPT - Run this in the browser console on the Realtor.com page
console.log('🔍 DEEP ANALYSIS OF REALTOR.COM PAGE STRUCTURE');

// Find all text containing the names we expect
const expectedNames = ['Belinda Gillis', 'Robert Bruce', 'Felicia', 'Jen'];
const nameAnalysis = {};

expectedNames.forEach(name => {
    console.log(`\n=== ANALYZING: ${name} ===`);
    
    // Find all elements containing this name
    const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes(name)
    );
    
    console.log(`Found ${elements.length} elements containing "${name}"`);
    
    elements.forEach((el, i) => {
        console.log(`\nElement ${i + 1}:`);
        console.log(`Tag: ${el.tagName}`);
        console.log(`Classes: ${el.className}`);
        console.log(`Text content: "${el.textContent.substring(0, 300)}..."`);
        console.log(`Inner HTML preview: "${el.innerHTML.substring(0, 200)}..."`);
        
        // Check parent structure
        if (el.parentElement) {
            console.log(`Parent tag: ${el.parentElement.tagName}`);
            console.log(`Parent classes: ${el.parentElement.className}`);
            console.log(`Parent text: "${el.parentElement.textContent.substring(0, 400)}..."`);
        }
        
        // Look for the actual review text we expect
        const expectedTexts = {
            'Belinda Gillis': 'We\'ve worked with BJ on three real estate transactions',
            'Robert Bruce': 'We were referred to B.J. by our parents',
            'Felicia': 'BJ & his staff consistently provide exceptional service',
            'Jen': 'I had the pleasure of working with BJ Ward'
        };
        
        const expectedText = expectedTexts[name];
        if (expectedText) {
            const hasExpectedText = el.textContent.includes(expectedText) || 
                                  (el.parentElement && el.parentElement.textContent.includes(expectedText));
            console.log(`Contains expected review text: ${hasExpectedText ? '✅ YES' : '❌ NO'}`);
            
            if (hasExpectedText) {
                console.log(`🎯 FOUND THE CORRECT ELEMENT FOR ${name}!`);
                console.log(`Full text: "${el.textContent}"`);
            }
        }
    });
    
    nameAnalysis[name] = elements.length;
});

// Look for the pattern "Professionalism & communication" and see why it's being extracted
console.log('\n=== ANALYZING "Professionalism & communication" ===');
const profElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && el.textContent.includes('Professionalism & communication')
);

console.log(`Found ${profElements.length} elements with "Professionalism & communication"`);
profElements.forEach((el, i) => {
    console.log(`\nProf Element ${i + 1}:`);
    console.log(`Tag: ${el.tagName}`);
    console.log(`Classes: ${el.className}`);
    console.log(`Text: "${el.textContent}"`);
    console.log(`Parent text: "${el.parentElement?.textContent?.substring(0, 200)}..."`);
});

// Check the actual DOM structure around verified reviews
console.log('\n=== VERIFIED REVIEW STRUCTURE ANALYSIS ===');
const verifiedElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && el.textContent.includes('Verified review')
);

console.log(`Found ${verifiedElements.length} elements with "Verified review"`);
verifiedElements.forEach((el, i) => {
    console.log(`\nVerified Element ${i + 1}:`);
    console.log(`Tag: ${el.tagName}`);
    console.log(`Classes: ${el.className}`);
    console.log(`Text length: ${el.textContent.length}`);
    
    // Show the structure around this element
    console.log(`Previous sibling:`, el.previousElementSibling?.textContent?.substring(0, 100));
    console.log(`Next sibling:`, el.nextElementSibling?.textContent?.substring(0, 100));
    console.log(`Parent:`, el.parentElement?.tagName, el.parentElement?.className);
    
    // Show all child elements
    if (el.children.length > 0) {
        console.log(`Children (${el.children.length}):`);
        Array.from(el.children).forEach((child, ci) => {
            console.log(`  ${ci + 1}. ${child.tagName}.${child.className}: "${child.textContent.substring(0, 150)}..."`);
        });
    }
});

console.log('\n=== PAGE TEXT SAMPLE ===');
const pageText = document.body.textContent;
const belindaIndex = pageText.indexOf('Belinda Gillis');
if (belindaIndex !== -1) {
    console.log(`Text around Belinda Gillis (${belindaIndex}):`);
    console.log(pageText.substring(Math.max(0, belindaIndex - 200), belindaIndex + 500));
}

console.log('\n=== ANALYSIS COMPLETE ===');
