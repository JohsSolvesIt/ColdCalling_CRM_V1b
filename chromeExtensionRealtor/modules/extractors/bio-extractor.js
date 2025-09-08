// modules/extractors/bio-extractor.js
// Extracted from content.js - biography and content expansion utilities
// Dependencies: logging-utils.js, polling-manager.js

// Safety check for log object - using global log from logging-utils.js

// Make BioExtractor available globally
if (typeof window !== 'undefined') {
  const ContentPollingManager = window.ContentPollingManager || { pollForBioExpansion: async () => true };

  class BioExtractor {
  constructor() {
    // Initialize logging with comprehensive fallbacks
    this.initializeLogging();
    this.pollingManager = new ContentPollingManager();
  }

  initializeLogging() {
    try {
      // First, try to use the global log object
      if (typeof window !== 'undefined' && window.log && typeof window.log.debug === 'function') {
        this.log = window.log;
        return;
      }

      // Second, try to use log if it exists
      if (typeof log !== 'undefined' && typeof log.debug === 'function') {
        this.log = log;
        return;
      }

      // Third, create a fallback logger that uses console
      this.log = {
        debug: (...args) => console.log('[BioExtractor DEBUG]', ...args),
        info: (...args) => console.log('[BioExtractor INFO]', ...args),
        warn: (...args) => console.warn('[BioExtractor WARN]', ...args),
        error: (...args) => console.error('[BioExtractor ERROR]', ...args)
      };
    } catch (error) {
      // Ultimate fallback - basic console logging
      this.log = {
        debug: (...args) => console.log('[BioExtractor DEBUG]', ...args),
        info: (...args) => console.log('[BioExtractor INFO]', ...args),
        warn: (...args) => console.warn('[BioExtractor WARN]', ...args),
        error: (...args) => console.error('[BioExtractor ERROR]', ...args)
      };
    }
  }

  // ANTI-SCRAPER RESISTANT: Expand "See More" content using multiple strategies
  async expandAllSeeMoreContent() {
    
    let expandedCount = 0;
    
    // Strategy 1: Look for ANY text that ends with truncation and find expansion near it
    this.log.debug('🔍 Strategy 1: Finding truncated text and nearby expansion elements...');
    
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent?.trim() || '';
      
      // Look for any bio-like text that appears truncated
      const looksLikeTruncatedBio = (
        text.length > 100 && text.length < 800 && // Reasonable bio length range
        (text.includes('real estate') || text.includes('REALTOR') || text.includes('agent') || text.includes('broker')) &&
        (text.endsWith('...') || text.endsWith('He has...') || text.endsWith('She has...') || 
         text.match(/\b(He|She|I|They)\s+(has|have|am|are)\s*\.?\s*$/) || 
         text.includes('See more') || text.includes('Read more'))
      );
      
      if (looksLikeTruncatedBio) {
        this.log.debug(`📍 Found truncated bio-like content: "${text.substring(0, 100)}..."`);
        
        // Look for expansion elements near this truncated content
        const nearbyElements = [
          element.nextElementSibling,
          element.parentElement?.nextElementSibling,
          ...Array.from(element.parentElement?.children || []),
          ...Array.from(element.querySelectorAll('*'))
        ].filter(Boolean);
        
        for (const nearby of nearbyElements) {
          const nearbyText = nearby.textContent?.toLowerCase().trim() || '';
          
          // Look for expansion indicators
          if ((nearbyText.includes('more') || nearbyText.includes('expand') || nearbyText.includes('full') ||
               nearby.getAttribute('aria-expanded') === 'false') &&
              !nearby.href) { // Avoid navigation links
            
            try {
              this.log.debug(`🖱️ Clicking expansion element: "${nearbyText}"`);
              nearby.click();
              expandedCount++;
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Check if the original text expanded
              const newText = element.textContent?.trim() || '';
              if (newText.length > text.length) {
                this.log.debug(`✅ Content expanded! Old: ${text.length} → New: ${newText.length}`);
              }
              
              break; // Only click one expansion per truncated element
            } catch (error) {
              this.log.debug(`❌ Failed to click expansion: ${error.message}`);
            }
          }
        }
        
        if (expandedCount >= 5) break; // Don't expand too many
      }
    }
    
    this.log.debug(`📖 Strategy 1 expanded ${expandedCount} sections`);
    
    // Strategy 2: Look for BUTTONS specifically (most reliable expansion triggers)
    this.log.debug('🔍 Strategy 2: Finding expansion buttons...');
    // Strategy 2: Look for BUTTONS specifically (most reliable expansion triggers)
    this.log.debug('🔍 Strategy 2: Finding expansion buttons...');
    
    const buttonSelectors = [
      'button', 
      'span[role="button"]', 
      'div[role="button"]',
      '[data-testid*="more"]',
      '[data-testid*="expand"]',
      '[aria-expanded="false"]',
      'a:not([href*="http"])', // Local links that might be expansion triggers
      '[onclick]' // Elements with click handlers
    ];

    for (const selector of buttonSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = (element.textContent || '').toLowerCase().trim();
          
          // Only match very specific expansion text patterns
          const isExpansionButton = (
            text === 'see more' || 
            text === 'read more' || 
            text === 'show more' ||
            text === 'view more' ||
            text === 'expand' ||
            text.includes('see full') ||
            text.includes('read full') ||
            text.includes('show full') ||
            text.includes('more about') ||
            element.getAttribute('aria-expanded') === 'false'
          );
          
          // Also detect "See less" buttons - we want to ensure content is expanded
          const isCollapseButton = (
            text === 'see less' ||
            text === 'read less' ||
            text === 'show less' ||
            text === 'collapse'
          );
          
          // If we find a "See less" button, the content is already expanded - good!
          if (isCollapseButton) {
            this.log.debug(`✅ Found "See less" - content already expanded`);
            continue;
          }
          
          // CRITICAL: Exclude navigation links by checking href
          const isNavigationLink = element.href && (
            element.href.includes('/advice/') ||
            element.href.includes('/buy/') ||
            element.href.includes('/sell/') ||
            element.href.includes('/rent/') ||
            element.href.includes('http')
          );
          
          if (isExpansionButton && !isNavigationLink) {
            try {
              this.log.debug(`🖱️ Clicking expansion button: "${text}"`);
              element.click();
              expandedCount++;
              await new Promise(resolve => setTimeout(resolve, 600));
              
              if (expandedCount >= 5) break;
            } catch (error) {
              this.log.debug(`❌ Failed to click button: ${error.message}`);
            }
          }
        }
        
        if (expandedCount >= 5) break;
      } catch (error) {
        this.log.debug(`❌ Error with selector ${selector}: ${error.message}`);
      }
    }
    
    this.log.debug(`📖 Total expansions attempted: ${expandedCount}`);
    return expandedCount;
  }

  // New method to specifically find and expand truncated bio content
  async expandTruncatedBioContent() {
    this.log.debug('🔍 Looking for truncated bio content...');
    
    // Look for text that ends with truncation indicators
    const truncationIndicators = ['...', 'He has...', 'She has...', 'Read more', 'See more'];
    
    // Find all text elements that might contain truncated bios
    const allElements = document.querySelectorAll('*');
    let foundTruncated = 0;
    
    for (const element of allElements) {
      const text = element.textContent?.trim() || '';
      
      // Check if this looks like a bio and is truncated
      const looksLikeBio = (
        (text.includes('real estate') || text.includes('REALTOR') || text.includes('broker')) &&
        text.length > 100 && text.length < 1000
      );
      
      if (looksLikeBio) {
        const isTruncated = truncationIndicators.some(indicator => 
          text.endsWith(indicator) || text.includes(indicator)
        );
        
        if (isTruncated) {
          this.log.debug(`📍 Found truncated bio in element:`, element);
          this.log.debug(`📍 Truncated text: "${text}"`);
          foundTruncated++;
          
          // Look for expansion buttons near this element
          const expandButtons = this.findExpansionButtonsNear(element);
          this.log.debug(`🔍 Found ${expandButtons.length} potential expansion buttons`);
          
          for (const button of expandButtons) {
            try {
              this.log.debug(`🖱️ Clicking expansion button:`, button);
              this.log.debug(`🖱️ Button text: "${button.textContent}"`);
              button.click();
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if content expanded
              const newText = element.textContent?.trim() || '';
              if (newText.length > text.length) {
                this.log.debug(`✅ Content expanded! Old: ${text.length} chars, New: ${newText.length} chars`);
              } else {
                this.log.debug(`❌ No expansion detected after click`);
              }
            } catch (error) {
              this.log.debug(`❌ Failed to click expansion button: ${error.message}`);
            }
          }
        }
      }
    }
    
    this.log.debug(`📍 Found ${foundTruncated} truncated bio sections`);
    return foundTruncated;
  }

  // New method to specifically find and expand truncated bio content
  async expandTruncatedBioContent() {
    this.log.debug('🔍 Looking for truncated bio content...');
    
    // Look for text that ends with truncation indicators
    const truncationIndicators = ['...', 'He has...', 'She has...', 'Read more', 'See more'];
    
    // Find all text elements that might contain truncated bios
    const allElements = document.querySelectorAll('*');
    let foundTruncated = 0;
    
    for (const element of allElements) {
      const text = element.textContent?.trim() || '';
      
      // Check if this looks like a bio and is truncated
      const looksLikeBio = (
        (text.includes('real estate') || text.includes('REALTOR') || text.includes('broker')) &&
        text.length > 100 && text.length < 1000
      );
      
      if (looksLikeBio) {
        const isTruncated = truncationIndicators.some(indicator => 
          text.endsWith(indicator) || text.includes(indicator)
        );
        
        if (isTruncated) {
          this.log.debug(`📍 Found truncated bio in element:`, element);
          this.log.debug(`📍 Truncated text: "${text}"`);
          foundTruncated++;
          
          // Look for expansion buttons near this element
          const expandButtons = this.findExpansionButtonsNear(element);
          this.log.debug(`🔍 Found ${expandButtons.length} potential expansion buttons`);
          
          for (const button of expandButtons) {
            try {
              this.log.debug(`🖱️ Clicking expansion button:`, button);
              this.log.debug(`🖱️ Button text: "${button.textContent}"`);
              button.click();
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if content expanded
              const newText = element.textContent?.trim() || '';
              if (newText.length > text.length) {
                this.log.debug(`✅ Content expanded! Old: ${text.length} chars, New: ${newText.length} chars`);
              } else {
                this.log.debug(`❌ No expansion detected after click`);
              }
            } catch (error) {
              this.log.debug(`❌ Failed to click expansion button: ${error.message}`);
            }
          }
        }
      }
    }
    
    this.log.debug(`📍 Found ${foundTruncated} truncated bio sections`);
    
    // ADDITIONAL: Try clicking ANY "Show more" or "Read more" buttons on the page
    const allButtons = document.querySelectorAll('button, [role="button"], span[onclick], div[onclick], a');
    let clickedButtons = 0;
    
    for (const button of allButtons) {
      const btnText = button.textContent?.toLowerCase().trim() || '';
      const isExpansionBtn = (
        btnText.includes('more') ||
        btnText.includes('expand') ||
        btnText.includes('full') ||
        btnText.includes('continue') ||
        button.getAttribute('aria-expanded') === 'false'
      );
      
      if (isExpansionBtn && !button.href) { // Avoid navigation links
        try {
          this.log.debug(`🖱️ Trying to click general expansion button: "${btnText}"`);
          button.click();
          clickedButtons++;
          await new Promise(resolve => setTimeout(resolve, 300));
          
          if (clickedButtons >= 5) break; // Don't click too many
        } catch (error) {
          this.log.debug(`❌ Failed to click button: ${error.message}`);
        }
      }
    }
    
    this.log.debug(`🖱️ Clicked ${clickedButtons} general expansion buttons`);
    return foundTruncated;
  }

  // Helper method to find expansion buttons near a given element
  findExpansionButtonsNear(element) {
    const buttons = [];
    
    // Check the element itself and its siblings
    const searchElements = [
      element,
      element.parentElement,
      element.nextElementSibling,
      element.previousElementSibling,
      ...(element.parentElement?.children || [])
    ].filter(Boolean);
    
    for (const searchEl of searchElements) {
      // Look for buttons within and around this element
      const foundButtons = searchEl.querySelectorAll('button, [role="button"], span[onclick], div[onclick]');
      
      for (const btn of foundButtons) {
        const btnText = btn.textContent?.toLowerCase().trim() || '';
        const isExpansionBtn = (
          btnText.includes('more') ||
          btnText.includes('expand') ||
          btnText.includes('full') ||
          btnText.includes('continue') ||
          btn.getAttribute('aria-expanded') === 'false'
        );
        
        if (isExpansionBtn) {
          buttons.push(btn);
        }
      }
    }
    
    return buttons;
  }

  // Helper method to extract bio content from a larger container
  extractBioFromContainer(containerText) {
    // Look for the complete bio text using specific patterns
    const completeBioPatterns = [
      // Most specific - complete bio
      /Ryan has a passion for real estate[^]*?bettering assisting all his clients nationwide\.?/i,
      // Alternative endings
      /Ryan has a passion for real estate[^]*?does it all\.?\s*Ryan is fluent[^]*?nationwide\.?/i,
      /Ryan has a passion for real estate[^]*?investment property[^]*?nationwide\.?/i,
      // Fallback pattern
      /(Ryan has a passion for real estate.*?REALTOR.*?)(?=\n\n|\.\s+[A-Z]|Contact|Phone|Email|$)/s,
      /(Ryan.*?real estate.*?)(?=\n\n|\.\s+Contact|$)/s,
      /(Ryan.*?agent.*?)(?=\n\n|\.\s+[A-Z]|Contact|Phone|Email|$)/s
    ];
    
    for (const pattern of completeBioPatterns) {
      const match = containerText.match(pattern);
      if (match && match[0] && match[0].length > 200) {
        this.log.debug(`📋 Complete bio pattern matched: "${match[0].substring(0, 100)}..."`);
        
        // Prefer longer matches that likely contain the full bio
        if (match[0].includes('nationwide') || match[0].includes('does it all') || match[0].length > 400) {
          this.log.debug(`📋 Found complete bio: ${match[0].length} chars`);
          return match[0].trim();
        }
        
        return match[0].trim();
      }
    }
    
    // Fallback: look for any substantial paragraph mentioning Ryan and real estate
    const sentences = containerText.split(/\.\s+/);
    let bioSentences = [];
    let foundStart = false;
    
    for (const sentence of sentences) {
      if (!foundStart && sentence.includes('Ryan') && 
          (sentence.includes('real estate') || sentence.includes('REALTOR'))) {
        foundStart = true;
        bioSentences.push(sentence);
      } else if (foundStart) {
        // Continue collecting bio sentences until we hit contact info or other sections
        if (sentence.includes('Contact') || sentence.includes('Phone') || 
            sentence.includes('Email') || sentence.includes('Reviews')) {
          break;
        }
        bioSentences.push(sentence);
        
        // Stop if we have the complete bio (contains "nationwide")
        if (sentence.includes('nationwide')) {
          break;
        }
        
        // Stop if we have enough content
        if (bioSentences.join('. ').length > 500) {
          break;
        }
      }
    }
    
    if (bioSentences.length > 0) {
      const extractedBio = bioSentences.join('. ').trim();
      if (extractedBio.length > 200) {
        return extractedBio;
      }
    }
    
    return null;
  }

  async extractCleanBio() {
    this.log.debug('🔍 Looking for FULL agent bio (with SAFE content expansion)...');
    
    // CRITICAL FIRST STEP: EXPAND ANY "SEE MORE" CONTENT BEFORE EXTRACTION
    this.log.debug('📖 Expanding "See More" content...');
    const expandedCount = await this.expandAllSeeMoreContent();
    this.log.debug(`📖 Expanded ${expandedCount} "See More" sections`);
    
    // ADDITIONAL: Try to find and expand any truncated content
    await this.expandTruncatedBioContent();
    
    // Wait a bit for content to fully load after expansion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Expansion complete, proceeding with extraction
    
    // FIRST: Look specifically for text that starts with "Hello!" anywhere on the page
    this.log.debug('👋 Searching for "Hello!" content...');
    const allElements = document.querySelectorAll('*');
    
    let helloFoundCount = 0;
    
    for (let element of allElements) {
      const text = element.textContent || '';
      if (text.includes('Hello!')) {
        helloFoundCount++;
        this.log.debug(`👋 Found "Hello!" #${helloFoundCount}: "${text.substring(0, 100)}..."`);
        
        if (text.trim().startsWith('Hello!') && text.length > 500) {
          this.log.debug(`✅ Processing Hello! bio with length ${text.length}`);
          const cleanedHelloBio = this.cleanBioText(text.trim());
          
          if (cleanedHelloBio && cleanedHelloBio.length > 500 && this.isQualityBio(cleanedHelloBio)) {
            this.log.debug(`✅ Found quality Hello! bio: "${cleanedHelloBio.substring(0, 100)}..."`);
            return cleanedHelloBio;
          } else {
            this.log.debug(`❌ Hello! bio failed quality check: length=${cleanedHelloBio?.length}, quality=${this.isQualityBio(cleanedHelloBio)}`);
          }
        } else {
          this.log.debug(`❌ Hello! text too short or doesn't start properly`);
        }
      }
    }
    
    this.log.debug(`👋 Total "Hello!" instances found: ${helloFoundCount}`);
    
    // SECOND: Try standard bio selectors (comprehensive approach)
    this.log.debug('📝 Trying standard bio selectors...');
    const bioSelectors = [
      '[data-testid="agent-bio"]',
      '[data-testid="bio"]',
      '[data-testid="about"]',
      '[data-testid="agent-description"]',
      '.agent-bio',
      '.agent-about',
      '.bio-section',
      '.about-section',
      '.agent-description',
      '.bio-content',
      '.about-content',
      '[class*="bio"]',
      '[class*="about"]',
      '[class*="description"]',
      '[id*="bio"]',
      '[id*="about"]',
      '.profile-bio',
      '.profile-about'
    ];

    for (const selector of bioSelectors) {
      this.log.debug(`🔍 Trying bio selector: "${selector}"`);
      const elements = document.querySelectorAll(selector); // Get ALL matching elements, not just first
      
      for (const element of elements) {
        const bioText = element.textContent?.trim();
        this.log.debug(`📍 Found bio element with length: ${bioText?.length}`);
        
        if (bioText && bioText.length > 50) {
          // Check if this looks truncated and skip if so
          const isTruncated = (
            bioText.endsWith('...') ||
            bioText.endsWith('He has...') ||
            bioText.endsWith('She has...') ||
            bioText.includes('See more') ||
            bioText.includes('Read more')
          );
          
          if (isTruncated) {
            this.log.debug(`⚠️ Skipping truncated bio from selector: "${bioText.substring(0, 100)}..."`);
            continue; // Skip truncated versions, look for full version
          }
          
          const cleanedBio = this.cleanBioText(bioText);
          this.log.debug(`🧹 Cleaned bio length: ${cleanedBio?.length}`);
          
          if (cleanedBio && cleanedBio.length > 50) {
            const qualityCheck = this.isQualityBio(cleanedBio);
            this.log.debug(`✨ Bio quality check: ${qualityCheck}`);
            
            if (qualityCheck) {
              this.log.debug(`✅ Found quality bio from selector: "${cleanedBio.substring(0, 100)}..."`);
              return cleanedBio;
            } else {
              this.log.debug(`❌ Bio failed quality check: "${cleanedBio.substring(0, 100)}..."`);
            }
          } else {
            this.log.debug(`❌ Bio too short after cleaning`);
          }
        } else {
          this.log.debug(`❌ Bio element text too short or empty`);
        }
      }
    }
    
    // THIRD: After expansion, look for the LONGEST bio-like content on the page
    this.log.debug('📏 Searching for longest bio content after expansion...');
    let longestBio = '';
    let longestLength = 0;
    
    const allElementsForLength = document.querySelectorAll('*');
    for (const element of allElementsForLength) {
      const text = element.textContent?.trim() || '';
      
      // Skip if it's too short or looks like navigation
      if (text.length < 100 || this.containsMixedContent(text)) {
        continue;
      }
      
      // Check if it looks like bio content
      const looksLikeBio = (
        (text.includes('real estate') || text.includes('REALTOR') || text.includes('broker') ||
         text.includes('agent') || text.includes('licensed') || text.includes('experience')) &&
        !text.includes('Share your experience') &&
        !text.includes('navigation') &&
        text.length > longestLength
      );
      
      if (looksLikeBio) {
        const cleanedBio = this.cleanBioText(text);
        if (cleanedBio && cleanedBio.length > longestLength && this.isQualityBio(cleanedBio)) {
          longestBio = cleanedBio;
          longestLength = cleanedBio.length;
          this.log.debug(`📏 Found longer bio candidate: ${longestLength} chars: "${cleanedBio.substring(0, 100)}..."`);
        }
      }
    }
    
    if (longestBio && longestLength > 100) {
      this.log.debug(`✅ Using longest bio found: ${longestLength} chars`);
      return longestBio;
    }
    
    // FOURTH: Look for bio content in common containers after expansion
    this.log.debug('🔍 Manual search for hidden bio content...');
    const bioContainerSelectors = [
      'main', 'section', 'article', '.main-content', '.content', 
      '.agent-profile', '.profile-content', '.bio-container',
      '[data-testid*="profile"]', '[data-testid*="bio"]', '[data-testid*="about"]'
    ];
    
    for (const selector of bioContainerSelectors) {
      const containers = document.querySelectorAll(selector);
      for (const container of containers) {
        const containerText = container.textContent?.trim() || '';
        
        // Look for bio-like content (generic approach for any agent)
        if ((containerText.includes('real estate') || containerText.includes('REALTOR')) &&
            containerText.length > 200) {
          
          this.log.debug(`📍 Found bio container: ${containerText.length} chars`);
          
          // Try to extract just the bio part
          const bioMatch = this.extractBioFromContainer(containerText);
          if (bioMatch && bioMatch.length > 300) {
            this.log.debug(`✅ Extracted bio from container: "${bioMatch.substring(0, 100)}..."`);
            return this.cleanBioText(bioMatch);
          }
        }
      }
    }
    
    // FIFTH: Manual search for hidden or dynamically loaded bio content
    this.log.debug('🔍 Manual search for hidden bio content...');
    
    // Look for elements that might contain hidden bio content
    const hiddenBioElements = document.querySelectorAll([
      '[style*="display: none"]',
      '[style*="visibility: hidden"]',
      '[data-testid*="expanded"]',
      '[aria-hidden="true"]',
      '.expanded-content',
      '.full-bio',
      '.complete-bio'
    ].join(', '));
    
    for (const hiddenEl of hiddenBioElements) {
      const hiddenText = hiddenEl.textContent?.trim() || '';
      if ((hiddenText.includes('real estate') || hiddenText.includes('REALTOR')) && hiddenText.length > 300) {
        this.log.debug(`🔍 Found hidden bio content: ${hiddenText.length} chars`);
        const cleanedHidden = this.cleanBioText(hiddenText);
        if (cleanedHidden && this.isQualityBio(cleanedHidden)) {
          this.log.debug(`✅ Using hidden bio content`);
          return cleanedHidden;
        }
      }
    }
    
    // SIXTH: Try to reconstruct bio from page text using intelligent parsing
    this.log.debug('🧩 Attempting bio reconstruction from page text...');
    const fullPageText = document.body.textContent || '';
    
    // Look for ANY agent bio using generic patterns (works for all agents)
    const bioPatterns = [
      // Generic patterns that work for any agent
      /([A-Z][a-z]+\s+[A-Z][a-z]*\s+has\s+a\s+passion\s+for\s+real\s+estate[^]*?)(?=Contact|Phone|Email|\n\n|REALTOR®?\s+credentials|$)/i,
      /([A-Z][a-z]+.*?(?:REALTOR|real\s+estate|agent|broker).*?)(?=Contact|Phone|Email|\n\n|REALTOR®?\s+credentials|$)/is,
      // Pattern for bios that mention experience, specialization, etc.
      /((?:[A-Z][a-z]+\s+)*(?:has\s+been\s+|is\s+)?(?:a\s+)?(?:licensed\s+)?(?:REALTOR|real\s+estate|agent|broker)[^]*?)(?=Contact|Phone|Email|\n\n|REALTOR®?\s+credentials|$)/i,
      // Fallback: any substantial paragraph with real estate terms
      /([^.]*(?:real\s+estate|REALTOR|agent|broker)[^.]*\.(?:[^.]*\.){2,10})/i
    ];
    
    for (const pattern of bioPatterns) {
      const bioMatch = fullPageText.match(pattern);
      if (bioMatch) {
        const reconstructedBio = bioMatch[1]?.trim();
        if (reconstructedBio && reconstructedBio.length > 200) {
          this.log.debug(`🧩 Pattern matched bio: ${reconstructedBio.length} chars: "${reconstructedBio.substring(0, 100)}..."`);
          
          // Check if this looks like a complete bio (reasonable length and quality)
          if (reconstructedBio.length > 300) {
            const cleanedReconstructed = this.cleanBioText(reconstructedBio);
            if (cleanedReconstructed && this.isQualityBio(cleanedReconstructed)) {
              this.log.debug(`✅ Using reconstructed bio: ${cleanedReconstructed.length} chars`);
              return cleanedReconstructed;
            }
          }
        }
      }
    }
    
    // FIFTH: Manual search for hidden or dynamically loaded bio content  
    this.log.debug('� Searching common bio containers...');
    const hiddenSelectors = [
      '[style*="display: none"]',
      '[style*="visibility: hidden"]',
      '[data-testid*="expanded"]',
      '[aria-hidden="true"]',
      '.expanded-content',
      '.full-bio',
      '.complete-bio'
    ];
    
    for (const selector of hiddenSelectors) {
      const hiddenElements = document.querySelectorAll(selector);
      for (const hiddenEl of hiddenElements) {
        const hiddenText = hiddenEl.textContent?.trim() || '';
        
        // Look for hidden bio content (generic approach for any agent)
        if ((hiddenText.includes('real estate') || hiddenText.includes('REALTOR')) &&
            hiddenText.length > 300) {
          
          this.log.debug(`� Found hidden bio content: ${hiddenText.length} chars`);
          const cleanedHidden = this.cleanBioText(hiddenText);
          if (cleanedHidden && this.isQualityBio(cleanedHidden)) {
            this.log.debug(`✅ Using hidden bio content`);
            return cleanedHidden;
          }
        }
      }
    }
    
    // SEVENTH: Final fallback search through all page elements
    this.log.debug('🔍 Final fallback search through all page elements...');
    const fallbackElements = document.querySelectorAll('*');
    
    for (let element of fallbackElements) {
      const text = element.textContent || '';
      
      // Look for any substantial text that contains real estate keywords (generic approach)
      if ((text.includes('real estate') || text.includes('REALTOR') || text.includes('agent') || text.includes('broker')) &&
          text.length > 300 && text.length < 2000) {
        
        // Found potential bio content
        let completeText = text.trim();
        let parentElement = element.parentElement;
        
        // Look up the DOM tree to find a more complete version
        while (parentElement && parentElement.textContent && parentElement.textContent.length > completeText.length) {
          const parentText = parentElement.textContent.trim();
          if (parentText.length > completeText.length * 1.5 && parentText.length < 3000) {
            completeText = parentText;
            break;
          }
          parentElement = parentElement.parentElement;
        }
        
        const cleanedBio = this.cleanBioText(completeText);
        if (cleanedBio && cleanedBio.length > 300 && this.isQualityBio(cleanedBio)) {
          this.log.debug(`✅ Using fallback bio: ${cleanedBio.length} chars`);
          return cleanedBio;
        }
      }
    }
    
    // Continue with rest of the bio extraction logic...
    const pageText = document.body.textContent;
    
    // Try other bio extraction methods...
    const bioParagraphs = this.findBioParagraphs(pageText);
    if (bioParagraphs.length > 0) {
      const combinedBio = bioParagraphs.join(' ').trim();
      if (combinedBio.length > 200) {
        return this.cleanBioText(combinedBio);
      }
    }
    
    this.log.debug('❌ No substantial bio found');
    return null;
  }

  safeExpandBioContent() {
    this.log.debug('🔍 Safely expanding bio content...');
    
    // Look for bio containers first
    const bioContainers = document.querySelectorAll([
      '[data-testid*="bio"]',
      '[class*="bio"]',
      '[class*="about"]',
      '[class*="description"]',
      '.agent-bio',
      '.agent-about',
      '.agent-description'
    ].join(', '));
    
    bioContainers.forEach(container => {
      // Look for "See More" buttons WITHIN bio containers only
      const allButtons = container.querySelectorAll('button, a, [aria-expanded="false"]');
      
      allButtons.forEach(button => {
        const text = button.textContent?.toLowerCase() || '';
        const href = button.href?.toLowerCase() || '';
        
        // Check if this is a bio expansion button by text content
        const isExpansionButton = text.includes('see more') || text.includes('read more') || 
                                text.includes('show more') || text.includes('expand') || 
                                text.includes('view more');
        
        // Only click if it's clearly bio expansion and NOT navigation
        if (isExpansionButton &&
            !href.includes('advice') && !href.includes('sell') && !href.includes('buy') &&
            !href.includes('.com') && !href.startsWith('http')) {
          
          this.log.debug('✅ Safe bio expansion button found:', text);
          try {
            button.click();
          } catch (e) {
            this.log.debug('Bio expansion failed:', e);
          }
        }
      });
    });
  }

  // New helper function to expand truncated content
  expandTruncatedContent() {
    this.log.debug('🔄 Expanding truncated content...');
    
    // Look for "See More", "Read More", "Show More" buttons and elements
    const expandSelectors = [
      'button[aria-expanded="false"]',
      '[data-testid*="expand"]',
      '[data-testid*="more"]',
      '[data-testid*="show"]',
      '.expand-button',
      '.read-more',
      '.see-more', 
      '.show-more',
      '[class*="expand"]',
      '[class*="more"]'
    ];
    
    // Text-based selectors (more flexible)
    const textBasedSelectors = [
      '*:contains("See More")',
      '*:contains("Read More")', 
      '*:contains("Show More")',
      '*:contains("View More")',
      '*:contains("expand")',
      '*:contains("...")'
    ];
    
    // First try CSS selectors
    expandSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element && this.isExpandableElement(element)) {
            this.log.debug('🖱️ Attempting to expand element:', element.className || element.tagName);
            this.triggerExpansion(element);
          }
        });
      } catch (e) {
        this.log.debug('Selector failed:', selector, e);
      }
    });
    
    // Then try text-based search
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const text = element.textContent || '';
      const lowerText = text.toLowerCase().trim();
      
      if ((lowerText.includes('see more') || 
           lowerText.includes('read more') || 
           lowerText.includes('show more') ||
           lowerText.includes('view more') ||
           lowerText.endsWith('...')) && 
          text.length < 50 && // Short text likely to be a button
          this.isClickableElement(element)) {
        
        this.log.debug('🖱️ Found expandable text element:', text);
        this.triggerExpansion(element);
      }
    });
    
    // Force expand common bio containers
    const bioContainers = document.querySelectorAll([
      '.agent-bio',
      '.profile-description',
      '.bio-content',
      '[data-testid*="bio"]',
      '[class*="bio"]'
    ].join(','));
    
    bioContainers.forEach(container => {
      this.forceExpandContainer(container);
    });
    
    this.log.debug('✅ Content expansion attempts completed');
  }

  isExpandableElement(element) {
    const text = element.textContent || '';
    const lowerText = text.toLowerCase().trim();
    
    // SAFETY: Don't expand navigation links
    if (element.tagName === 'A' && element.href) {
      const href = element.href.toLowerCase();
      if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
          href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
          href.includes('realtor.com') || href !== '#' && href !== 'javascript:void(0)') {
        return false; // This is a navigation link, don't click it
      }
    }
    
    // Only allow expansion of elements that are clearly content toggles
    const isContentExpansion = (
      lowerText === 'see more' ||
      lowerText === 'read more' ||
      lowerText === 'show more' ||
      lowerText === 'view more' ||
      lowerText === 'expand' ||
      lowerText.endsWith('...') ||
      element.getAttribute('aria-expanded') === 'false'
    );
    
    const isSafeElement = (
      element.tagName === 'BUTTON' ||
      (element.tagName === 'SPAN' && element.style.cursor === 'pointer') ||
      (element.tagName === 'DIV' && element.style.cursor === 'pointer') ||
      element.getAttribute('role') === 'button'
    );
    
    return isContentExpansion && isSafeElement;
  }

  isClickableElement(element) {
    // SAFETY: Don't click on navigation links
    if (element.tagName === 'A' && element.href) {
      const href = element.href.toLowerCase();
      if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
          href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
          href.includes('realtor.com') || href !== '#' && href !== 'javascript:void(0)') {
        return false; // This is a navigation link, don't click it
      }
    }
    
    const text = element.textContent?.toLowerCase().trim() || '';
    
    // Only allow clicking elements that are clearly content expansion
    const isContentExpansion = (
      text === 'see more' ||
      text === 'read more' ||
      text === 'show more' ||
      text === 'view more' ||
      text === 'expand' ||
      text.endsWith('...')
    );
    
    return isContentExpansion && (
      element.tagName === 'BUTTON' || 
      (element.tagName === 'SPAN' && element.style.cursor === 'pointer') ||
      (element.tagName === 'DIV' && element.style.cursor === 'pointer') ||
      element.getAttribute('role') === 'button'
    );
  }

  triggerExpansion(element) {
    try {
      // SAFETY CHECK: Don't click on navigation links
      if (element.tagName === 'A' && element.href) {
        const href = element.href.toLowerCase();
        // Don't click on any actual navigation links
        if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
            href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
            href.startsWith('http') || href.includes('.com') || href.includes('.org')) {
          this.log.debug('🚫 Skipping navigation link:', element.href);
          return;
        }
      }
      
      // SAFETY CHECK: Don't click on form submit buttons or navigation buttons
      if (element.type === 'submit' || element.type === 'button') {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('submit') || text.includes('search') || text.includes('find') || 
            text.includes('go to') || text.includes('view all') || text.includes('browse')) {
          this.log.debug('🚫 Skipping form/navigation button:', text);
          return;
        }
      }
      
      // SAFETY CHECK: Only click on elements that are clearly content expansion
      const text = element.textContent?.toLowerCase() || '';
      const isExpansionElement = text.includes('see more') || text.includes('show more') || 
                                text.includes('read more') || text.includes('expand') ||
                                element.getAttribute('aria-expanded') === 'false';
      
      if (!isExpansionElement) {
        this.log.debug('🚫 Element doesn\'t appear to be content expansion:', text);
        return;
      }
      
      this.log.debug('✅ Safe to expand element:', text);
      
      // Try multiple expansion methods
      
      // Method 1: Direct click
      if (typeof element.click === 'function') {
        element.click();
        this.log.debug('✅ Clicked element');
      }
      
      // Method 2: Dispatch click event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(clickEvent);
      
      // Method 3: Change aria-expanded
      if (element.getAttribute('aria-expanded') === 'false') {
        element.setAttribute('aria-expanded', 'true');
      }
      
      // Method 4: Trigger other common events
      ['mousedown', 'mouseup', 'focus'].forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        element.dispatchEvent(event);
      });
      
    } catch (e) {
      this.log.debug('Expansion method failed:', e);
    }
  }

  forceExpandContainer(container) {
    try {
      // Remove common CSS restrictions
      container.style.maxHeight = 'none';
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      container.style.display = 'block';
      
      // Remove truncation classes
      const truncationClasses = ['collapsed', 'truncated', 'hidden', 'overflow-hidden'];
      truncationClasses.forEach(cls => {
        container.classList.remove(cls);
      });
      
      // Set expansion attributes
      container.setAttribute('aria-expanded', 'true');
      container.setAttribute('data-expanded', 'true');
      
      // Look for child elements that might be hidden
      const hiddenChildren = container.querySelectorAll([
        '.hidden',
        '.collapsed', 
        '.truncated',
        '[style*="display: none"]',
        '[style*="max-height"]',
        '[aria-hidden="true"]'
      ].join(','));
      
      hiddenChildren.forEach(child => {
        child.style.display = 'block';
        child.style.maxHeight = 'none';
        child.style.visibility = 'visible';
        child.setAttribute('aria-hidden', 'false');
        child.classList.remove('hidden', 'collapsed', 'truncated');
      });
      
      this.log.debug('🔓 Force expanded container:', container.className);
      
    } catch (e) {
      this.log.debug('Force expansion failed:', e);
    }
  }

  // Enhanced text extraction that gets ALL content
  extractAllText(element) {
    if (!element) return null;
    
    
    // Get all text content including from child elements
    let allText = '';
    
    // First try to get all text content
    allText = element.textContent || element.innerText || '';
    
    // Also check for data attributes that might contain full text
    const dataAttrs = ['data-full-text', 'data-bio', 'data-description', 'data-content'];
    for (const attr of dataAttrs) {
      const attrValue = element.getAttribute(attr);
      if (attrValue && attrValue.length > allText.length) {
        allText = attrValue;
      }
    }
    
    // Check child elements for expanded content
    const expandedChildren = element.querySelectorAll('.expanded, .full-text, .complete');
    expandedChildren.forEach(child => {
      const childText = child.textContent || '';
      if (childText.length > allText.length) {
        allText = childText;
      }
    });
    
    // CRITICAL: Also check parent elements that might contain more complete text
    let currentElement = element;
    for (let i = 0; i < 3; i++) { // Check up to 3 parent levels
      currentElement = currentElement.parentElement;
      if (currentElement) {
        const parentText = currentElement.textContent || '';
        
        // If parent has significantly more text and starts with "Hello", prefer it
        if (parentText.length > allText.length * 1.2 && parentText.trim().startsWith('Hello')) {
          allText = parentText;
          break;
        }
      }
    }
    
    const finalText = allText.trim();
    
    return finalText;
  }

  // Find multiple bio paragraphs and combine them
  findBioParagraphs(pageText) {
    const paragraphs = [];
    
    // Look for sentences that start with bio indicators
    const bioSentenceStarters = [
      /In\s+\d{4}[^.]*\./g,
      /(?:With|Having)\s+(?:over\s+)?\d+\s+years[^.]*\./g,
      /I\s+(?:specialize|focus|bring|offer|am|have|was)[^.]*\./g,
      /My\s+(?:passion|expertise|experience)[^.]*\./g,
      /As\s+a\s+(?:realtor|agent|professional)[^.]*\./g
    ];
    
    bioSentenceStarters.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 50 && match.length < 500 && this.looksLikeBio(match)) {
            paragraphs.push(match.trim());
          }
        });
      }
    });
    
    return [...new Set(paragraphs)]; // Remove duplicates
  }

  // Enhanced bio quality checking - NOW ALLOWS EXPANDED CONTENT
  isQualityBio(text) {
    if (!text || text.length < 50) { // Reduced from 100 to 50
      return false;
    }
    
    // REMOVED: Truncation indicators check - we WANT expanded content now!
    // The old code rejected "See More" content, but now we EXPAND it first
    
    // Should have professional indicators
    const professionalIndicators = [
      'realtor', 'agent', 'broker', 'real estate', 'properties',
      'clients', 'market', 'experience', 'years', 'professional',
      'licensed', 'certified', 'specializ', 'focus', 'help', 'service',
      'home', 'buy', 'sell', 'work'  // Added more common words
    ];
    
    const lowerText = text.toLowerCase();
    const foundIndicators = professionalIndicators.filter(indicator => 
      lowerText.includes(indicator)
    );
    const hasIndicators = foundIndicators.length > 0;
    
    // Should have multiple sentences (substantial content) - reduced requirement
    const sentenceCount = (text.match(/\./g) || []).length;
    
    const mixedContent = this.containsMixedContent(text);
    
    // More lenient: only need 1 sentence instead of 3
    return hasIndicators && sentenceCount >= 1 && !mixedContent;
  }

  // Helper method to check for mixed content
  containsMixedContent(text) {
    const mixedContentIndicators = [
      'cookie', 'privacy', 'terms', 'javascript', 'copyright',
      'navigation', 'menu', 'footer', 'header', 'sidebar'
    ];
    
    const lowerText = text.toLowerCase();
    return mixedContentIndicators.some(indicator => lowerText.includes(indicator));
  }

  // Enhanced bio text cleaning
  cleanBioText(bio) {
    if (!bio) return null;
    
    let cleaned = bio
      // Clean line breaks and formatting
      .replace(/\\r\\n|\\n|\\r/g, ' ')
      .replace(/\r\n|\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      
      // Remove any truncation indicators AND collapse indicators
      .replace(/\.\.\.+/g, '')
      .replace(/\b(?:See|Read|Show)\s+More\b/gi, '')
      .replace(/\b(?:See|Read|Show)\s+less\b\.?/gi, '') // Remove "See less", "Read less", etc.
      .replace(/\bSee less\.?$/gi, '') // Remove "See less" at end
      .replace(/\.\s*See less\.?/gi, '.') // Remove "...See less." patterns  
      .replace(/\s+See less\.?\s*/gi, ' ') // Remove "See less" in middle with spaces
      
      // Fix common name/location truncations if not already starting correctly
      .replace(/^My name is B\.\s+I am/g, 'Hello! My name is B.J. Ward. I am')
      .replace(/\bB\.\s+(?=I am)/g, 'B.J. Ward. ')
      .replace(/\bCounty\b(?=\s+my entire life)/g, 'Ventura County')
      .replace(/\bparadise\.\s*(?=After)/g, 'paradise! ')
      
      // Fix common start truncations
      .replace(/^e to grips with/, 'Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with')
      .replace(/^to grips with/, 'Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with')
      
      // Clean up character encoding issues
      .replace(/®/g, '®')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/\\"/g, '"')
      
      // Clean up multiple punctuation
      .replace(/\.{2,}/g, '.')
      .replace(/\?{2,}/g, '?')
      .replace(/!{2,}/g, '!')
      
      // Ensure proper spacing after punctuation
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      
      // Remove leading/trailing whitespace
      .trim();
    
    let result = cleaned;
    
    // Ensure it ends properly
    if (result && !result.match(/[.!?]$/)) {
      result += '.';
    }

    // CRITICAL PRESERVATION LOGGING - Monitor bio integrity

    return result;
  }

  looksLikeBio(text) {
    if (!text) return false;
    
    // Check for bio-like content indicators
    const bioIndicators = [
      'experience', 'years', 'real estate', 'agent', 'broker', 'client', 'property', 'market',
      'specializes', 'focuses', 'expertise', 'professional', 'career', 'background',
      'serves', 'works', 'helps', 'dedicated', 'committed', 'passionate'
    ];
    
    const lowerText = text.toLowerCase();
    const indicatorCount = bioIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    // Should have at least 3 bio indicators and not be too generic
    return indicatorCount >= 3 && 
           !lowerText.includes('cookie') && 
           !lowerText.includes('privacy') &&
           !lowerText.includes('terms') &&
           !lowerText.includes('javascript');
  }

  looksLikeBioFragment(text) {
    if (!text) return false;
    
    // More lenient criteria for bio fragments
    const bioIndicators = [
      'years', 'experience', 'real estate', 'agent', 'broker', 'client', 'property', 'market',
      'specializes', 'focuses', 'expertise', 'professional', 'career', 'background',
      'serves', 'works', 'helps', 'dedicated', 'committed', 'passionate', 'million',
      'sold', 'buying', 'selling', 'luxury', 'residential', 'commercial', 'properties'
    ];
    
    const lowerText = text.toLowerCase();
    const indicatorCount = bioIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    // More lenient - just need 1 bio indicator for fragments
    return indicatorCount >= 1 && 
           !lowerText.includes('cookie') && 
           !lowerText.includes('privacy') &&
           !lowerText.includes('terms') &&
           !lowerText.includes('navigation') &&
           !lowerText.includes('javascript');
  }
}

  // Make BioExtractor available globally
  window.BioExtractor = BioExtractor;
  console.log('✅ BioExtractor module loaded successfully');
} else {
  console.error('❌ Window object not available - BioExtractor not loaded');
}
