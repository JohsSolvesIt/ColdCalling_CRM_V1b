// Content polling utilities for Chrome Extension Data Extractor
// Handles DOM readiness and content stability polling

// Import logging utilities
// Note: In Chrome extensions, we'll use global variables for now
// const { log } = require('./logging-utils');

// ========================================
// POLLING UTILITIES FOR CONTENT READINESS
// ========================================
class ContentPollingManager {
  /**
   * Polls for content readiness using a predicate function
   * @param {Function} predicate - Function that returns true when content is ready
   * @param {Object} options - Polling configuration
   * @returns {Promise<boolean>} - Resolves to true if content is ready, false if timeout
   */
  static async pollForContent(predicate, options = {}) {
    const {
      maxAttempts = 50,
      interval = 100,
      timeout = 5000,
      description = 'content'
    } = options;

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts && (Date.now() - startTime) < timeout) {
      try {
        if (predicate()) {
          console.log(`✅ ${description} ready after ${attempts} attempts (${Date.now() - startTime}ms)`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Polling predicate error for ${description}:`, error.message);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.warn(`⏰ Polling timeout for ${description} after ${Date.now() - startTime}ms`);
    return false;
  }

  /**
   * Polls for DOM elements to appear
   */
  static async pollForElement(selector, options = {}) {
    return this.pollForContent(
      () => document.querySelector(selector) !== null,
      { ...options, description: `element "${selector}"` }
    );
  }

  /**
   * Polls for elements to disappear (useful for loading indicators)
   */
  static async pollForElementDisappear(selector, options = {}) {
    return this.pollForContent(
      () => document.querySelector(selector) === null,
      { ...options, description: `element "${selector}" to disappear` }
    );
  }

  /**
   * Polls for content stability (content doesn't change for a period)
   */
  static async pollForContentStability(selector, options = {}) {
    const { stabilityPeriod = 500, ...pollOptions } = options;
    let lastContent = '';
    let stableStart = null;

    return this.pollForContent(
      () => {
        const element = document.querySelector(selector);
        if (!element) return false;

        const currentContent = element.textContent || element.innerHTML;
        
        if (currentContent === lastContent) {
          if (!stableStart) stableStart = Date.now();
          return (Date.now() - stableStart) >= stabilityPeriod;
        } else {
          lastContent = currentContent;
          stableStart = null;
          return false;
        }
      },
      { ...pollOptions, description: `content stability for "${selector}"` }
    );
  }

  /**
   * Polls for listings content to load after tab clicks
   */
  static async pollForListingsLoad(options = {}) {
    return this.pollForContent(
      () => {
        // Check for loading indicators to disappear
        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="spinner"], .loading-content');
        if (loadingIndicators.length > 0) return false;

        // Check for actual listing content
        const listingElements = document.querySelectorAll(
          '[data-testid*="listing"], .listing-item, .property-card, [class*="listing-card"], [class*="property-item"]'
        );
        
        return listingElements.length > 0;
      },
      { ...options, description: 'listings content after tab click' }
    );
  }

  /**
   * Polls for bio content expansion to complete
   */
  static async pollForBioExpansion(expectedExpandedCount, options = {}) {
    return this.pollForContent(
      () => {
        // Check that "See More" buttons are gone or reduced
        const seeMoreButtons = Array.from(document.querySelectorAll('button, span, div')).filter(el => {
          const text = (el.textContent || '').toLowerCase().trim();
          return text.includes('see more') || text.includes('show more');
        });
        
        // Also check for expanded bio content
        const bioContainers = document.querySelectorAll(
          '[data-testid*="bio"], [class*="bio"], [class*="about"], .agent-description'
        );
        
        let hasExpandedContent = false;
        bioContainers.forEach(container => {
          const text = container.textContent || '';
          if (text.length > 200) { // Expanded content should be longer
            hasExpandedContent = true;
          }
        });

        return seeMoreButtons.length === 0 || hasExpandedContent;
      },
      { ...options, description: `bio expansion (${expectedExpandedCount} elements)` }
    );
  }
}

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.ContentPollingManager = ContentPollingManager;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentPollingManager };
}
