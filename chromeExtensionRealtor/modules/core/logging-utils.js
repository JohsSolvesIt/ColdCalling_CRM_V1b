// Logging utilities for Chrome Extension Data Extractor
// Centralized logging configuration and utilities

// ========================================
// LOGGING CONFIGURATION
// ========================================
// Use this to control how much logging the extension produces:
// - ERROR (0): Only critical errors (recommended for production)
// - WARN (1): Warnings and errors 
// - INFO (2): Basic operation info, warnings, and errors
// - DEBUG (3): All logs including detailed debug info (for development)
//
// NOTE: Recommendation extraction logs are ALWAYS shown regardless of log level
// to provide visibility into the core functionality requested by the user.

// Prevent redefinition if content script is loaded multiple times
if (typeof window.LOG_LEVELS_V2 === 'undefined') {
  window.LOG_LEVELS_V2 = {
    ERROR: 0,   // Only errors
    WARN: 1,    // Warnings and errors
    INFO: 2,    // Info, warnings, and errors
    DEBUG: 3    // All logs including debug
  };
}

// Export the LOG_LEVELS for use in other modules
const LOG_LEVELS_V2 = window.LOG_LEVELS_V2;

// Set to ERROR for minimal logging, INFO for moderate, DEBUG for verbose
const CURRENT_LOG_LEVEL = LOG_LEVELS_V2.DEBUG; // CHANGED TO DEBUG FOR TROUBLESHOOTING

// Conditional logging functions
const log = {
  error: (...args) => console.error(...args),
  warn: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.WARN && console.warn(...args),
  info: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.INFO && console.log(...args),
  debug: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.DEBUG && console.log(...args),
  // Special recommendation logging that always shows (excluded from verbose suppression)
  recommendation: (...args) => console.log(...args)
};

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.LOG_LEVELS_V2 = LOG_LEVELS_V2;
  window.log = log;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOG_LEVELS_V2, log, CURRENT_LOG_LEVEL };
}
