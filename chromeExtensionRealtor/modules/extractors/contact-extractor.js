/**
 * Contact Extractor Module - Version 1.0
 * Handles extraction of contact information including phone, email, website, and office data
 * Part of Phase 2: Data Extraction Modules
 * 
 * Dependencies: logging-utils.js
 * Lines extracted: ~400 (from original content.js)
 */

// Use global log object from logging-utils.js

class ContactExtractor {
  /**
   * Extract comprehensive office data with enhanced strategies
   * @returns {Object} Office information including name, address, and phone
   */
  static extractOfficeData() {
    const office = {};
    
    // Office/Brokerage name - extract clean office name only
    office.name = ContactExtractor.extractCleanOfficeName();

    // Office address with enhanced patterns
    office.address = ContactExtractor.extractOfficeAddress();

    // Office phone with enhanced patterns
    office.phone = ContactExtractor.extractOfficePhone();

        log.debug('🏢 Office data extracted:', office);
    return office;
  }

  /**
   * Extract office address with multiple strategies
   * @returns {string|null} Office address or null
   */
  static extractOfficeAddress() {
    // Strategy 1: Look for address patterns in page text
    const pageText = document.body.textContent;
    
    // Common address patterns
    const addressPatterns = [
      /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/g,
      /\d+\s+[A-Za-z\s,]+\s+[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}/g
    ];
    
    for (const pattern of addressPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanAddress = match.trim();
          if (ContactExtractor.isValidAddress(cleanAddress)) {
            log.debug(`✅ Found office address: ${cleanAddress}`);
            return cleanAddress;
          }
        }
      }
    }
    
    // Strategy 2: Enhanced selector search
    const addressSelectors = [
      '[data-testid*="office-address"]',
      '[data-testid*="address"]',
      '[class*="office-address"]',
      '[class*="address"]',
      '[id*="address"]'
    ];
    
    for (const selector of addressSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const address = ContactExtractor.extractSpecificText(element, 200);
        if (address && ContactExtractor.isValidAddress(address)) {
          log.debug(`✅ Found office address in element: ${address}`);
          return address;
        }
      }
    }
    
    log.debug('❌ No office address found');
    return null;
  }

  /**
   * Validate if a string is a legitimate address
   * @param {string} address - The address to validate
   * @returns {boolean} True if valid address
   */
  static isValidAddress(address) {
    if (!address || address.length < 10) return false;
    
    // Must contain typical address components
    const hasNumber = /\d/.test(address);
    const hasStreetType = /(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|cir|court|ct|place|pl)/i.test(address);
    const hasStateZip = /[A-Z]{2}\s+\d{5}/i.test(address);
    
    return hasNumber && (hasStreetType || hasStateZip);
  }

  /**
   * Extract and clean office/brokerage name with robust patterns
   * @returns {string|null} Clean office name or null
   */
  static extractCleanOfficeName() {
    const pageText = document.body.textContent;
    
    // Strategy 1: Check URL for office/company names first (most reliable)
    const currentUrl = window.location.href;
    log.debug(`🔍 Checking URL for office patterns: ${currentUrl}`);
    
    // Extract company names from URL patterns like "beckyprescott.masiello.com"
    const urlMatch = currentUrl.match(/\/\/(?:www\.)?([a-zA-Z]+)\.([a-zA-Z]+)\.com/);
    if (urlMatch) {
      const possibleCompany = urlMatch[2]; // "masiello" from the URL
      if (possibleCompany && possibleCompany.length > 3) {
        // Capitalize first letter
        const capitalizedCompany = possibleCompany.charAt(0).toUpperCase() + possibleCompany.slice(1);
        log.debug(`✅ Found office name from URL: ${capitalizedCompany}`);
        return capitalizedCompany;
      }
    }
    
    // Strategy 2: Look for "Masiello" specifically and other company names in text
    const specificCompanyPatterns = [
      /\bMasiello\b/gi,
      /\bBerkshire\s+Hathaway\b/gi,
      /\bColdwell\s+Banker\b/gi,
      /\bKeller\s+Williams\b/gi,
      /\bRE\/MAX\b/gi,
      /\bCentury\s+21\b/gi,
      /\bSotheby's\b/gi,
      /\bCompass\b/gi,
      /\b([A-Z][a-z]+)\s+(?:Real\s+Estate|Realty|Properties|Group|Associates)\b/gi,
      /\b([A-Z][a-z]{3,})\s+(?:Homes|Residential|Brokers|Brokerage)\b/gi
    ];
    
    for (const pattern of specificCompanyPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanName = match.trim();
          log.debug(`🔍 Testing specific company pattern: "${cleanName}"`);
          if (cleanName.length > 3 && cleanName.length < 100 && 
              !ContactExtractor.containsMixedContent(cleanName)) {
            log.debug(`✅ Found office name via specific pattern: ${cleanName}`);
            return cleanName;
          }
        }
      }
    }
    
    // Strategy 3: Look for common real estate brokerage patterns
    const brokeragePatterns = [
      // Major franchise patterns
      /RE\/MAX[^,.\n]{0,30}/gi,
      /Coldwell Banker[^,.\n]{0,30}/gi,
      /Century 21[^,.\n]{0,30}/gi,
      /Keller Williams[^,.\n]{0,30}/gi,
      /Berkshire Hathaway[^,.\n]{0,30}/gi,
      /Sotheby's[^,.\n]{0,30}/gi,
      /Compass[^,.\n]{0,30}/gi,
      
      // Generic real estate company patterns
      /([A-Z][A-Za-z\s&]+(?:Realty|Real Estate|Properties|Group|Associates|Team|Homes|Residential|Property|Realtors))/g,
      /([A-Z][A-Za-z\s&]+(?:Real Estate|Realty)[^,.\n]{0,20})/g
    ];
    
    for (const pattern of brokeragePatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanName = match.trim();
          if (cleanName.length > 3 && cleanName.length < 100 && 
              !ContactExtractor.containsMixedContent(cleanName) &&
              ContactExtractor.isValidOfficeName(cleanName)) {
            log.debug(`✅ Found office name via pattern: ${cleanName}`);
            return cleanName;
          }
        }
      }
    }
    
    // Strategy 4: Look in structured elements with broader selectors
    const officeSelectors = [
      '[data-testid*="office"]',
      '[data-testid*="brokerage"]', 
      '[data-testid*="company"]',
      '[class*="office"]',
      '[class*="brokerage"]',
      '[class*="company"]',
      '[id*="office"]',
      '[id*="brokerage"]'
    ];
    
    for (const selector of officeSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const name = ContactExtractor.extractSpecificText(element, 100);
        if (name && name.length > 3 && name.length < 100 && 
            !ContactExtractor.containsMixedContent(name) &&
            ContactExtractor.isValidOfficeName(name)) {
          log.debug(`✅ Found office name in element: ${name}`);
          return name;
        }
      }
    }
    
    // Strategy 5: Search for "powered by" or "listed by" patterns
    const poweredByMatch = pageText.match(/(?:powered by|listed by|brokered by|courtesy of)\s*:?\s*([A-Z][A-Za-z\s&,.-]{5,50})/i);
    if (poweredByMatch) {
      const name = poweredByMatch[1].trim();
      if (ContactExtractor.isValidOfficeName(name)) {
        log.debug(`✅ Found office name via "powered by": ${name}`);
        return name;
      }
    }
    
    log.debug('❌ No office name found');
    return null;
  }

  /**
   * Validate if a string is a legitimate office name
   * @param {string} name - The name to validate
   * @returns {boolean} True if valid office name
   */
  static isValidOfficeName(name) {
    if (!name || name.length < 3) return false;
    
    // Allow specific known company names even without real estate keywords
    const knownCompanies = [
      'masiello', 'compass', 'sotheby', 'berkshire', 'hathaway',
      'coldwell', 'banker', 'keller', 'williams', 'century',
      're/max', 'remax'
    ];
    
    const lowerName = name.toLowerCase();
    const isKnownCompany = knownCompanies.some(company => lowerName.includes(company));
    
    if (isKnownCompany) {
      log.debug(`✅ Validated known company: ${name}`);
      return true;
    }
    
    // Must contain real estate keywords for other companies
    const realEstateKeywords = [
      'realty', 'real estate', 'properties', 'group', 'associates', 'team',
      'homes', 'residential', 'property', 'realtors', 'brokers', 'brokerage'
    ];
    
    const hasRealEstateKeyword = realEstateKeywords.some(keyword => lowerName.includes(keyword));
    
    // Skip obvious non-office names
    const invalidKeywords = [
      'agent', 'realtor', 'broker', 'license', 'mls', 'contact', 'phone', 'email',
      'address', 'website', 'copyright', 'privacy', 'terms', 'login', 'search'
    ];
    
    const hasInvalidKeyword = invalidKeywords.some(keyword => lowerName.includes(keyword));
    
    return hasRealEstateKeyword && !hasInvalidKeyword;
  }

  /**
   * Extract comprehensive contact data
   * @returns {Object} Contact information including phone, email, and website
   */
  static extractContactData() {
    log.debug('📞 Looking for contact information...');
    const contact = {};
    
    // Phone numbers - enhanced extraction
    contact.phone = ContactExtractor.extractCleanPhone();
    contact.officePhone = ContactExtractor.extractOfficePhone();
    contact.mobilePhone = ContactExtractor.extractMobilePhone();

    // Email - enhanced extraction
    contact.email = ContactExtractor.extractCleanEmail();

    // Website - enhanced extraction
    contact.website = ContactExtractor.extractWebsiteUrl();

    log.debug('📱 Contact data found:', contact);
    return contact;
  }

  /**
   * Extract and clean primary phone number with modern realtor.com strategies
   * @returns {string|null} Clean phone number or null
   */
  static extractCleanPhone() {
    log.debug('📞 Looking for phone numbers with enhanced strategies...');
    
    // Strategy 1: Look for contact interaction buttons first (modern realtor.com pattern)
    const contactButtons = document.querySelectorAll('button, a, [role="button"], [tabindex]');
    for (const button of contactButtons) {
      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonHref = button.href || '';
      const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
      const dataPhone = button.getAttribute('data-phone') || button.getAttribute('data-tel') || '';
      
      // Check for phone buttons or tel: links
      if (buttonText.includes('call') || buttonText.includes('phone') || 
          ariaLabel.includes('call') || ariaLabel.includes('phone') ||
          buttonHref.startsWith('tel:')) {
        
        if (buttonHref.startsWith('tel:')) {
          const phone = buttonHref.replace('tel:', '').trim();
          const cleanPhone = ContactExtractor.cleanPhoneNumber(phone);
          if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
            log.debug(`✅ Found phone in tel: link: ${cleanPhone}`);
            return cleanPhone;
          }
        }
        
        // Look for phone numbers in button text, aria-label or data attributes
        for (const text of [buttonText, ariaLabel, dataPhone]) {
          if (text) {
            const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            if (phoneMatch) {
              const cleanPhone = ContactExtractor.cleanPhoneNumber(phoneMatch[0]);
              if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
                log.debug(`✅ Found phone in button: ${cleanPhone}`);
                return cleanPhone;
              }
            }
          }
        }
      }
    }
    
    // Strategy 2: Look near agent name for contact info (realtor.com often groups this)
    const pageText = document.body.textContent;
    const agentNamePatterns = [
      /becky\s+prescott/i,  // Current agent
      /[A-Z][a-z]+\s+[A-Z][a-z]+/g  // Generic agent name pattern
    ];
    
    for (const pattern of agentNamePatterns) {
      const nameMatches = pageText.match(pattern);
      if (nameMatches) {
        for (const nameMatch of nameMatches) {
          const nameIndex = pageText.indexOf(nameMatch);
          if (nameIndex !== -1) {
            // Look 500 characters around the agent name
            const contextStart = Math.max(0, nameIndex - 250);
            const contextEnd = Math.min(pageText.length, nameIndex + 250);
            const context = pageText.substring(contextStart, contextEnd);
            
            const phoneMatch = context.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            if (phoneMatch && ContactExtractor.isContextuallyValidPhone(phoneMatch[0], context)) {
              const cleanPhone = ContactExtractor.cleanPhoneNumber(phoneMatch[0]);
              if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
                log.debug(`✅ Found phone near agent name: ${cleanPhone}`);
                return cleanPhone;
              }
            }
          }
        }
      }
    }
    
    // Strategy 3: Enhanced phone pattern search with context awareness
    const phonePatterns = [
      /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,  // (323) 610-0231
      /\d{3}[-\s]\d{3}[-\s]\d{4}/g,     // 323-610-0231 or 323 610 0231
      /\d{3}\.\d{3}\.\d{4}/g,           // 323.610.0231
      /\+1\s*\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g, // +1 (323) 610-0231
      /\+1\s*\d{3}[-\s]\d{3}[-\s]\d{4}/g     // +1 323-610-0231
    ];
    
    for (const pattern of phonePatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip numbers that are clearly not phones (dates, prices, etc.)
          if (ContactExtractor.isContextuallyValidPhone(match, pageText)) {
            const cleanPhone = ContactExtractor.cleanPhoneNumber(match);
            if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
              log.debug(`✅ Found contextually valid phone: ${cleanPhone}`);
              return cleanPhone;
            }
          }
        }
      }
    }
    
    // Strategy 4: Legacy selector approach as fallback
    const phoneSelectors = [
      'a[href^="tel:"]',
      '[href*="tel:"]',
      '[data-testid*="phone"]',
      '[class*="phone"]',
      '[id*="phone"]'
    ];
    
    for (const selector of phoneSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        let phone = null;
        
        if (element.href && element.href.startsWith('tel:')) {
          phone = element.href.replace('tel:', '').trim();
        } else {
          phone = element.textContent?.trim();
        }
        
        if (phone) {
          const cleanPhone = ContactExtractor.cleanPhoneNumber(phone);
          if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
            log.debug(`✅ Found phone via selector: ${cleanPhone}`);
            return cleanPhone;
          }
        }
      }
    }
    
    log.debug('❌ No phone number found after all strategies');
    return null;
  }

  /**
   * Extract office phone number with enhanced strategies
   * @returns {string|null} Office phone or null
   */
  static extractOfficePhone() {
    const pageText = document.body.textContent;
    
    // Strategy 1: Look for phone numbers with "office" context
    const officePhonePatterns = [
      /(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})\s*(?:office|main|headquarters|hq|company)/i,
      /(?:office|main|headquarters|hq|company)\s*:?\s*(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/i
    ];
    
    for (const pattern of officePhonePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const phone = match[1];
        const cleanPhone = ContactExtractor.cleanPhoneNumber(phone);
        if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
          log.debug(`✅ Found office phone: ${cleanPhone}`);
          return cleanPhone;
        }
      }
    }
    
    // Strategy 2: Look in office-specific elements
    const officePhoneSelectors = [
      '[data-testid*="office-phone"]',
      '[data-testid*="office-contact"]',
      '[class*="office-phone"]',
      '[class*="office-contact"]',
      '[id*="office-phone"]'
    ];
    
    for (const selector of officePhoneSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const phoneText = element.textContent?.trim();
        if (phoneText) {
          const phoneMatch = phoneText.match(/\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/);
          if (phoneMatch) {
            const cleanPhone = ContactExtractor.cleanPhoneNumber(phoneMatch[0]);
            if (cleanPhone && ContactExtractor.isValidPhoneNumber(cleanPhone)) {
              log.debug(`✅ Found office phone in element: ${cleanPhone}`);
              return cleanPhone;
            }
          }
        }
      }
    }
    
    log.debug('❌ No office phone found');
    return null;
  }

  /**
   * Extract mobile phone number
   * @returns {string|null} Mobile phone or null
   */
  static extractMobilePhone() {
    const pageText = document.body.textContent;
    const mobilePhoneMatch = pageText.match(/(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})\s+mobile/i);
    return mobilePhoneMatch ? mobilePhoneMatch[1] : null;
  }

  /**
   * Extract and clean email address
   * @returns {string|null} Clean email address or null
   */
  static extractCleanEmail() {
    log.debug('📧 Looking for email addresses...');
    
    // Strategy 1: Look for email interaction buttons first
    const contactButtons = document.querySelectorAll('button, a, [role="button"]');
    for (const button of contactButtons) {
      const buttonText = (button.textContent || '').toLowerCase().trim();
      const buttonHref = button.href || '';
      
      // Check for email buttons or mailto: links
      if (buttonText.includes('email') || buttonText.includes('message') || buttonHref.startsWith('mailto:')) {
        if (buttonHref.startsWith('mailto:')) {
          const email = buttonHref.replace('mailto:', '').trim();
          if (ContactExtractor.isValidEmail(email) && !email.includes('realtor.com')) {
            log.debug(`✅ Found email in mailto: link: ${email}`);
            return email;
          }
        }
        
        // Look for emails in button aria-label or data attributes
        const ariaLabel = button.getAttribute('aria-label') || '';
        const dataEmail = button.getAttribute('data-email') || button.getAttribute('data-mailto') || '';
        
        for (const text of [buttonText, ariaLabel, dataEmail]) {
          if (text) {
            const emailMatch = text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
            if (emailMatch && ContactExtractor.isValidEmail(emailMatch[0]) && !emailMatch[0].includes('realtor.com')) {
              log.debug(`✅ Found email in button: ${emailMatch[0]}`);
              return emailMatch[0];
            }
          }
        }
      }
    }
    
    // Strategy 2: Search for mailto links in the page
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace('mailto:', '').trim();
      if (ContactExtractor.isValidEmail(email) && !email.includes('realtor.com') && !email.includes('example.com')) {
        log.debug(`✅ Found email from mailto: ${email}`);
        return email;
      }
    }
    
    // Strategy 3: Enhanced email pattern search with context awareness
    const pageText = document.body.textContent;
    const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    const emailMatches = pageText.match(emailPattern);
    
    if (emailMatches) {
      for (const email of emailMatches) {
        // Skip generic/system emails and check contextual validity
        if (ContactExtractor.isValidEmail(email) && 
            !email.includes('realtor.com') && 
            !email.includes('example.com') &&
            !email.includes('noreply') &&
            !email.includes('support') &&
            ContactExtractor.isContextuallyValidEmail(email, pageText)) {
          log.debug(`✅ Found email in text: ${email}`);
          return email;
        }
      }
    }
    
    // Strategy 4: Legacy selector approach as fallback
    const emailSelectors = [
      '[data-testid*="email"]',
      '[class*="email"]',
      '[id*="email"]',
      '[data-email]'
    ];
    
    for (const selector of emailSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const email = element.textContent?.trim() || element.value?.trim();
        if (email && ContactExtractor.isValidEmail(email) && !email.includes('realtor.com')) {
          log.debug(`✅ Found email in selector: ${email}`);
          return email;
        }
      }
    }
    
    log.debug('❌ No email address found');
    return null;
  }

  /**
   * Extract website URL
   * @returns {string|null} Website URL or null
   */
  static extractWebsiteUrl() {
    log.debug('🌐 Looking for website URLs...');
    
    // Enhanced website selectors
    const websiteSelectors = [
      '[data-testid="website"]',
      '[data-testid="agent-website"]',
      '.website',
      '.agent-website',
      '.personal-website',
      '.agent-url',
      'a[href*="website"]',
      'a[href*=".com"]:not([href*="realtor.com"])',
      'a[href*=".net"]',
      'a[href*=".org"]',
      '.contact-info a',
      '.agent-contact a'
    ];
    
    // Try specific website elements first
    for (const selector of websiteSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        let url = null;
        
        // Check href attribute
        if (element.href) {
          url = element.href.trim();
        } else {
          url = element.textContent?.trim();
        }
        
        log.debug(`🌐 Testing website from ${selector}: "${url}"`);
        
        if (url && ContactExtractor.isValidWebsiteUrl(url)) {
          const cleanUrl = ContactExtractor.cleanUrl(url);
          log.debug(`✅ Found website: ${cleanUrl}`);
          return cleanUrl;
        }
      }
    }
    
    // Search for URLs in page text
    const pageText = document.body.textContent;
    const urlPattern = /https?:\/\/(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(?:\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*\.[a-zA-Z]{2,}/g;
    const urlMatches = pageText.match(urlPattern);
    
    if (urlMatches) {
      for (const url of urlMatches) {
        log.debug(`🌐 Testing URL from text: "${url}"`);
        
        if (ContactExtractor.isValidWebsiteUrl(url)) {
          const cleanUrl = ContactExtractor.cleanUrl(url);
          log.debug(`✅ Found website in text: ${cleanUrl}`);
          return cleanUrl;
        }
      }
    }
    
    log.debug('❌ No website URL found');
    return null;
  }

  /**
   * Validate website URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid website URL
   */
  static isValidWebsiteUrl(url) {
    if (!url) return false;
    
    // Skip realtor.com URLs and other common invalid patterns
    const invalidPatterns = [
      'realtor.com',
      'realtordotcom',
      'facebook.com',
      'linkedin.com',
      'twitter.com',
      'instagram.com',
      'youtube.com',
      'google.com',
      'example.com',
      'mailto:',
      'tel:',
      '#'
    ];
    
    const urlLower = url.toLowerCase();
    
    for (const pattern of invalidPatterns) {
      if (urlLower.includes(pattern)) {
        return false;
      }
    }
    
    // Must be a valid URL format
    return /^https?:\/\//.test(url) || /^www\./.test(url) || /\.[a-zA-Z]{2,}/.test(url);
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  static isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone number
   */
  static isValidPhoneNumber(phone) {
    if (!phone) return false;
    
    // Remove all non-digit characters to count digits
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Valid US phone numbers should have 10 digits (or 11 with country code)
    return digitsOnly.length === 10 || digitsOnly.length === 11;
  }

  /**
   * Clean and format phone number
   * @param {string} phone - Raw phone number
   * @returns {string|null} Cleaned phone number or null
   */
  static cleanPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove extra characters and normalize format
    return phone
      .replace(/[^\d\-\(\)\s\+]/g, '') // Keep only digits, dashes, parens, spaces, plus
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Clean and format URL
   * @param {string} url - Raw URL
   * @returns {string|null} Cleaned URL or null
   */
  static cleanUrl(url) {
    if (!url) return null;
    
    // Ensure URL has protocol
    if (url.startsWith('//')) {
      return 'https:' + url;
    } else if (url.startsWith('/')) {
      return 'https://www.realtor.com' + url;
    } else if (!url.startsWith('http')) {
      return 'https://' + url;
    }
    
    return url;
  }

  /**
   * Extract social media information
   * @returns {Object} Social media links
   */
  static extractSocialMedia() {
    log.debug('🔗 Looking for social media links...');
    const social = {};
    
    // Enhanced social media selectors
    const socialSelectors = [
      '.social-media a',
      '.social-links a', 
      '.social a',
      '.agent-social a',
      '.contact-social a',
      '.social-icons a',
      '.social-profiles a',
      'a[href*="facebook.com"]',
      'a[href*="linkedin.com"]',
      'a[href*="twitter.com"]',
      'a[href*="x.com"]',
      'a[href*="instagram.com"]',
      'a[href*="youtube.com"]',
      'a[href*="tiktok.com"]',
      '[data-testid*="social"] a',
      '.contact-info a[href*="facebook"]',
      '.contact-info a[href*="linkedin"]',
      '.contact-info a[href*="twitter"]',
      '.contact-info a[href*="instagram"]'
    ];

    // Look for social media links
    const socialElements = document.querySelectorAll(socialSelectors.join(', '));
    
    socialElements.forEach(link => {
      const href = link.href;
      const text = link.textContent?.trim().toLowerCase();
      
      log.debug(`🔍 Testing social link: "${href}" (text: "${text}")`);
      
      // Skip generic realtor.com social links and invalid URLs
      if (!href || href.includes('realtor.com') || href.includes('REALTORdotcom') || 
          href.includes('realtordotcom') || href.includes('example.com') || 
          href === '#' || href.startsWith('javascript:')) {
        log.debug(`⏭️ Skipping generic/invalid link: ${href}`);
        return;
      }
      
      // Must be agent-specific links (not site-wide footer links)
      const isAgentSpecific = href.includes('joshua') || href.includes('altman') || 
                             !href.includes('user/RealtorDotCom') && !href.includes('company/realtor');
      
      if (!isAgentSpecific) {
        log.debug(`⏭️ Skipping non-agent-specific link: ${href}`);
        return;
      }
      
      // Extract different social platforms
      if (href.includes('facebook.com') && !social.facebook) {
        social.facebook = href;
        log.debug(`✅ Found Facebook: ${href}`);
      }
      
      if (href.includes('linkedin.com') && !social.linkedin) {
        social.linkedin = href; 
        log.debug(`✅ Found LinkedIn: ${href}`);
      }
      
      if ((href.includes('twitter.com') || href.includes('x.com')) && !social.twitter) {
        social.twitter = href;
        log.debug(`✅ Found Twitter/X: ${href}`);
      }
      
      if (href.includes('instagram.com') && !social.instagram) {
        social.instagram = href;
        log.debug(`✅ Found Instagram: ${href}`);
      }
      
      if (href.includes('youtube.com') && !social.youtube) {
        social.youtube = href;
        log.debug(`✅ Found YouTube: ${href}`);
      }
      
      if (href.includes('tiktok.com') && !social.tiktok) {
        social.tiktok = href;
        log.debug(`✅ Found TikTok: ${href}`);
      }
    });

    // Also search for social URLs in text content
    const pageText = document.body.textContent;
    const socialPatterns = [
      /(https?:\/\/(?:www\.)?facebook\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?linkedin\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?instagram\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?youtube\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?tiktok\.com\/[^\s<>"']+)/gi
    ];
    
    socialPatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach(url => {
          log.debug(`🔍 Testing social URL from text: "${url}"`);
          
          if (url.includes('facebook.com') && !social.facebook) {
            social.facebook = url;
            log.debug(`✅ Found Facebook in text: ${url}`);
          } else if (url.includes('linkedin.com') && !social.linkedin) {
            social.linkedin = url;
            log.debug(`✅ Found LinkedIn in text: ${url}`);
          } else if ((url.includes('twitter.com') || url.includes('x.com')) && !social.twitter) {
            social.twitter = url;
            log.debug(`✅ Found Twitter/X in text: ${url}`);
          } else if (url.includes('instagram.com') && !social.instagram) {
            social.instagram = url;
            log.debug(`✅ Found Instagram in text: ${url}`);
          } else if (url.includes('youtube.com') && !social.youtube) {
            social.youtube = url;
            log.debug(`✅ Found YouTube in text: ${url}`);
          } else if (url.includes('tiktok.com') && !social.tiktok) {
            social.tiktok = url;
            log.debug(`✅ Found TikTok in text: ${url}`);
          }
        });
      }
    });

    log.debug('🔗 Final social media links found:', social);
    return social;
  }

  // Helper methods
  static cleanText(text) {
    if (!text) return null;
    return text.toString().trim().replace(/\s+/g, ' ') || null;
  }

  static getTextContent(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    return null;
  }

  /**
   * Check if an email is contextually valid (not a system/generic email)
   * @param {string} email - The email to validate
   * @param {string} context - The surrounding text context
   * @returns {boolean} True if contextually valid
   */
  static isContextuallyValidEmail(email, context) {
    // Get surrounding text around the email
    const emailIndex = context.indexOf(email);
    if (emailIndex === -1) return true; // If not found in context, assume valid
    
    const start = Math.max(0, emailIndex - 50);
    const end = Math.min(context.length, emailIndex + email.length + 50);
    const surroundingText = context.substring(start, end).toLowerCase();
    
    // Skip if it appears in non-contact contexts
    const invalidContexts = [
      'privacy policy', 'terms', 'copyright', 'legal', 'disclaimer',
      'unsubscribe', 'newsletter', 'marketing', 'system', 'automated'
    ];
    
    for (const invalidContext of invalidContexts) {
      if (surroundingText.includes(invalidContext)) {
        return false;
      }
    }
    
    // Prefer if it appears in contact-related contexts
    const validContexts = [
      'contact', 'reach', 'agent', 'email', 'message', 'inquire',
      'direct', 'personal', 'business', 'professional'
    ];
    
    for (const validContext of validContexts) {
      if (surroundingText.includes(validContext)) {
        return true;
      }
    }
    
    // If no specific context indicators, assume valid
    return true;
  }

  /**
   * Check if a phone number is contextually valid (not a date, price, etc.)
   * @param {string} phone - The phone number to validate
   * @param {string} context - The surrounding text context
   * @returns {boolean} True if contextually valid
   */
  static isContextuallyValidPhone(phone, context) {
    // Get surrounding text around the phone number
    const phoneIndex = context.indexOf(phone);
    if (phoneIndex === -1) return true; // If not found in context, assume valid
    
    const start = Math.max(0, phoneIndex - 50);
    const end = Math.min(context.length, phoneIndex + phone.length + 50);
    const surroundingText = context.substring(start, end).toLowerCase();
    
    // Skip if it appears in non-contact contexts
    const invalidContexts = [
      'price', 'cost', '$', 'square', 'sq ft', 'sqft', 'acre', 'year', 'built',
      'mls', 'listing', 'property id', 'zip', 'postal', 'date', 'time',
      'days on market', 'dom', 'lot size', 'bedroom', 'bathroom', 'bath'
    ];
    
    for (const invalidContext of invalidContexts) {
      if (surroundingText.includes(invalidContext)) {
        return false;
      }
    }
    
    // Prefer if it appears in contact-related contexts
    const validContexts = [
      'phone', 'call', 'contact', 'reach', 'agent', 'office', 'mobile', 'cell',
      'direct', 'desk', 'work', 'business', 'tel', 'telephone'
    ];
    
    for (const validContext of validContexts) {
      if (surroundingText.includes(validContext)) {
        return true;
      }
    }
    
    // If no specific context indicators, assume valid
    return true;
  }

  static extractSpecificText(element, maxLength = 100) {
    if (!element) return null;
    
    // Get all text content including from child elements
    let text = element.textContent || element.innerText || '';
    
    // Clean the text
    text = text.trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' '); // Replace tabs with spaces
    
    // Limit length if specified
    if (maxLength && text.length > maxLength) {
      text = text.substring(0, maxLength).trim();
      // Try to end at a word boundary
      const lastSpace = text.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.5) {
        text = text.substring(0, lastSpace);
      }
    }
    
    return text || null;
  }

  static containsMixedContent(text) {
    // Check if text contains mixed content that indicates poor extraction
    const indicators = [
      /\d{3}[\s\-]\d{3}[\s\-]\d{4}/, // Phone numbers
      /recommendations/i,
      /office/i,
      /share/i,
      /profile/i,
      /\.jsx/,
      /\{.*\}/
    ];
    
    return indicators.some(pattern => pattern.test(text));
  }
}

// Make ContactExtractor available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.ContactExtractor = ContactExtractor;
  console.log('✅ ContactExtractor module loaded and assigned to window');
} else {
  console.error('❌ Window object not available - ContactExtractor not assigned');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContactExtractor;
}
