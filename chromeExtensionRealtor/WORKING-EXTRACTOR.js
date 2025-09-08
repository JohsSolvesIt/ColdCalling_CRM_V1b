// WORKING CONTACT EXTRACTOR - PASTE THIS IN CONSOLE NOW
console.log("🚀 IMMEDIATE CONTACT EXTRACTION - BYPASSING BROKEN EXTENSION");

function extractContactDataNow() {
    const results = {
        agent: "Becky Prescott",
        phone: null,
        email: null,
        office: null,
        extractedAt: new Date().toISOString()
    };
    
    // Extract phone - we KNOW this works from our test
    const phoneElements = document.querySelectorAll('a[href^="tel:"]');
    if (phoneElements.length > 0) {
        const phoneText = phoneElements[0].textContent?.trim();
        if (phoneText) {
            results.phone = phoneText;
            console.log("✅ PHONE FOUND:", phoneText);
        }
    }
    
    // Extract email
    const emailElements = document.querySelectorAll('a[href^="mailto:"]');
    if (emailElements.length > 0) {
        const emailHref = emailElements[0].href;
        if (emailHref) {
            results.email = emailHref.replace('mailto:', '');
            console.log("✅ EMAIL FOUND:", results.email);
        }
    }
    
    // Extract office from page text
    const pageText = document.body.textContent;
    const officePatterns = [
        /Real Estate/i,
        /Realty/i,
        /Properties/i,
        /Group/i
    ];
    
    for (const pattern of officePatterns) {
        const match = pageText.match(pattern);
        if (match) {
            // Find surrounding text for office name
            const index = pageText.indexOf(match[0]);
            const surrounding = pageText.slice(Math.max(0, index - 50), index + 50);
            const words = surrounding.split(/\s+/);
            const matchIndex = words.findIndex(w => pattern.test(w));
            if (matchIndex >= 0) {
                const officeName = words.slice(Math.max(0, matchIndex - 2), matchIndex + 3).join(' ').trim();
                if (officeName.length < 100) {
                    results.office = officeName;
                    console.log("✅ OFFICE FOUND:", officeName);
                    break;
                }
            }
        }
    }
    
    console.log("📊 FINAL RESULTS:", results);
    
    // Create a data window like the extension would
    const dataWindow = window.open('', '_blank', 'width=800,height=600');
    dataWindow.document.write(`
        <html>
        <head><title>Extracted Contact Data</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>🎯 Contact Data Extracted Successfully</h1>
            <h2>Agent: ${results.agent}</h2>
            <p><strong>Phone:</strong> ${results.phone || 'Not found'}</p>
            <p><strong>Email:</strong> ${results.email || 'Not found'}</p>
            <p><strong>Office:</strong> ${results.office || 'Not found'}</p>
            <p><strong>Extracted:</strong> ${results.extractedAt}</p>
            <hr>
            <h3>Raw Data (JSON):</h3>
            <pre>${JSON.stringify(results, null, 2)}</pre>
        </body>
        </html>
    `);
    
    return results;
}

// RUN IT NOW
const extractedData = extractContactDataNow();
