// Debug script to check extension timeout settings and test React fixes

console.log('🔍 Checking Extension Timeout Settings...');

// Check if the enhanced auto-extraction system is loaded
if (typeof window.extractor !== 'undefined' && window.extractor) {
  console.log('✅ Extractor found');
  
  // Check for the enhanced auto-extraction method
  if (typeof window.extractor.enhancedAutoExtract === 'function') {
    console.log('✅ Enhanced auto-extraction system detected');
    
    // Extract timeout configuration from method
    const methodSource = window.extractor.enhancedAutoExtract.toString();
    
    // Look for timeout values
    const timeoutMatches = methodSource.match(/(\w+):\s*{\s*idle:\s*(\d+),\s*total:\s*(\d+)\s*}/g);
    if (timeoutMatches) {
      console.log('📊 Found timeout configurations:');
      timeoutMatches.forEach(match => {
        console.log('  ' + match);
      });
    }
    
    // Look for property limit
    const propertyLimitMatch = methodSource.match(/MAX_PROPERTIES_PER_AGENT\s*=\s*(\d+)/);
    if (propertyLimitMatch) {
      console.log('🏠 Property limit:', propertyLimitMatch[1]);
    }
    
  } else {
    console.log('❌ Enhanced auto-extraction not found');
    console.log('Available extractor methods:', Object.keys(window.extractor));
  }
} else {
  console.log('❌ Window.extractor not found');
  console.log('Available window properties:', Object.keys(window).filter(k => k.includes('extract')));
}

// Check for any global timeout variables
console.log('\n🔍 Checking for global timeout variables...');
const timeoutVars = Object.keys(window).filter(key => 
  key.toLowerCase().includes('timeout') || 
  key.toLowerCase().includes('timer')
);
console.log('Found timeout-related variables:', timeoutVars);

// Test auto-extraction if ?autoExtract=true is in URL
if (window.location.search.includes('autoExtract=true')) {
  console.log('\n🎯 Auto-extraction parameter detected!');
  console.log('URL:', window.location.href);
  
  // Check if extraction has started
  if (window.extractionStarted) {
    console.log('✅ Extraction already started');
  } else {
    console.log('⏳ Extraction should start automatically...');
  }
} else {
  console.log('\n💡 To test auto-extraction, add ?autoExtract=true to the URL');
}

// Quick summary
console.log('\n📋 TIMEOUT SUMMARY:');
console.log('Agent: 30 seconds hard limit');
console.log('Listings: 60 seconds hard limit OR 20 properties');
console.log('Recommendations: 20 seconds hard limit');
console.log('Total possible: ~110 seconds maximum');

console.log('\n🚀 Run this script on a realtor.com page to test the extension!');