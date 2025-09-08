/**
 * Enhanced Contact Debugging for Realtor.com
 * Run this on a realtor.com agent page to understand what contact info is available
 */

function debugRealtorContactInfo() {
    console.log('🔍 REALTOR.COM CONTACT DEBUG');
    console.log('============================');
    
    const pageText = document.body.textContent;
    
    // 1. Check for obvious phone patterns
    console.log('1. PHONE NUMBER ANALYSIS:');
    const phonePatterns = [
        /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,
        /\d{3}[-\s]\d{3}[-\s]\d{4}/g,
        /\d{3}\.\d{3}\.\d{4}/g
    ];
    
    phonePatterns.forEach((pattern, i) => {
        const matches = pageText.match(pattern);
        console.log(`   Pattern ${i+1}:`, matches ? matches.slice(0, 3) : 'No matches');
    });
    
    // 2. Check for contact buttons
    console.log('2. CONTACT INTERACTION ELEMENTS:');
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    let contactButtons = [];
    
    buttons.forEach(btn => {
        const text = (btn.textContent || '').toLowerCase();
        const href = btn.href || '';
        if (text.includes('call') || text.includes('phone') || text.includes('contact') || 
            text.includes('email') || text.includes('message') || href.startsWith('tel:') || href.startsWith('mailto:')) {
            contactButtons.push({
                text: btn.textContent?.trim().slice(0, 50),
                href: href,
                class: btn.className,
                id: btn.id,
                'data-testid': btn.getAttribute('data-testid')
            });
        }
    });
    
    console.log(`   Found ${contactButtons.length} contact buttons:`);
    contactButtons.slice(0, 5).forEach((btn, i) => {
        console.log(`   ${i+1}.`, btn);
    });
    
    // 3. Check for email patterns
    console.log('3. EMAIL ANALYSIS:');
    const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    const emails = pageText.match(emailPattern);
    console.log('   Found emails:', emails ? emails.filter(e => !e.includes('realtor.com')).slice(0, 3) : 'None');
    
    // 4. Check for office/brokerage info
    console.log('4. OFFICE/BROKERAGE ANALYSIS:');
    const realEstateKeywords = ['realty', 'real estate', 'properties', 'group', 'associates', 're/max', 'coldwell banker', 'century'];
    let officeMatches = [];
    
    realEstateKeywords.forEach(keyword => {
        const regex = new RegExp(`[A-Z][A-Za-z\\s&,.-]*${keyword}[A-Za-z\\s&,.-]*`, 'gi');
        const matches = pageText.match(regex);
        if (matches) {
            officeMatches.push(...matches.slice(0, 2));
        }
    });
    
    console.log('   Potential office names:', [...new Set(officeMatches)].slice(0, 3));
    
    // 5. Check for hidden/modal content
    console.log('5. HIDDEN CONTENT ANALYSIS:');
    const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden, [hidden], [aria-hidden="true"]');
    let hiddenContactCount = 0;
    
    hiddenElements.forEach(el => {
        const text = (el.textContent || '').toLowerCase();
        if ((text.includes('phone') || text.includes('email') || text.includes('contact')) && text.length > 10) {
            hiddenContactCount++;
        }
    });
    
    console.log(`   Hidden elements with contact keywords: ${hiddenContactCount}`);
    
    // 6. Check for data attributes
    console.log('6. DATA ATTRIBUTE ANALYSIS:');
    const elementsWithData = document.querySelectorAll('[data-phone], [data-email], [data-contact], [data-tel], [data-mailto]');
    console.log(`   Elements with contact data attributes: ${elementsWithData.length}`);
    
    // 7. Check agent name context
    console.log('7. AGENT CONTEXT ANALYSIS:');
    const agentNameInPage = pageText.includes('Becky Prescott');
    console.log(`   Agent name "Becky Prescott" found: ${agentNameInPage ? '✅' : '❌'}`);
    
    if (agentNameInPage) {
        const nameIndex = pageText.indexOf('Becky Prescott');
        const contextStart = Math.max(0, nameIndex - 200);
        const contextEnd = Math.min(pageText.length, nameIndex + 300);
        const context = pageText.substring(contextStart, contextEnd);
        
        console.log('   Context around agent name:');
        console.log('   "' + context.replace(/\s+/g, ' ').trim() + '"');
        
        // Look for phone/email near agent name
        const phoneNearName = context.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        const emailNearName = context.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
        
        console.log(`   Phone near agent name: ${phoneNearName ? phoneNearName[0] : 'None'}`);
        console.log(`   Email near agent name: ${emailNearName ? emailNearName[0] : 'None'}`);
    }
    
    console.log('============================');
    console.log('Debug complete!');
}

// Run the debug
debugRealtorContactInfo();
