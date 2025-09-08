// Reviews and Recommendations Extraction Module
// Extracted from content.js for modularization

window.ReviewsExtractor = class ReviewsExtractor {
  constructor() {
    this.maxRecommendations = 10;
    this.maxReviews = 5;
  }

  async extractReviews() {
    log.debug('🔍 Looking for reviews with anti-scrambling techniques...');
    
    const reviews = {
      overall: {},
      individual: [],
      recommendations: []
    };

    // Method 1: Enhanced overall rating extraction with better priority
    this.extractOverallRating(reviews);
    
    // Method 2: Enhanced review count extraction
    this.extractReviewCount(reviews);
    
    // Method 3: Structure-based review extraction (more resilient)
    this.extractIndividualReviewsStructural(reviews);
    
    // Method 4: Text-pattern based extraction (fallback)
    if (reviews.individual.length === 0) {
      this.extractReviewsByTextPatterns(reviews, document.body.textContent);
    }
    
    // Method 4.5: Try to expand testimonials before extracting them
    log.recommendation('🎯 Attempting to expand testimonials...');
    try {
      await this.expandTestimonials();
    } catch (error) {
      log.recommendation(`❌ Testimonial expansion failed: ${error.message}`);
    }
    
    // Method 5: Extract recommendations separately
    log.recommendation('🎯 Initiating recommendation extraction...');
    this.extractRecommendations(reviews);

    // Method 6: Generic page recommendation extraction (fallback for any website)
    if (reviews.recommendations.length < this.maxRecommendations) {
      log.recommendation(`🎯 Only found ${reviews.recommendations.length} recommendations, trying generic extraction...`);
      this.extractRecommendationsFromGenericPage(reviews);
    } else {
      log.recommendation(`🎯 Found sufficient recommendations (${reviews.recommendations.length}/${this.maxRecommendations}), skipping generic extraction`);
    }

    // Limit to 5 reviews maximum
    if (reviews.individual.length > this.maxReviews) {
      reviews.individual = reviews.individual.slice(0, this.maxReviews);
      log.debug(`🔄 Limited reviews to ${this.maxReviews} (was ${reviews.individual.length + (reviews.individual.length - this.maxReviews)})`);
    }

    // Limit to 10 recommendations maximum as requested
    if (reviews.recommendations.length > this.maxRecommendations) {
      reviews.recommendations = reviews.recommendations.slice(0, this.maxRecommendations);
      log.recommendation(`🔄 Limited recommendations to ${this.maxRecommendations} (was ${reviews.recommendations.length + (reviews.recommendations.length - this.maxRecommendations)})`);
    }

    // Update count to reflect actual valid reviews found
    if (reviews.individual.length === 0) {
      reviews.overall.count = 0;
      log.debug(`🔍 No valid reviews found, setting count to 0`);
    } else {
      // Only update count if we found actual reviews, otherwise keep original count for reference
      log.debug(`🔍 Found ${reviews.individual.length} valid reviews`);
    }

    log.recommendation(`🏆 Reviews extraction complete: ${reviews.individual.length} reviews, ${reviews.recommendations.length} recommendations`);
    
    // Print detailed recommendations to terminal
    if (reviews.recommendations.length > 0) {
      log.recommendation('\n📋 ===== EXTRACTED RECOMMENDATIONS =====');
      reviews.recommendations.forEach((rec, index) => {
        log.recommendation(`\n🎯 Recommendation ${index + 1}:`);
        log.recommendation(`   Author: ${rec.author}`);
        log.recommendation(`   Text: ${rec.text}`);
        if (rec.date) log.recommendation(`   Date: ${rec.date}`);
        if (rec.type) log.recommendation(`   Type: ${rec.type}`);
        log.recommendation(`   Source: ${rec.source}`);
        log.recommendation('   ─────────────────────────────────────');
      });
      log.recommendation('📋 ===== END RECOMMENDATIONS =====\n');
    } else {
      log.recommendation('❌ No recommendations found on this page');
    }
    
    return reviews;
  }

  // Placeholder methods - will be implemented in parts
  extractOverallRating(reviews) {
    log.debug('🌟 Looking for overall rating with multiple methods...');
    
    // Method 1: Specific selectors (may be scrambled)
    const ratingSelectors = [
      '[data-testid="overall-rating"]',
      '.overall-rating',
      '.rating-value',
      '.star-rating',
      '.rating-number',
      '.review-rating',
      '.agent-rating',
      '[aria-label*="star rating"]',
      '[aria-label*="out of 5"]',
      '[class*="rating"]',
      '[class*="star"]'
    ];

    // Get overall rating with improved detection
    for (const selector of ratingSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        const ariaLabel = element.getAttribute('aria-label');
        
        // Check for explicit rating patterns
        const explicitRating = text?.match(/^(\d+(?:\.\d+)?)\s*(?:star|out of|\/5)?$/i);
        if (explicitRating && parseFloat(explicitRating[1]) >= 1 && parseFloat(explicitRating[1]) <= 5) {
          reviews.overall.rating = explicitRating[1];
          log.debug(`✅ Found explicit rating: ${reviews.overall.rating} from selector: ${selector}`);
          break;
        }
        
        // Check aria-label for rating
        const ariaRating = ariaLabel?.match(/(\d+(?:\.\d+)?)\s*(?:star|out of 5)/i);
        if (ariaRating && parseFloat(ariaRating[1]) >= 1 && parseFloat(ariaRating[1]) <= 5) {
          reviews.overall.rating = ariaRating[1];
          log.debug(`✅ Found aria-label rating: ${reviews.overall.rating}`);
          break;
        }
        
        // Count filled stars
        const filledStars = element.querySelectorAll('[class*="filled"], [class*="active"], .star-filled, [aria-label*="filled"]');
        if (filledStars.length > 0 && filledStars.length <= 5) {
          reviews.overall.rating = filledStars.length.toString();
          log.debug(`✅ Found rating by counting ${filledStars.length} filled stars`);
          break;
        }
      }
      if (reviews.overall.rating) break;
    }

    // Enhanced review count extraction
    const reviewCountSelectors = [
      '[data-testid="review-count"]',
      '.review-count',
      '.total-reviews',
      '.reviews-total',
      '.review-summary',
      '[class*="review"][class*="count"]'
    ];

    for (const selector of reviewCountSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        const countMatch = text?.match(/(\d+)\s*(?:review|recommendation)/i);
        if (countMatch) {
          reviews.overall.count = countMatch[1];
          log.debug(`✅ Found review count: ${reviews.overall.count}`);
          break;
        }
      }
    }

    return reviews;
  }

  extractReviewCount(reviews) {
    log.debug('📊 Looking for review count...');
    
    // Method 1: Specific selectors
    const countSelectors = [
      '[data-testid="review-count"]',
      '.review-count',
      '.reviews-count',
      '[class*="count"]'
    ];

    for (const selector of countSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const countMatch = element.textContent?.match(/(\d+)\s*reviews?/i);
        if (countMatch) {
          reviews.overall.count = countMatch[1];
          log.debug(`✅ Found review count: ${reviews.overall.count}`);
          return;
        }
      }
    }

    // Method 2: Text pattern search
    const countPattern = /(\d+)\s*(?:reviews?|ratings?)/i;
    const pageText = document.body.textContent;
    const countTextMatch = pageText.match(countPattern);
    if (countTextMatch) {
      reviews.overall.count = countTextMatch[1];
      log.debug(`✅ Found count in text: ${reviews.overall.count}`);
    }
  }

  extractIndividualReviewsStructural(reviews) {
    log.debug('📝 Looking for individual reviews with structural approach...');
    
    // Look for review-like structures rather than specific classes
    const potentialReviewElements = [];
    
    // Find elements with review-like text patterns
    const allElements = document.querySelectorAll('div, article, section, li');
    
    allElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 50 && text.length < 2000) {
        // Check if it contains review-like phrases
        const reviewIndicators = [
          'helped me', 'helped us', 'worked with', 'excellent', 'recommend',
          'professional', 'knowledgeable', 'responsive', 'great experience',
          'bought', 'sold', 'purchase', 'sale', 'realtor', 'agent'
        ];
        
        const indicatorCount = reviewIndicators.filter(indicator => 
          text.toLowerCase().includes(indicator)
        ).length;
        
        if (indicatorCount >= 2) {
          potentialReviewElements.push(el);
        }
      }
    });

    log.debug(`📝 Found ${potentialReviewElements.length} potential review elements`);

    potentialReviewElements.slice(0, this.maxReviews).forEach((reviewEl, index) => {
      const reviewText = reviewEl.textContent?.trim();
      
      if (reviewText && this.isValidReviewContent(reviewText)) {
        const review = {
          id: index + 1,
          rating: this.extractReviewRating(reviewEl),
          text: this.cleanTextForCSV(reviewText),
          author: this.extractReviewAuthor(reviewEl),
          date: this.extractReviewDate(reviewEl),
          location: null,
          verified: this.checkIfVerified(reviewEl),
          type: null
        };
        
        reviews.individual.push(review);
        log.debug(`📝 Extracted structural review ${index + 1}: "${review.text.substring(0, 50)}..."`);
      }
    });
  }

  extractReviewsByTextPatterns(reviews, pageText) {
    // Pattern for verified reviews
    const verifiedPattern = /Verified (?:review|buyer|seller)\s*[:\-]?\s*([^]+?)(?=\n\n|\r\n\r\n|Verified|$)/gi;
    let match;
    
    while ((match = verifiedPattern.exec(pageText)) !== null) {
      const text = match[1]?.trim();
      if (text && this.isValidReviewContent(text) && text.length < 1000) {
        reviews.individual.push({
          text: this.cleanTextForCSV(text),
          verified: true,
          source: 'text_pattern'
        });
      }
    }

    // IMPROVED: Look for actual testimonial/recommendation sections in the page text
    const maxRecommendations = 10;
    let recommendationCount = reviews.recommendations.length;
    
    // Find large blocks of text that look like testimonials (more than 50 characters)
    const textBlocks = pageText.split(/\n\n+|\r\n\r\n+/).filter(block => 
      block.trim().length > 50 && 
      block.trim().length < 1000 &&
      this.isValidReviewContent(block.trim())
    );
    
    log.recommendation(`🔍 Found ${textBlocks.length} potential text blocks for recommendations`);
    
    textBlocks.forEach((block, index) => {
      if (recommendationCount >= maxRecommendations) return;
      
      const cleanBlock = block.trim();
      
      // Try to extract author from the text block
      let author = 'Anonymous';
      let text = cleanBlock;
      
      // Look for author patterns at the end of the text
      const authorEndPatterns = [
        /(.+?)\s*[-–—]\s*([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*$/,
        /(.+?)\s*[-–—]\s*([A-Z][a-z]+ [A-Z]\.)?\s*$/,
        /(.+?)\s*\-\s*([A-Z][a-z]+ [A-Z][a-z]*)\s*$/
      ];
      
      // Look for author patterns at the beginning of the text
      const authorStartPatterns = [
        /^([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*[-–—:]\s*(.+)$/,
        /^([A-Z][a-z]+ [A-Z]\.)?\s*[-–—:]\s*(.+)$/
      ];
      
      // Try end patterns first
      for (const pattern of authorEndPatterns) {
        const match = cleanBlock.match(pattern);
        if (match && match[2]) {
          text = match[1].trim();
          author = match[2].trim();
          break;
        }
      }
      
      // If no author found at end, try beginning
      if (author === 'Anonymous') {
        for (const pattern of authorStartPatterns) {
          const match = cleanBlock.match(pattern);
          if (match && match[1]) {
            author = match[1].trim();
            text = match[2].trim();
            break;
          }
        }
      }
      
      // Final validation - be more lenient with Anonymous authors
      if (text && text.length > 30 && this.isValidReviewContent(text)) {
        // Check if Anonymous author with prompt-like content should be skipped
        if (author === 'Anonymous') {
          const looksLikePrompt = (
            text.includes('Share your experience') ||
            text.includes('Write your first') ||
            text.includes('Tell us about') ||
            text.includes('Rate this agent') ||
            text.includes('Leave a review')
          );
          
          if (looksLikePrompt) {
            log.recommendation(`❌ Skipping prompt-like Anonymous text pattern: "${text.substring(0, 50)}..."`);
            return; // Skip this block
          }
        }
        
        const recommendation = {
          author: author,
          text: this.cleanTextForCSV(text),
          source: `text_pattern_${index + 1}`
        };
        
        // Check for duplicates
        const isDuplicate = reviews.recommendations.some(existing => 
          this.calculateTextSimilarity(existing.text, recommendation.text) > 0.8
        );
        
        if (!isDuplicate) {
          reviews.recommendations.push(recommendation);
          recommendationCount++;
          log.recommendation(`🎯 Text pattern recommendation ${recommendationCount}: "${author}" - "${text.substring(0, 50)}..."`);
        }
      }
    });
    
    log.recommendation(`🎯 Total recommendations after text patterns: ${recommendationCount}/${maxRecommendations}`);
  }

  extractRecommendations(reviews) {
    log.recommendation('🔍 Starting extractRecommendations method...');
    
    // FIRST: Try specific testimonials section extraction for Realtor.com
    this.extractRealtorTestimonials(reviews);
    
    // If we still need more, continue with general extraction
    if (reviews.recommendations.length < this.maxRecommendations) {
      log.recommendation(`🎯 Found ${reviews.recommendations.length} testimonials, continuing with general extraction...`);
      this.extractGeneralRecommendations(reviews);
    }
    
    log.recommendation(`🎯 Total recommendations extracted: ${reviews.recommendations.length}/${this.maxRecommendations}`);
    return reviews;
  }

  /**
   * Extract testimonials specifically from Realtor.com testimonials section
   */
  extractRealtorTestimonials(reviews) {
    log.recommendation('🏠 Looking for Realtor.com testimonials section...');
    
    // First, look specifically for testimonials heading with count
    const testimonialHeadings = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.trim() || '';
      return text.match(/testimonials?\s*\(\s*\d+\s*\)/i);
    });
    
    log.recommendation(`🔍 Found ${testimonialHeadings.length} testimonial heading sections`);
    
    if (testimonialHeadings.length > 0) {
      for (const heading of testimonialHeadings) {
        log.recommendation(`📋 Processing testimonial section: "${heading.textContent.trim()}"`);
        
        // Find the container that actually holds individual testimonials
        const testimonialContainer = this.findTestimonialContainer(heading);
        if (testimonialContainer) {
          log.recommendation(`✅ Found testimonial container for section`);
          this.extractIndividualTestimonials(testimonialContainer, reviews);
          
          // If we found testimonials, don't continue searching
          if (reviews.recommendations.length > 0) {
            return;
          }
        }
      }
    }
    
    // If no specific testimonials section found, look for testimonial patterns
    if (reviews.recommendations.length === 0) {
      log.recommendation('🔍 No testimonial section found, searching for individual testimonial patterns...');
      this.extractTestimonialsFromPatterns(reviews);
    }
  }

  /**
   * Find the container that holds individual testimonials
   */
  findTestimonialContainer(heading) {
    if (!heading) {
      return null;
    }
    
    let container = heading;
    
    // Look in the heading's parent containers for testimonial items
    while (container && container !== document.body) {
      container = container.parentElement;
      
      if (!container) {
        break;
      }
      
      // Look for multiple testimonial-like items within this container
      const testimonialItems = this.findIndividualTestimonialElements(container);
      
      if (testimonialItems.length >= 2) { // Must have at least 2 to be a testimonials container
        log.recommendation(`✅ Found testimonial container with ${testimonialItems.length} potential testimonials`);
        return container;
      }
    }
    
    return null;
  }

  /**
   * Find individual testimonial elements that contain actual testimonials
   */
  findIndividualTestimonialElements(container) {
    if (!container) {
      return [];
    }
    
    const testimonials = [];
    
    // Look for elements that match testimonial patterns
    const allElements = container.querySelectorAll('*');
    
    for (const element of allElements) {
      if (this.looksLikeTestimonial(element)) {
        // Make sure it's not a child of an already found testimonial
        const isChildOfExisting = testimonials.some(existing => existing.contains(element));
        if (!isChildOfExisting) {
          testimonials.push(element);
        }
      }
    }
    
    return testimonials;
  }

  /**
   * Check if an element looks like a testimonial
   */
  looksLikeTestimonial(element) {
    const text = element.textContent?.trim() || '';
    
    // Skip if too short or too long
    if (text.length < 50 || text.length > 2000) return false;
    
    // Skip navigation and UI elements
    if (this.isNavigationContent(text)) return false;
    
    // Skip JavaScript and code
    if (text.match(/\b(var|function|console|window|document|typeof|undefined)\b/)) return false;
    
    // Look for testimonial indicators:
    // 1. Contains quoted text or positive language
    // 2. Has a person's name (First Last format)
    // 3. Contains real estate related terms
    const hasQuotedText = text.includes('"') && text.match(/[.!?]/);
    const hasPersonName = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/) && 
                         !text.match(/\b(National Association|Real Estate|Realtor|NextHome|LLC|Inc|Corp)\b/i);
    const hasRealEstateTerms = text.match(/\b(agent|realtor|property|home|house|buy|sell|recommend|professional|help|service|experience|work|great|excellent)\b/i);
    
    // Must have at least 2 of these indicators
    const indicators = [hasQuotedText, hasPersonName, hasRealEstateTerms].filter(Boolean).length;
    return indicators >= 2;
  }

  /**
   * Extract individual testimonials from a container
   */
  extractIndividualTestimonials(container, reviews) {
    const testimonialElements = this.findIndividualTestimonialElements(container);
    
    log.recommendation(`🎯 Processing ${testimonialElements.length} potential testimonial elements`);
    
    for (let i = 0; i < testimonialElements.length && reviews.recommendations.length < this.maxRecommendations; i++) {
      const element = testimonialElements[i];
      const testimonial = this.parseRealTestimonial(element);
      
      if (testimonial && !this.isDuplicateTestimonial(testimonial, reviews.recommendations)) {
        const author = testimonial.author || 'Anonymous';
        
        // Be more lenient with Anonymous authors - only skip if text looks like a prompt
        if (author === 'Anonymous') {
          // Check if this looks like a real review vs a form prompt
          const text = testimonial.text || '';
          const looksLikePrompt = (
            text.includes('Share your experience') ||
            text.includes('Write your first') ||
            text.includes('Tell us about') ||
            text.length < 50 ||
            text.includes('Rate this agent') ||
            text.includes('Leave a review')
          );
          
          if (looksLikePrompt) {
            log.recommendation(`❌ Skipping prompt-like Anonymous text: "${text.substring(0, 60)}..."`);
            continue;
          } else {
            log.recommendation(`⚠️ Including Anonymous review with substantial content: "${text.substring(0, 60)}..."`);
          }
        }
        
        reviews.recommendations.push({
          id: reviews.recommendations.length + 1,
          text: testimonial.text,
          author: author,
          date: testimonial.date,
          type: 'testimonial',
          source: 'realtor-testimonial'
        });
        
        log.recommendation(`✅ Extracted testimonial: "${author}" - "${testimonial.text.substring(0, 60)}..."`);
      }
    }
  }

  /**
   * Parse a real testimonial from an element
   */
  parseRealTestimonial(element) {
    const fullText = element.textContent?.trim() || '';
    
    // Skip if it looks like navigation or code
    if (this.isNavigationContent(fullText) || 
        fullText.match(/\b(var|function|console|window|document)\b/)) {
      return null;
    }
    
    let testimonialText = '';
    let author = '';
    let date = '';
    
    // Method 1: Look for quoted testimonial with author
    const quotedMatch = fullText.match(/"([^"]+)"/);
    if (quotedMatch) {
      testimonialText = quotedMatch[1].trim();
      
      // Look for author after quote
      const afterQuote = fullText.substring(fullText.indexOf(quotedMatch[0]) + quotedMatch[0].length);
      const authorMatch = afterQuote.match(/[—–-]\s*([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (authorMatch) {
        author = authorMatch[1];
      }
    }
    
    // Method 2: Look for structured testimonial (author then text)
    if (!testimonialText) {
      // Look for author name at the beginning
      const authorFirstMatch = fullText.match(/^([A-Z][a-z]+ [A-Z][a-z]+)[,\s]+(.+)$/);
      if (authorFirstMatch) {
        const potentialAuthor = authorFirstMatch[1];
        const potentialText = authorFirstMatch[2];
        
        // Make sure it's not a business name
        if (!potentialAuthor.match(/\b(LLC|Inc|Corp|Realty|Properties|Group|Team|Associates)\b/i) &&
            potentialText.length > 30) {
          author = potentialAuthor;
          testimonialText = potentialText;
        }
      }
    }
    
    // Method 3: Extract from structured HTML
    if (!testimonialText) {
      const paragraphs = element.querySelectorAll('p, div');
      for (const p of paragraphs) {
        const text = p.textContent?.trim() || '';
        if (text.length > 30 && !this.looksLikeName(text) && !this.isNavigationContent(text)) {
          testimonialText = text;
          break;
        }
      }
      
      // Look for author in other elements
      if (testimonialText) {
        for (const p of paragraphs) {
          const text = p.textContent?.trim() || '';
          if (this.looksLikeName(text) && text !== testimonialText && text.length < 50) {
            author = text;
            break;
          }
        }
      }
    }
    
    // Extract date if present
    const dateMatch = fullText.match(/(\d+\s+years?\s+ago|\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}, \d{4})/i);
    if (dateMatch) {
      date = dateMatch[1];
    }
    
    // Validate testimonial
    if (testimonialText && 
        testimonialText.length >= 30 && 
        testimonialText.length <= 1000 &&
        this.isValidReviewContent(testimonialText) &&
        !testimonialText.match(/\b(overview|contact|navigation|menu|footer|header)\b/i)) {
      
      return {
        text: this.cleanTextForCSV(testimonialText),
        author: author || this.extractNameFromText(fullText) || 'Anonymous',
        date: date
      };
    }
    
    return null;
  }

  /**
   * Extract testimonials using patterns when no specific section found
   */
  extractTestimonialsFromPatterns(reviews) {
    // Look for elements containing testimonial-like content
    const allElements = document.querySelectorAll('*');
    const candidates = [];
    
    for (const element of allElements) {
      if (this.looksLikeTestimonial(element)) {
        candidates.push(element);
      }
    }
    
    log.recommendation(`🔍 Found ${candidates.length} testimonial candidates from patterns`);
    
    for (const candidate of candidates) {
      if (reviews.recommendations.length >= this.maxRecommendations) break;
      
      const testimonial = this.parseRealTestimonial(candidate);
      if (testimonial && !this.isDuplicateTestimonial(testimonial, reviews.recommendations)) {
        const author = testimonial.author || 'Anonymous';
        
        // Be more lenient with Anonymous authors - only skip if text looks like a prompt
        if (author === 'Anonymous') {
          const text = testimonial.text || '';
          const looksLikePrompt = (
            text.includes('Share your experience') ||
            text.includes('Write your first') ||
            text.includes('Tell us about') ||
            text.length < 50 ||
            text.includes('Rate this agent') ||
            text.includes('Leave a review')
          );
          
          if (looksLikePrompt) {
            log.recommendation(`❌ Skipping prompt-like Anonymous pattern text: "${text.substring(0, 60)}..."`);
            continue;
          } else {
            log.recommendation(`⚠️ Including Anonymous pattern review: "${text.substring(0, 60)}..."`);
          }
        }
        
        reviews.recommendations.push({
          id: reviews.recommendations.length + 1,
          text: testimonial.text,
          author: author,
          date: testimonial.date,
          type: 'testimonial',
          source: 'realtor-testimonial'
        });
        
        log.recommendation(`✅ Extracted pattern testimonial: "${author}" - "${testimonial.text.substring(0, 60)}..."`);
      }
    }
  }

  /**
   * Continue with general recommendation extraction (existing method)
   */
  extractGeneralRecommendations(reviews) {
    // Enhanced recommendation selectors to catch more patterns
    const recommendationSelectors = [
      '.recommendation',
      '.testimonial',
      '.review-recommendation',
      '.client-testimonial',
      '.agent-testimonial',
      '[data-testid*="recommendation"]',
      '[data-testid*="testimonial"]',
      '[class*="recommendation"]',
      '[class*="testimonial"]',
      '[class*="review"][class*="positive"]',
      '.client-review',
      '.customer-feedback',
      '.endorsement',
      '.praise',
      '.commendation',
      // Add more generic selectors for broader coverage
      '.quote',
      '.feedback',
      '.comment',
      'blockquote',
      '[class*="quote"]',
      '[class*="feedback"]',
      '[class*="comment"]',
      '[class*="story"]',
      '[class*="experience"]',
      // Look for review-like containers
      '[class*="review"]',
      '[id*="review"]',
      '[id*="testimonial"]',
      '[id*="recommendation"]'
    ];

    let recommendationElements = [];
    recommendationSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!recommendationElements.includes(el)) {
          recommendationElements.push(el);
        }
      });
    });

    log.recommendation(`🎯 Found ${recommendationElements.length} potential recommendation elements`);

    // Limit to remaining recommendations needed
    const maxRecommendations = this.maxRecommendations;
    let extractedCount = reviews.recommendations.length;

    recommendationElements.forEach((recEl, index) => {
      // Stop if we've reached the maximum
      if (extractedCount >= maxRecommendations) {
        return;
      }

      log.recommendation(`🔍 Processing recommendation element ${index + 1}...`);
      
      // Extract text content that's NOT the author and is substantial content
      let recText = null;
      const textSelectors = [
        'p',
        '.text', 
        '.content', 
        '.recommendation-text',
        '.testimonial-text',
        '.review-content',
        '.feedback-text',
        '[class*="text"]',
        '[class*="content"]',
        'div'
      ];
      
      // Look for text content
      for (const selector of textSelectors) {
        const textElements = recEl.querySelectorAll(selector);
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim();
          // Make sure it's substantial content
          if (text && text.length > 50 && !this.looksLikeName(text)) {
            recText = text;
            log.recommendation(`🔍 Found text from ${selector}: "${text.substring(0, 50)}..."`);
            break;
          }
        }
        if (recText) break;
      }
      
      // Fallback: use element's full text
      if (!recText) {
        recText = recEl.textContent?.trim();
      }
      
      if (recText && this.isValidReviewContent(recText) && recText.length > 30 && recText.length < 1000) {
        log.recommendation(`✅ Text passed validation checks`);
        
        // Extract author
        const author = this.extractAuthorFromElement(recEl) || 'Anonymous';
        
        // Be more lenient with Anonymous authors - only skip if text looks like a prompt
        if (author === 'Anonymous') {
          const looksLikePrompt = (
            recText.includes('Share your experience') ||
            recText.includes('Write your first') ||
            recText.includes('Tell us about') ||
            recText.length < 50 ||
            recText.includes('Rate this agent') ||
            recText.includes('Leave a review')
          );
          
          if (looksLikePrompt) {
            log.recommendation(`❌ Skipping prompt-like Anonymous structured text: "${recText.substring(0, 60)}..."`);
            return;
          } else {
            log.recommendation(`⚠️ Including Anonymous structured review: "${recText.substring(0, 60)}..."`);
          }
        }

        const recommendation = {
          id: extractedCount + 1,
          text: this.cleanTextForCSV(recText),
          author: author,
          date: this.getTextContent([
            '.date', 
            '.timestamp',
            '.review-date',
            'span:contains("ago")',
            'time'
          ], recEl),
          type: this.getTextContent([
            '.type',
            '.transaction-type',
            '.review-type'
          ], recEl),
          source: 'structured'
        };
        
        // Check for duplicates before adding
        const isDuplicate = reviews.recommendations.some(existing => 
          this.calculateTextSimilarity(existing.text, recommendation.text) > 0.8 ||
          (existing.author === recommendation.author && 
           this.calculateTextSimilarity(existing.text, recommendation.text) > 0.6)
        );
        
        if (!isDuplicate) {
          reviews.recommendations.push(recommendation);
          extractedCount++;
          log.recommendation(`🎯 Extracted recommendation ${extractedCount}: Author: "${recommendation.author}" | Text: "${recommendation.text.substring(0, 50)}..."`);
        } else {
          log.recommendation(`🔄 Skipped duplicate recommendation from "${recommendation.author}"`);
        }
      } else {
        log.recommendation(`❌ Text failed validation: isValid=${this.isValidReviewContent(recText)}, length=${recText?.length}`);
      }
    });
  }

  extractRecommendationsFromGenericPage(reviews) {
    log.recommendation('🎯 Performing enhanced recommendation extraction for generic pages...');
    
    const maxRecommendations = 10;
    let currentCount = reviews.recommendations.length;
    
    if (currentCount >= maxRecommendations) {
      log.recommendation(`🎯 Already have ${currentCount} recommendations, skipping generic extraction`);
      return;
    }

    // Look for common recommendation/testimonial containers
    const containerSelectors = [
      '.testimonials-section',
      '.recommendations-section',
      '.reviews-section',
      '.client-feedback',
      '.customer-reviews',
      '[id*="testimonial"]',
      '[id*="recommendation"]',
      '[id*="review"]',
      '[class*="testimonial"]',
      '[class*="recommendation"]',
      '[class*="review"]',
      '.praise',
      '.feedback',
      '.endorsement'
    ];

    const containers = [];
    containerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!containers.includes(el)) {
          containers.push(el);
        }
      });
    });

    log.recommendation(`🎯 Found ${containers.length} potential recommendation containers`);

    containers.forEach(container => {
      if (currentCount >= maxRecommendations) return;

      // Look for individual recommendation items within containers
      const itemSelectors = [
        '.item',
        '.card',
        '.block',
        '.entry',
        'blockquote',
        'article',
        'section',
        'div',
        'p'
      ];

      itemSelectors.forEach(selector => {
        if (currentCount >= maxRecommendations) return;

        const items = container.querySelectorAll(selector);
        items.forEach(item => {
          if (currentCount >= maxRecommendations) return;

          const text = item.textContent?.trim();
          if (text && this.isValidRecommendationText(text)) {
            const author = this.extractAuthorFromElement(item) || 'Anonymous';
            
            // Be more lenient with Anonymous authors - only skip if text looks like a prompt
            if (author === 'Anonymous') {
              const looksLikePrompt = (
                text.includes('Share your experience') ||
                text.includes('Write your first') ||
                text.includes('Tell us about') ||
                text.length < 50 ||
                text.includes('Rate this agent') ||
                text.includes('Leave a review')
              );
              
              if (looksLikePrompt) {
                log.recommendation(`❌ Skipping prompt-like Anonymous generic text: "${text.substring(0, 60)}..."`);
                return;
              } else {
                log.recommendation(`⚠️ Including Anonymous generic review: "${text.substring(0, 60)}..."`);
              }
            }
            
            // Check for duplicates
            const isDuplicate = reviews.recommendations.some(existing => 
              this.calculateTextSimilarity(existing.text, text) > 0.7 ||
              existing.author === author
            );

            if (!isDuplicate) {
              const recommendation = {
                id: currentCount + 1,
                text: this.cleanTextForCSV(text),
                author: author,
                date: this.extractDateFromGenericElement(item),
                source: 'generic_page'
              };

              reviews.recommendations.push(recommendation);
              currentCount++;
              log.recommendation(`🎯 Generic page recommendation ${currentCount}: "${author}" - "${text.substring(0, 50)}..."`);
            }
          }
        });
      });
    });

    log.recommendation(`🎯 Generic page extraction complete: ${currentCount}/${maxRecommendations} total recommendations`);
  }

  // Helper methods for generic extraction
  isValidRecommendationText(text) {
    if (!text || text.length < 30 || text.length > 1000) return false;

    // Positive indicators
    const positiveWords = [
      'recommend', 'excellent', 'outstanding', 'professional', 'helpful',
      'great', 'amazing', 'fantastic', 'wonderful', 'best', 'perfect',
      'exceeded', 'impressed', 'satisfied', 'grateful', 'thank you',
      'worked with', 'helped us', 'helped me', 'service', 'experience'
    ];

    // ENHANCED negative indicators
    const negativeWords = [
      'contact us', 'subscribe', 'newsletter', 'privacy policy', 'terms',
      'copyright', 'all rights reserved', 'menu', 'navigation', 'login',
      'register', 'search', 'filter', 'sort by', 'price range', 'last 24 months'
    ];

    const lowerText = text.toLowerCase();
    
    // Check for negative indicators first
    if (negativeWords.some(word => lowerText.includes(word))) {
      return false;
    }

    // Check for positive indicators
    const hasPositiveWords = positiveWords.some(word => lowerText.includes(word));
    
    // Check for sentence structure
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    const hasProperSentences = sentenceCount > 0 && text.length / sentenceCount > 15;

    return hasPositiveWords && hasProperSentences;
  }

  extractDateFromGenericElement(element) {
    const searchElements = [
      element,
      element.nextElementSibling,
      element.previousElementSibling,
      element.parentElement
    ].filter(el => el);

    for (const el of searchElements) {
      if (!el) continue;

      const text = el.textContent?.trim();
      if (!text) continue;

      // Look for various date patterns
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{1,2}-\d{1,2}-\d{4})/,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
        /(\d+\s+(?:days?|weeks?|months?|years?)\s+ago)/i,
        /(\d{4})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Expand testimonials by clicking "Show more testimonials" buttons
   */
  async expandTestimonials() {
    log.recommendation('🔍 Looking for "Show more testimonials" buttons to expand...');
    
    const showMoreSelectors = [
      'button:contains("Show more testimonials")',
      'a:contains("Show more testimonials")',
      '[data-testid*="show-more"]',
      '[data-testid*="expand"]',
      'button[class*="show-more"]',
      'button[class*="expand"]'
    ];
    
    // Also look for text-based show more buttons
    const allButtons = document.querySelectorAll('button, a, span[role="button"], div[role="button"]');
    let expandedCount = 0;
    
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase().trim();
      
      if (text === 'show more testimonials' || 
          text === 'show more' || 
          text === 'see more testimonials' ||
          text === 'load more testimonials' ||
          (text.includes('show') && text.includes('more') && text.includes('testimonial'))) {
        
        try {
          log.recommendation(`🎯 Found "Show more testimonials" button: "${button.textContent.trim()}"`);
          
          // Check if button is clickable
          if (button.offsetParent !== null && !button.disabled) {
            button.click();
            expandedCount++;
            log.recommendation(`✅ Clicked "Show more testimonials" button ${expandedCount}`);
            
            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Only click a few to avoid infinite loops
            if (expandedCount >= 2) break;
          }
        } catch (error) {
          log.recommendation(`❌ Failed to click testimonials expansion button: ${error.message}`);
        }
      }
    }
    
    if (expandedCount > 0) {
      log.recommendation(`🎯 Expanded ${expandedCount} testimonial sections, waiting for content...`);
      // Wait additional time for content to fully load
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } else {
      log.recommendation('❌ No "Show more testimonials" buttons found');
      return false;
    }
  }

  isValidReviewContent(text) {
    if (!text || text.length < 20) return false;
    
    // CRITICAL: Block navigation/UI elements that are contaminating testimonials
    const navigationPatterns = [
      /rating.*high.*low/i,
      /buyer.*reviews.*seller.*reviews/i, 
      /add.*testimonial/i,
      /overall.*rating.*add/i,
      /newest.*first.*rating/i,
      /\d+\.\d+.*responsiveness.*market.*expertise/i,
      /testimonials.*\(\d+\).*add/i,
      /reviews.*buyer.*reviews/i,
      /sort.*rating.*high/i,
      /filter.*newest.*first/i,
      /all.*reviews.*buyer.*seller/i,
      /responsiveness.*market.*expertise.*negotiation/i,
      // CRITICAL: Block all rating category content - these are NOT reviews
      /^(professionalism|responsiveness|market expertise|negotiation skills)\s*&?\s*communication\.?\s*$/i,
      /^\s*(professionalism|responsiveness|market|negotiation)\s*&?\s*communication\.?\s*$/i,
      /^(professionalism|responsiveness|market expertise|negotiation skills)\.?\s*$/i,
      /^professionalism\s*&\s*communication$/i,
      /^responsiveness$/i,
      /^market\s*expertise$/i,
      /^negotiation\s*skills$/i,
      // EXPANDED: Block any text that's just rating categories
      /^(professionalism|responsiveness|market|negotiation|communication)$/i,
      /^(overall\s*rating|buyer\s*agent|seller\s*agent)$/i,
      // Block standalone rating scores
      /^\d+\.\d+\s*$/,
      /^\d+\.\d+\s*out\s*of\s*\d+/i,
      // CRITICAL: Block review prompt text - these are UI prompts, not actual reviews
      /Ratings and reviews.*Did .* help you/i,
      /Did .* help you with your property/i,
      /Did .* help you.*property/i,
      // CRITICAL: Block navigation menu content that starts with repeated navigation items
      /^(Back|Overview|Contact information|REALTOR® credentials|Areas served|Listings and sales|Ratings and reviews|Testimonials)+/i,
      /^(BackOverview|OverviewOverview|OverviewContact)/i,
      /^(Back|Overview){2,}/i,
      // Block repetitive navigation text patterns
      /Overview.*Overview.*Contact.*information.*REALTOR.*credentials/i,
      /Contact.*information.*REALTOR.*credentials.*Areas.*served/i,
      /This agent is a REALTOR.*member of the National Association/i,
      // CRITICAL: Block Google Tag Manager and analytics code being extracted as testimonials
      /googletagmanager\.com/i,
      /gtm.*id=/i,
      /End Google/i,
      /Google Tag Manager/i,
      /GTM-[A-Z0-9]+/i,
      // Block other tracking/analytics content
      /facebook\.com.*sdk/i,
      /analytics\.js/i,
      /tracking.*code/i,
      // 🚨 NEW: Block main navigation content patterns that are contaminating reviews
      /^BuyHomes for sale.*Alabama.*homes for sale/i,
      /^Buy.*Homes for sale.*Alabama.*homes.*for.*sale/i,
      /^Homes for sale.*Alabama.*homes.*for.*sale.*Alabama.*foreclosures/i,
      /^SellHome selling tools.*Compare agents.*pick the right one/i,
      /^Sell.*Home selling tools.*Compare.*agents/i,
      /Buy.*Homes.*for.*sale.*Alabama.*foreclosures.*Alabama.*open.*houses/i,
      /Homes.*for.*sale.*Alabama.*foreclosures.*Alabama.*open.*houses.*New.*Construction/i,
      /SellHome.*selling.*tools.*Compare.*agents.*pick.*the.*right.*one.*Find.*the.*right.*selling/i,
      // Block any content that looks like site navigation with multiple repeated patterns
      /^(Buy|Sell|Rent|Mortgage|Find).*homes.*for.*sale.*Alabama/i,
      /Alabama.*homes.*for.*sale.*Alabama.*foreclosures.*Alabama.*open.*houses/i,
      /selling.*tools.*Compare.*agents.*pick.*the.*right.*one/i,
      /New.*Construction.*For.*Sale.*All.*Alabama.*new.*construction/i
      // NOTE: Show more testimonials is handled separately in expandTestimonials method
    ];

    // Check for navigation patterns first (PRIORITY CHECK)
    for (const pattern of navigationPatterns) {
      if (pattern.test(text)) {
        log.debug(`❌ Rejected navigation content: "${text.substring(0, 50)}..."`);
        return false;
      }
    }

    // SPECIAL CHECK: Detect and block review prompt patterns that might slip through
    if (text.toLowerCase().includes('ratings and reviews') && text.toLowerCase().includes('did') && text.toLowerCase().includes('help you')) {
      console.log('🚫 REVIEW EXTRACTION: Blocked review prompt text:', text.substring(0, 100));
      log.debug(`❌ Blocked review prompt: "${text}"`);
      return false;
    }
    
    // CRITICAL: Exclude agent bio content from being treated as reviews/recommendations
    const isBioContent = (
      text.includes('Hello! My name is') ||
      text.includes('I am the Broker/Owner of') ||
      text.includes('Comfort Real Estate Services') ||
      text.includes('I have lived in the gorgeous coastal region') ||
      text.includes('After obtaining my broker license') ||
      text.includes('we closed nearly $10 million') ||
      text.includes('B.J. Ward') ||
      text.startsWith('Hello!') ||
      // NEW: Block the specific bio text that's been showing up
      text.includes('In 2009, I was selected as one of REALTOR® Magazine\'s 30 under 30') ||
      text.includes('This was a tremendous honor as it attest to the success') ||
      text.includes('The magazine chooses just 30 agents, owners or managers under the age of 30') ||
      text.includes('30 under 30 across the nation to feature for their achievements') ||
      text.includes('REALTOR® Magazine\'s 30 under 30') ||
      text.includes('30 under 30') && text.includes('achievements in the real estate field') ||
      // Bio patterns
      (text.includes('real estate') && text.includes('experience') && text.includes('years') && text.length > 300) ||
      (text.includes('broker') && text.includes('licensed') && text.length > 200) ||
      // Achievement/award content (not customer reviews)
      (text.includes('selected') && text.includes('magazine') && text.includes('honor')) ||
      (text.includes('award') && text.includes('achievement') && text.length > 200)
    );
    
    if (isBioContent) {
      log.debug(`❌ Rejected bio content being treated as review: "${text.substring(0, 100)}..."`);
      return false;
    }
    
    // Filter out common form prompts and invalid content
    const invalidPatterns = [
      /No reviews provided yet/i,
      /No recommendations provided yet/i,
      /Did this agent help with your home/i,
      /Share your experience with this agent/i,
      /Share your experience working with/i,
      /Write.*first recommendation/i,
      /Connect with.*at.*Realty/i,
      /Full name.*Email.*Phone.*Message/i,
      /Recaptcha Response/i,
      /Send email/i,
      /By proceeding, you consent to receive/i,
      /calls and texts at the number you provided/i,
      /marketing by autodialer/i,
      /realtor\.com.*about your inquiry/i,
      /not as a condition of any purchase/i,
      /More\.\.\./i,
      /Contact details/i,
      /mobile.*Kristin L\. Arledge/i,
      // CRITICAL: Block the specific "Did [Agent Name] help you" prompts that are not reviews
      /Ratings and reviews.*Did .* help you with your property\?/i,
      /Did .* help you with your property\?/i,
      /Ratings and reviews.*Did .* help you/i,
      /Did .* help you.*property/i
    ];
    
    // Check if text matches any invalid patterns
    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        log.debug(`❌ Rejected invalid content: "${text.substring(0, 50)}..."`);
        return false;
      }
    }
    
    // Additional checks for form-like content AND NAVIGATION
    if (text.includes('EmailPhoneMessage') || 
        text.includes('Recaptcha') || 
        text.includes('Send email') ||
        text.includes('calls and texts') ||
        text.includes('autodialer') ||
        text.includes('rating (high to low)') ||     // Block rating filters
        text.includes('buyer reviews seller') ||     // Block review type filters  
        text.includes('add a testimonial') ||        // Block UI buttons
        text.includes('overall rating') ||           // Block rating widgets
        text.length < 30 ||                          // Too short to be meaningful
        text.length > 1200) {                        // Increased limit for full testimonials
      log.debug(`❌ Rejected form/navigation content: "${text.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
  }

  // Helper methods for individual review extraction
  extractReviewAuthor(element) {
    // Look for author in nearby elements or within the review element
    const authorPatterns = [
      'by ', 'from ', '- ', 'reviewed by ', 'customer: ', 'client: '
    ];
    
    const text = element.textContent || '';
    
    for (const pattern of authorPatterns) {
      const regex = new RegExp(pattern + '([A-Z][a-z]+(?: [A-Z][a-z]*)*)', 'i');
      const match = text.match(regex);
      if (match) {
        return match[1];
      }
    }
    
    // Look for name patterns at the end of the text
    const nameMatch = text.match(/([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*$/);
    if (nameMatch) {
      return nameMatch[1];
    }
    
    return null;
  }

  extractReviewRating(element) {
    // Try multiple approaches to find rating within review element
    const ratingSelectors = [
      '.rating', 
      '.review-rating', 
      '.stars', 
      '.star-rating',
      '.rating-value',
      '[aria-label*="star"]',
      '[class*="rating"]',
      '[class*="star"]'
    ];
    
    for (const selector of ratingSelectors) {
      const ratingEl = element.querySelector(selector);
      if (ratingEl) {
        const text = ratingEl.textContent?.trim();
        const ariaLabel = ratingEl.getAttribute('aria-label');
        
        // Check text content for explicit rating
        const textMatch = text?.match(/(\d+(?:\.\d+)?)/);
        if (textMatch && parseFloat(textMatch[1]) >= 1 && parseFloat(textMatch[1]) <= 5) {
          log.debug(`✅ Found review rating in text: ${textMatch[1]}`);
          return textMatch[1];
        }
        
        // Check aria-label
        const ariaMatch = ariaLabel?.match(/(\d+(?:\.\d+)?)\s*(?:star|out of)/i);
        if (ariaMatch && parseFloat(ariaMatch[1]) >= 1 && parseFloat(ariaMatch[1]) <= 5) {
          log.debug(`✅ Found review rating in aria-label: ${ariaMatch[1]}`);
          return ariaMatch[1];
        }
        
        // Count filled stars
        const filledStars = ratingEl.querySelectorAll('[class*="filled"], [class*="active"], .star-filled');
        if (filledStars.length > 0 && filledStars.length <= 5) {
          log.debug(`✅ Found review rating by counting stars: ${filledStars.length}`);
          return filledStars.length.toString();
        }
      }
    }
    
    return null;
  }

  extractReviewDate(element) {
    const dateSelectors = ['.review-date', '.date', '.timestamp', 'time'];
    for (const selector of dateSelectors) {
      const dateEl = element.querySelector(selector);
      if (dateEl) {
        const text = dateEl.textContent?.trim();
        const datetime = dateEl.getAttribute('datetime');
        
        // Return datetime attribute if available
        if (datetime) return datetime;
        
        // Look for date patterns in text
        const dateMatch = text?.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4}|\d+ \w+ ago)/i);
        if (dateMatch) return dateMatch[1];
      }
    }
    return null;
  }

  checkIfVerified(element) {
    const verifiedSelectors = ['.verified', '.verified-badge', '[class*="verified"]'];
    for (const selector of verifiedSelectors) {
      if (element.querySelector(selector)) return true;
    }
    
    const text = element.textContent?.toLowerCase() || '';
    return text.includes('verified') || text.includes('confirmed');
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  looksLikeName(text) {
    if (!text || text.length < 2 || text.length > 50) return false;
    
    // Basic name pattern: starts with capital letter, contains letters and spaces
    const namePattern = /^[A-Z][a-z]+(?:\s[A-Z][a-z]*)*(?:\s[A-Z]\.?)?$/;
    
    // Exclude common non-name words and patterns
    const excludeWords = [
      'Read More', 'Learn More', 'Contact', 'About', 'Home', 'Services',
      'Reviews', 'Testimonials', 'Menu', 'Search', 'Login', 'Register',
      'Write', 'Price', 'Experience', 'Bangor', 'Nexthome', 'Better Homes',
      'Berkshire Hathaway', 'ERA', 'Quinn Agency', 'Realty', 'Real Estate',
      'Agent', 'Broker', 'Office', 'Mobile', 'Phone', 'Email', 'Website',
      'Areas', 'Served', 'Specializations', 'Commercial', 'Residential',
      'Buyer', 'Seller', 'Land', 'Multi', 'Family', 'New Construction',
      'Foreclosures', 'Relocation', 'First Time', 'Vacation Homes',
      'Waterfront', 'Luxury', 'Investment', 'Property Management',
      'Anonymous', 'Verified', 'Client', 'Customer', 'User',
      // NEW: Block the specific invalid names we've been seeing
      'Sourced', 'Comfort Real E', 'Los Angeles', 'Camarillo', 'Oxnard',
      'Port Hueneme', 'Agoura Hills', 'Santa Paula', 'Ventura County',
      'California', 'Eleven', 'Twenty Nine', 'Realtor', 'Magazine'
    ];
    
    // Exclude text that contains phone numbers or prices
    if (text.match(/\d{3}-\d{4}|\$[\d,]+/)) {
      return false;
    }
    
    // Exclude very common single words that aren't names
    if (!text.includes(' ') && excludeWords.some(word => text.toLowerCase().includes(word.toLowerCase()))) {
      return false;
    }
    
    return namePattern.test(text) && !excludeWords.some(word => text.includes(word));
  }

  extractAuthorFromElement(element) {
    // Look for author in nearby elements or within the element
    const authorSelectors = [
      '.author', 
      '.name', 
      '.client-name',
      '.reviewer-name',
      '.customer-name',
      '.testimonial-author',
      'h3', 'h4', 'h5', 'h6',
      'strong', 'b',
      '[class*="name"]',
      '[class*="author"]'
    ];
    
    // Look for author in child elements
    for (const selector of authorSelectors) {
      const authorEl = element.querySelector(selector);
      if (authorEl) {
        const authorText = authorEl.textContent?.trim();
        // Check if it looks like a name (not too long, has proper name patterns)
        if (authorText && authorText.length < 50 && this.looksLikeName(authorText)) {
          return authorText;
        }
      }
    }
    
    // If no author found in structure, try a different approach
    // Look for the first text node that looks like a name
    const allTextElements = element.querySelectorAll('*');
    for (const el of allTextElements) {
      const text = el.textContent?.trim();
      // Skip if this element has children (we want leaf nodes)
      if (el.children.length === 0 && text && text.length < 50 && this.looksLikeName(text)) {
        // Make sure this isn't part of a longer recommendation text
        const parentText = el.parentElement?.textContent?.trim();
        if (parentText && text.length < parentText.length * 0.3) { // Name should be much shorter than parent content
          return text;
        }
      }
    }
    
    return null;
  }

  // Text cleaning method for CSV compatibility
  cleanTextForCSV(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Enhanced cleaning for review text and descriptions - comprehensive rating metadata removal
    let cleaned = text
      .replace(/\{[^}]*\}/g, '') // Remove CSS blocks
      .replace(/jsx-\d+/g, '') // Remove JSX class names
      
      // Remove overall rating patterns
      .replace(/Overall rating:\s*\d+\.\d+/gi, '') // "Overall rating:4.9"
      .replace(/Overall rating \(\d+\)/gi, '') // "Overall rating (5)" artifacts
      .replace(/Add rating and review\.?/gi, '') // "Add rating and review"
      
      // Remove "Name | Year" prefixes like "Belinda GillisAgoura | 2025"
      .replace(/^[A-Za-z\s]+\s*\|\s*\d{4}\s*/i, '')
      
      // Remove common review metadata and navigation text
      .replace(/\b(Show more|Read more|See more|Show less|Read less|See less)\b/gi, '')
      .replace(/\b(helpful|not helpful|thumbs up|thumbs down|report|flag)\b/gi, '')
      .replace(/\d+\s+(people|users)\s+found\s+this\s+(helpful|useful)/gi, '')
      
      // Clean up special characters and formatting
      .replace(/[""'']/g, '"') // Normalize quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/,+/g, ',') // Remove duplicate commas
      
      // CSV escaping: escape double quotes by doubling them
      .replace(/"/g, '""');
    
    return cleaned;
  }

  /**
   * Get text content from a list of selectors
   * @param {Array} selectors - Array of CSS selectors to try
   * @param {Element} parentElement - Parent element to search within (default: document)
   * @returns {string|null} - Found text content or null
   */
  getTextContent(selectors, parentElement = document) {
    for (const selector of selectors) {
      try {
        const element = parentElement.querySelector(selector);
        if (element && element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      } catch (error) {
        // Invalid selector, continue to next
        continue;
      }
    }
    return null;
  }

  /**
   * Check if text looks like navigation content
   */
  isNavigationContent(text) {
    if (!text || typeof text !== 'string') return true;
    
    const navPatterns = [
      /\b(menu|navigation|footer|header|copyright|privacy|terms|cookies|login|signup|sign up|register)\b/i,
      /\b(home|about|contact|services|buy|sell|rent|search|listings|agents)\b/i,
      /\b(show more|read more|see more|view all|load more|expand|collapse)\b/i,
      /\b(ratings and reviews|did .+ help you|write a review|leave a review)\b/i,
      /^(saved searches|no saved searches)/i,
      /\b(var|function|console|window|document|typeof|undefined|firstPartyError)\b/i, // JavaScript code
      /^[\s\n\r]*$/,  // Empty or whitespace only
    ];
    
    return navPatterns.some(pattern => pattern.test(text)) || 
           text.length < 10 || 
           text.split(' ').length < 5; // Too short to be meaningful content
  }

  /**
   * Extract name from text using patterns
   */
  extractNameFromText(text) {
    const nameMatches = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g);
    if (nameMatches) {
      // Return the first name that doesn't look like a location or company
      for (const name of nameMatches) {
        if (!name.match(/\b(realtor|realty|properties|group|team|associates|inc|llc|corp|National Association)\b/i)) {
          return name;
        }
      }
    }
    return null;
  }

  /**
   * Check if testimonial is duplicate
   */
  isDuplicateTestimonial(testimonial, existing) {
    return existing.some(item => 
      this.calculateTextSimilarity(item.text, testimonial.text) > 0.8 ||
      (item.author === testimonial.author && 
       this.calculateTextSimilarity(item.text, testimonial.text) > 0.6)
    );
  }
};

// Module loading confirmation
if (typeof window !== 'undefined') {
  console.log('✅ ReviewsExtractor module loaded successfully');
} else {
  console.error('❌ Window object not available - ReviewsExtractor not assigned');
}
