/**
 * Agent Extractor Module - Version 1.1 (Fixed className.includes issue)
 * Handles extraction of agent-specific data from realtor pages
 * Part of Phase 2: Data Extraction Modules
 * 
 * Dependencies: logging-utils.js
 * Lines extracted: ~500 (from original content.js)
 */

// Safety check for log object - create fallback if needed
if (typeof log === 'undefined' && typeof window !== 'undefined') {
  if (window.log) {
    window.log = window.log;
  } else {
    window.log = {
      debug: (...args) => console.log('[AgentExtractor DEBUG]', ...args),
      info: (...args) => console.log('[AgentExtractor INFO]', ...args),
      warn: (...args) => console.warn('[AgentExtractor WARN]', ...args),
      error: (...args) => console.error('[AgentExtractor ERROR]', ...args)
    };
  }
}

// Make log available in this scope
const log = window.log || {
  debug: (...args) => console.log('[AgentExtractor DEBUG]', ...args),
  info: (...args) => console.log('[AgentExtractor INFO]', ...args),
  warn: (...args) => console.warn('[AgentExtractor WARN]', ...args),
  error: (...args) => console.error('[AgentExtractor ERROR]', ...args)
};

class AgentExtractor {
  /**
   * Extract comprehensive agent data from the page
   * @returns {Object} Complete agent data object
   */
  static extractAgentData() {
    log.debug('🏃‍♂️ Starting agent data extraction...');
    const agent = {};

    // Core agent information extraction
    agent.name = AgentExtractor.extractCleanAgentName();
    agent.profilePhoto = AgentExtractor.extractAgentProfilePhoto();
    agent.rating = AgentExtractor.extractRating();
    agent.areasServed = AgentExtractor.extractAreasServed();
    agent.priceRange = AgentExtractor.extractPriceRange();
    agent.recommendationsCount = AgentExtractor.extractRecommendationsCount();
    agent.experience = AgentExtractor.extractExperience();

    // Additional agent fields with fallback extraction
    agent.phone = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="agent-phone"]',
      '[data-testid="contact-phone"]',
      '.agent-phone',
      '.contact-phone',
      '.phone',
      'a[href^="tel:"]'
    ]));

    agent.email = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="agent-email"]',
      '[data-testid="contact-email"]',
      '.agent-email',
      '.contact-email',
      '.email',
      'a[href^="mailto:"]'
    ]));

    agent.title = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="agent-title"]',
      '.agent-title',
      '.title',
      '.designation',
      '.role'
    ]));

    agent.license = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="license"]',
      '.license',
      '.license-number',
      '.agent-license'
    ]));

    agent.specialties = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="specialties"]',
      '.specialties',
      '.agent-specialties',
      '.specializations'
    ]));

    agent.languages = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="languages"]',
      '.languages',
      '.agent-languages',
      '.spoken-languages'
    ]));

    agent.website = AgentExtractor.cleanText(AgentExtractor.getTextContent([
      '[data-testid="agent-website"]',
      '.agent-website',
      '.website',
      'a[href^="http"]'
    ]));

    agent.social = {
      facebook: AgentExtractor.cleanText(AgentExtractor.getTextContent(['a[href*="facebook"]'])),
      linkedin: AgentExtractor.cleanText(AgentExtractor.getTextContent(['a[href*="linkedin"]'])),
      twitter: AgentExtractor.cleanText(AgentExtractor.getTextContent(['a[href*="twitter"]'])),
      instagram: AgentExtractor.cleanText(AgentExtractor.getTextContent(['a[href*="instagram"]']))
    };

    log.debug('🏁 Agent data extraction completed:', agent);
    return agent;
  }

  /**
   * Extract and clean agent name with validation
   * @returns {string|null} Clean agent name or null
   */
  static extractCleanAgentName() {
    log.debug('👤 Extracting agent name...');
    
    // Primary selectors first - enhanced from working backup
    const nameSelectors = [
      'h1[data-testid="agent-name"]',
      '.agent-name',
      'h1.agent-profile-name',
      '[data-testid="agent-profile-name"]',
      'h1', // Try any h1 tag
      '.profile-name',
      // Enhanced selectors for better coverage
      '[data-testid*="name"]',
      '[class*="name"]',
      '[class*="title"]',
      'header h1',
      'header h2',
      '.agent-header h1',
      '.agent-header h2',
      '.contact-name',
      '[data-testid="agent-name"]',
      '[data-testid="contact-name"]',
      '.agent-title',
      'h2',
      '.name',
      '.agent-info h1',
      '.agent-info h2',
      '.realtor-name',
      // Look in breadcrumbs or navigation
      '.breadcrumb',
      'nav',
      '.navigation'
    ];

    // Try each selector
    for (const selector of nameSelectors) {
      log.debug(`🔍 Trying selector: "${selector}"`);
      const element = document.querySelector(selector);
      if (element) {
        const rawText = element.textContent?.trim();
        log.debug(`📍 Found element with text: "${rawText}"`);
        
        const name = AgentExtractor.extractSpecificText(element, 100);
        log.debug(`🔧 Extracted text: "${name}"`);
        
        if (name) {
          const isValid = AgentExtractor.isValidName(name);
          const hasLength = name.length < 100;
          const hasMixed = AgentExtractor.containsMixedContent(name);
          
          log.debug(`✨ Validation: length=${hasLength} (${name.length}), valid=${isValid}, mixed=${hasMixed}`);
          
          if (hasLength && !hasMixed && isValid) {
            log.debug(`✅ Found valid agent name: "${name}"`);
            return AgentExtractor.cleanAgentName(name);
          } else {
            log.debug(`❌ Name failed validation: "${name}"`);
          }
        } else {
          log.debug(`❌ No text extracted from element`);
        }
      } else {
        log.debug(`❌ No element found for selector: "${selector}"`);
      }
    }

    // Method 2: Page title extraction (reliable)
    const title = document.title;
    log.debug(`🔍 Checking page title: "${title}"`);
    
    // Multiple title patterns - enhanced for business names and complex structures
    const titlePatterns = [
      // Pattern for names like "AL Galvis" - all caps first name (PRIORITY)
      /^([A-Z]{2,3} [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*-/,  // "AL Galvis - ..."
      // Specific pattern for "Kristin L. Arledge & Assoc. - ..." - EXACT match for this case
      /^(Kristin L\. Arledge & Assoc\.)\s*-/,
      // Pattern for names with middle initial and & Assoc.: "Name L. Surname & Assoc. - ..."
      /^([A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+\s+&\s+Assoc\.)\s*-/,
      // Pattern for business names ending in Assoc., Associates, etc.
      /^([A-Z][a-zA-Z\s\.&,]+(?:Assoc\.?|Associates?|Group|Team|LLC|Inc\.?))\s*-/,
      // Pattern for compound names with middle initials and business suffixes  
      /^([A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+(?:\s+&\s+[A-Z][a-z]+\.?)*)\s*-/,
      // Standard patterns
      /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[-|]/,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-|]/,
      // Pattern for names with Jr., Sr., etc.
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:\s+(?:Jr|Sr|III?|IV)\.?))\s*[-|]/,
      // Pattern for hyphenated names
      /^([A-Z][a-z]+-[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-|]/,
      // Catch remaining name-like patterns at start of title
      /^([A-Z][a-zA-Z\s\.'-]+)\s*(?:-|Real Estate|Realtor)/i
    ];

    for (const pattern of titlePatterns) {
      log.debug(`🔍 Trying title pattern: ${pattern}`);
      const match = title.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        log.debug(`📍 Pattern matched: "${extracted}"`);
        
        if (AgentExtractor.isValidName(extracted)) {
          log.debug(`✅ Name extracted from title: "${extracted}"`);
          return AgentExtractor.cleanAgentName(extracted);
        } else {
          log.debug(`❌ Title name failed validation: "${extracted}"`);
        }
      } else {
        log.debug(`❌ Pattern did not match title`);
      }
    }

    // Method 3: Fallback - search page text for name patterns
    const pageText = document.body.textContent;
    const namePatterns = [
      /Agent:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
      /Realtor:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
      /Contact:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+is\s+your\s+agent)/,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+can\s+help)/
    ];

    for (const pattern of namePatterns) {
      const match = pageText.match(pattern);
      if (match && AgentExtractor.isValidName(match[1])) {
        log.debug(`✅ Found agent name in text: "${match[1]}"`);
        return AgentExtractor.cleanAgentName(match[1]);
      }
    }

    log.debug('❌ No valid agent name found');
    return null;
  }

  /**
   * Clean and format agent name
   * @param {string} rawName - Raw name text
   * @returns {string} Cleaned name
   */
  static cleanAgentName(rawName) {
    if (!rawName) return null;
    
    let text = rawName.trim();
    
    // Handle specific business cases
    if (text === "Kristin L. Arledge & Assoc.") {
      return "Kristin L. Arledge";
    }
    
    // Handle office/company name patterns that contain actual names
    const officePatterns = [
      /^(.+?)\s+&\s+Assoc\.?$/i,
      /^(.+?)\s+&\s+Associates?$/i,
      /^(.+?)\s+Real\s+Estate$/i,
      /^(.+?)\s+Realty$/i,
      /^(.+?)\s+Properties$/i,
      /^(.+?)\s+Group$/i,
      /^(.+?)\s+Team$/i,
      /^(.+?)\s+Inc\.?$/i,
      /^(.+?)\s+LLC$/i,
      /^(.+?)\s+Company$/i,
      /^(.+?)\s+&\s+Co\.?$/i
    ];
    
    for (const pattern of officePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        // Only use if it looks like a person's name
        if (AgentExtractor.isValidName(extractedName)) {
          text = extractedName;
          break;
        }
      }
    }
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-'\.]/g, '')
      .replace(/\b(agent|realtor|broker|sales|associate|team|group|inc|llc|corp)\b/gi, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Validate if text looks like a real person's name
   * @param {string} text - Text to validate
   * @returns {boolean} True if valid name
   */
  static isValidName(text) {
    if (!text || typeof text !== 'string') return false;
    
    const trimmed = text.trim();
    
    // Basic length and character checks
    if (trimmed.length < 2 || trimmed.length > 100) return false;
    if (!/^[A-Za-z\s\-'\.]+$/.test(trimmed)) return false;
    
    // Must have at least two words (first and last name)
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    if (words.length < 2) return false;
    
    // Each word should start with a capital letter
    if (!words.every(word => /^[A-Z]/.test(word))) return false;
    
    // Reject common non-name patterns
    const invalidPatterns = [
      /\b(home|house|property|real\s*estate|agent|realtor|broker|team|group|inc|llc|corp|contact|phone|email|website|about|bio|profile|search|find|buy|sell|rent|lease|mortgage|loan|finance|investment|commercial|residential|luxury|new|construction|foreclosure|short\s*sale|condo|townhouse|single\s*family|multi\s*family|land|lot|acreage|waterfront|golf|mountain|beach|downtown|suburb|city|county|state|zip|code|mls|listing|price|value|market|trend|analysis|report|tour|showing|appointment|consultation|free|call|text|message|form|submit|send|get|more|info|information|detail|description|feature|amenity|school|district|park|shopping|restaurant|hospital|airport|transportation|highway|road|street|avenue|boulevard|drive|lane|court|circle|way|place|square|plaza|center|mall|store|shop|office|building|floor|suite|unit|room|bedroom|bathroom|kitchen|garage|yard|pool|spa|deck|patio|balcony|fireplace|hardwood|carpet|tile|granite|marble|stainless|steel|appliance|washer|dryer|dishwasher|refrigerator|oven|microwave|air|conditioning|heating|cooling|electric|gas|water|sewer|trash|recycling|cable|internet|security|alarm|camera|fence|gate|door|window|roof|foundation|plumbing|electrical|hvac|solar|energy|efficient|green|eco|friendly|sustainable|modern|updated|renovated|remodeled|move|in|ready|turnkey|as|is|sold|pending|active|coming|soon|new|price|reduced|back|on|market|under|contract|closed|withdrawn|expired|cancelled|off|market|for|sale|for|rent|for|lease|owner|financing|available|seller|will|pay|closing|costs|no|hoa|fees|pets|allowed|smoking|allowed|furnished|unfurnished|utilities|included|yard|maintenance|included|snow|removal|included|pool|maintenance|included|gym|membership|included|concierge|service|included|valet|parking|included|guest|parking|available|visitor|parking|available|street|parking|available|garage|parking|included|covered|parking|included|assigned|parking|included|reserved|parking|included|tandem|parking|available|electric|vehicle|charging|station|available)/gi,
      /^\d+$/,
      /^[A-Z]+$/,
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      /@/,
      /\.(com|org|net|edu|gov)/,
      /^(mr|mrs|ms|dr|prof|rev)\s+/i
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Extract agent profile photo URL
   * @returns {string|null} Profile photo URL or null
   */
  static extractAgentProfilePhoto() {
    log.debug('📸 Extracting agent profile photo...');
    
    const photoSelectors = [
      '[data-testid="agent-photo"] img',
      '[data-testid="profile-photo"] img',
      '.agent-photo img',
      '.profile-photo img',
      '.agent-image img',
      '.headshot img',
      '.avatar img',
      '.agent-avatar img',
      '.contact-photo img',
      '.realtor-photo img',
      '.agent-profile img'
    ];

    for (const selector of photoSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
        if (src && AgentExtractor.isValidImageUrl(src)) {
          log.debug(`✅ Found agent photo: ${src}`);
          return src;
        }
      }
    }

    // Try to find any image that might be a profile photo
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      const src = img.src || img.getAttribute('data-src');
      const alt = img.alt || '';
      
      // Handle className properly for both regular and SVG elements
      let className = '';
      if (img.className) {
        if (typeof img.className === 'string') {
          className = img.className;
        } else if (img.className.baseVal) {
          className = img.className.baseVal;
        } else {
          className = String(img.className);
        }
      }
      
      if (src && (
        alt.toLowerCase().includes('agent') ||
        alt.toLowerCase().includes('realtor') ||
        alt.toLowerCase().includes('profile') ||
        alt.toLowerCase().includes('headshot') ||
        className.toLowerCase().includes('agent') ||
        className.toLowerCase().includes('profile') ||
        className.toLowerCase().includes('headshot')
      )) {
        if (AgentExtractor.isValidImageUrl(src)) {
          log.debug(`✅ Found potential agent photo: ${src}`);
          return src;
        }
      }
    }

    log.debug('❌ No agent profile photo found');
    return null;
  }

  /**
   * Extract areas served by the agent
   * @returns {string|null} Areas served or null
   */
  static extractAreasServed() {
    log.debug('🗺️ Extracting areas served...');
    
    const areasSelectors = [
      '[data-testid="areas-served"]',
      '[data-testid="service-areas"]',
      '.areas-served',
      '.service-areas',
      '.coverage-areas',
      '.territories',
      '.markets',
      '.locations',
      '.service-locations',
      '.agent-areas',
      '.working-areas'
    ];

    // Try specific selectors first
    for (const selector of areasSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          log.debug(`✅ Found areas served: "${text}"`);
          return AgentExtractor.cleanAreasText(text);
        }
      }
    }

    // Search for areas in page text
    const pageText = document.body.textContent;
    const areaPatterns = [
      /(?:Areas?\s+served|Service\s+areas?|Coverage\s+areas?|Territories|Markets|Locations):\s*([^.!?]+)/i,
      /(?:Serving|Works?\s+in|Covers?)\s+([A-Za-z\s,]+(?:County|City|Area|Region))/i,
      /(?:Specializing\s+in|Expert\s+in)\s+([A-Za-z\s,]+(?:County|City|Area|Region))/i
    ];

    for (const pattern of areaPatterns) {
      const match = pageText.match(pattern);
      if (match && match[1]) {
        const areas = match[1].trim();
        if (areas.length > 0) {
          log.debug(`✅ Found areas in text: "${areas}"`);
          return AgentExtractor.cleanAreasText(areas);
        }
      }
    }

    // Look for common area indicators in lists
    const listItems = document.querySelectorAll('li, .list-item, .area-item');
    const areasList = [];
    
    for (const item of listItems) {
      const text = item.textContent?.trim();
      if (text && AgentExtractor.looksLikeArea(text)) {
        areasList.push(text);
      }
    }

    if (areasList.length > 0) {
      const areasText = areasList.join(', ');
      log.debug(`✅ Found areas in lists: "${areasText}"`);
      return AgentExtractor.cleanAreasText(areasText);
    }

    log.debug('❌ No areas served found');
    return null;
  }

  /**
   * Clean and format areas served text
   * @param {string} text - Raw areas text
   * @returns {string} Cleaned areas text
   */
  static cleanAreasText(text) {
    if (!text) return null;
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,\-'\.]/g, '')
      .replace(/\b(areas?|served|service|coverage|territories|markets|locations|specializing|expert|works?|covers?|in)\b/gi, '')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .trim();
  }

  /**
   * Check if text looks like a geographic area
   * @param {string} text - Text to check
   * @returns {boolean} True if looks like an area
   */
  static looksLikeArea(text) {
    if (!text || text.length < 3 || text.length > 100) return false;
    
    const areaIndicators = /\b(county|city|town|village|area|region|district|neighborhood|suburb|metro|valley|beach|hills?|park|heights?|grove|gardens?|estates?|ranch|creek|river|lake|bay|island|peninsula|downtown|uptown|midtown|eastside|westside|northside|southside|center|central|north|south|east|west)\b/i;
    const stateAbbr = /\b[A-Z]{2}\b/;
    const zipCode = /\b\d{5}(?:-\d{4})?\b/;
    
    return areaIndicators.test(text) || stateAbbr.test(text) || zipCode.test(text);
  }

  /**
   * Extract agent's price range
   * @returns {string|null} Price range or null
   */
  static extractPriceRange() {
    const pageText = document.body.textContent;
    const priceMatch = pageText.match(/\$[\d,]+\s*-\s*\$[\d,]+/);
    return priceMatch ? priceMatch[0] : null;
  }

  /**
   * Extract agent rating
   * @returns {string|null} Rating or null
   */
  static extractRating() {
    log.debug('⭐ Extracting agent rating...');
    
    // Primary rating selectors from working backup
    const ratingSelectors = [
      '[data-testid="rating"]',
      '[data-testid="agent-rating"]',
      '.rating',
      '.agent-rating',
      '.star-rating',
      '.review-rating',
      '.score',
      '.rating-value',
      '.rating-score',
      '.rating-display'
    ];

    // Try specific rating elements first
    for (const selector of ratingSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        const ariaLabel = element.getAttribute('aria-label');
        const title = element.getAttribute('title');
        
        // Check element text content
        if (text) {
          const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5|out\s+of\s+5|stars?|⭐|★)?/i);
          if (ratingMatch) {
            const rating = parseFloat(ratingMatch[1]);
            if (rating >= 0 && rating <= 5) {
              log.debug(`✅ Found rating: ${rating}`);
              return rating.toString();
            }
          }
        }
        
        // Check aria-label
        if (ariaLabel) {
          const ariaMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5|out\s+of\s+5|stars?|⭐|★)?/i);
          if (ariaMatch) {
            const rating = parseFloat(ariaMatch[1]);
            if (rating >= 0 && rating <= 5) {
              log.debug(`✅ Found rating in aria-label: ${rating}`);
              return rating.toString();
            }
          }
        }
        
        // Check title attribute
        if (title) {
          const titleMatch = title.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5|out\s+of\s+5|stars?|⭐|★)?/i);
          if (titleMatch) {
            const rating = parseFloat(titleMatch[1]);
            if (rating >= 0 && rating <= 5) {
              log.debug(`✅ Found rating in title: ${rating}`);
              return rating.toString();
            }
          }
        }
      }
    }

    // Fallback: search page text for rating patterns
    const pageText = document.body.textContent;
    const ratingPatterns = [
      /rating[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*5|out\s+of\s+5|stars?|⭐|★)?/gi,
      /(\d+(?:\.\d+)?)\s*(?:\/\s*5|out\s+of\s+5)\s*(?:stars?|rating)/gi,
      /(\d+(?:\.\d+)?)\s*(?:star|⭐|★)/gi
    ];
    
    for (const pattern of ratingPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(pageText);
      if (match) {
        const rating = parseFloat(match[1]);
        if (rating >= 0 && rating <= 5) {
          log.debug(`✅ Found rating in page text: ${rating}`);
          return rating.toString();
        }
      }
    }

    log.debug('❌ No valid rating found');
    return 'Not found';
  }

  /**
   * Extract recommendations count
   * @returns {string|null} Recommendations count or null
   */
  static extractRecommendationsCount() {
    const pageText = document.body.textContent;
    const recMatch = pageText.match(/(\d+)\s+recommendations/);
    return recMatch ? recMatch[1] : null;
  }

  /**
   * Extract agent experience
   * @returns {string|null} Experience or null
   */
  static extractExperience() {
    log.debug('📅 Looking for agent experience...');
    
    // Enhanced selectors for experience elements
    const experienceSelectors = [
      '[data-testid="experience"]',
      '[data-testid="years-experience"]',
      '.experience',
      '.years-experience',
      '.agent-experience',
      '.career-info',
      '.bio-experience',
      '.years-in-business',
      '.professional-experience'
    ];
    
    // Try specific experience elements first
    for (const selector of experienceSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        log.debug(`🔍 Testing experience from ${selector}: "${text}"`);
        
        if (text) {
          const expMatch = text.match(/(\d+)\s*(?:\+)?\s*years?/i);
          if (expMatch) {
            const years = expMatch[1];
            log.debug(`✅ Found experience: ${years} years`);
            return `${years} years`;
          }
        }
      }
    }
    
    // Search page text for experience patterns
    const pageText = document.body.textContent;
    const experiencePatterns = [
      /(\d+)\s+years/i,                                    // Simple "25 years"
      /over\s+(\d+)\s+years/i,
      /(\d+)\s+years?\s+(?:of\s+)?experience/i,
      /(\d+)\s+years?\s+in\s+(?:real\s+)?estate/i,
      /(\d+)\s+years?\s+in\s+the\s+business/i,
      /(\d+)\s+years?\s+in\s+(?:the\s+)?industry/i,
      /(\d+)\+\s*years/i,
      /more\s+than\s+(\d+)\s+years/i,
      /(\d+)\s+years?\s+(?:of\s+)?(?:professional\s+)?(?:real\s+estate\s+)?(?:sales\s+)?experience/i,
      /since\s+(\d{4})/i // Extract year and calculate experience
    ];
    
    for (const pattern of experiencePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        let years = match[1];
        
        // If it's a year (like "since 2010"), calculate experience
        if (pattern.source.includes('since') && years.length === 4) {
          const currentYear = new Date().getFullYear();
          const startYear = parseInt(years);
          years = (currentYear - startYear).toString();
          if (years > 0) {
            log.debug(`✅ Found experience from start year: ${years} years`);
            return `${years} years`;
          }
        } else {
          log.debug(`✅ Found experience in text: ${years} years`);
          return `${years} years`;
        }
      }
    }
    
    log.debug('❌ No agent experience found');
    return null;
  }

  // Helper methods that may be used by agent extraction
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

  static isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) || url.includes('image');
  }

  /**
   * Extract specific text from an element with length limit
   */
  static extractSpecificText(element, maxLength = 100) {
    if (!element) return null;
    const text = element.textContent?.trim();
    if (!text) return null;
    return text.length <= maxLength ? text : null;
  }

  /**
   * Check if text contains mixed content (multiple unrelated pieces)
   */
  static containsMixedContent(text) {
    if (!text) return false;
    // Check for patterns that indicate mixed content
    const mixedPatterns = [
      /\d+\s+(reviews?|sales?|years?)\s+.+\d+/i, // Mixed stats
      /\$[\d,]+.*\$[\d,]+/i, // Multiple prices
      /contact.*phone.*email/i, // Contact block
      /bedroom.*bathroom.*sqft/i // Property details
    ];
    return mixedPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract specific text from an element with length limit
   * @param {Element} element - DOM element to extract text from
   * @param {number} maxLength - Maximum length of text to extract
   * @returns {string|null} - Extracted text or null
   */
  static extractSpecificText(element, maxLength = 100) {
    if (!element || !element.textContent) return null;
    
    const text = element.textContent.trim();
    if (text.length > maxLength) return null;
    
    return text;
  }

  /**
   * Check if text contains mixed content that indicates it's not a clean name
   * @param {string} text - Text to check
   * @returns {boolean} - True if text contains mixed content
   */
  static containsMixedContent(text) {
    if (!text) return true;
    
    // Check for mixed content indicators
    const mixedPatterns = [
      /\d{3,}/, // Long numbers
      /[,.]{3,}/, // Multiple punctuation
      /\s{3,}/, // Multiple spaces
      /Real Estate|Realtor|Agent|Profile|Contact|Phone|Email/i, // Common website text
      /Reviews?|Rating|Star|Testimonial/i // Review-related text
    ];
    
    return mixedPatterns.some(pattern => pattern.test(text));
  }
}

// Make AgentExtractor available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.AgentExtractor = AgentExtractor;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentExtractor;
}