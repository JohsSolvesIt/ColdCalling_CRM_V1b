/**
 * SCRIPT LOADING DIAGNOSTIC - Check if modules are being loaded
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🔍 SCRIPT LOADING DIAGNOSTIC');
console.log('============================');

// Check if scripts are loaded by looking for their console messages
console.log('\n📋 Looking for module loading messages in console...');
console.log('   (Check above in console for "✅ ContactExtractor module loaded" messages)');

// Check current loaded scripts
const scripts = document.querySelectorAll('script');
console.log(`\n📄 Total scripts loaded: ${scripts.length}`);

const extensionScripts = Array.from(scripts).filter(script => 
  script.src && (script.src.includes('chrome-extension') || script.src.includes('moz-extension'))
);

console.log(`📦 Extension scripts: ${extensionScripts.length}`);
extensionScripts.forEach((script, i) => {
  const url = script.src;
  const fileName = url.split('/').pop();
  console.log(`  ${i + 1}. ${fileName}`);
});

// Test if we can access any global variables that should be set
console.log('\n🔍 Global variable check:');
const globals = [
  'log', 'window.log', 'AgentExtractor', 'BioExtractor', 
  'ContactExtractor', 'ReviewsExtractor', 'PhotoExtractor', 
  'ListingsExtractor', 'RealtorDataExtractor', 'extractor'
];

globals.forEach(varName => {
  try {
    const value = eval(varName);
    console.log(`✅ ${varName}:`, typeof value);
  } catch (e) {
    console.log(`❌ ${varName}: not defined`);
  }
});

console.log('\n✅ Script loading diagnostic complete');
