// ISOLATED CONTACTEXTRACTOR TEST
console.log("🧪 Testing ContactExtractor in isolation...");

// Try to load just the essential dependencies manually
try {
    // First load logging utils manually
    const script1 = document.createElement('script');
    script1.textContent = `
        // Safety check for log object
        const log = window.log || { 
          info: console.log, 
          debug: console.log, 
          warn: console.warn, 
          error: console.error 
        };
        window.log = log;
        console.log("✅ Log object created");
    `;
    document.head.appendChild(script1);
    
    // Wait a moment then test
    setTimeout(() => {
        console.log("🔍 Testing log availability:", typeof window.log);
        
        // Now try to manually extract phone data
        console.log("🔍 Manual phone search:");
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        console.log("Tel links found:", phoneLinks.length);
        
        phoneLinks.forEach((link, i) => {
            const cleanPhone = link.href.replace('tel:', '').replace(/\D/g, '');
            console.log(`  ${i+1}. Raw: ${link.href} | Clean: ${cleanPhone} | Text: ${link.textContent?.trim()}`);
        });
        
        // Check for phone patterns in page text
        const pageText = document.body.textContent;
        const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phoneMatches = pageText.match(phonePattern);
        console.log("Phone patterns in text:", phoneMatches?.slice(0, 5)); // Show first 5
        
    }, 100);
    
} catch (error) {
    console.error("❌ Isolation test failed:", error);
}
