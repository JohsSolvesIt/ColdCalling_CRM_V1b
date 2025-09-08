/**
 * EXTENSION RELOAD INSTRUCTIONS
 * Follow these steps to reload the extension properly
 */

console.log('🔧 EXTENSION RELOAD INSTRUCTIONS');
console.log('=================================');

console.log('1. Open a new tab and go to: chrome://extensions/');
console.log('2. Find "Realtor Data Extractor" in the list');
console.log('3. Make sure the toggle switch is ON (blue)');
console.log('4. Click the RELOAD button (circular arrow icon) next to the toggle');
console.log('5. Come back to this realtor page');
console.log('6. Refresh this page (F5 or Ctrl+R)');
console.log('7. Run this test script again to verify:');

console.log(`
// QUICK TEST SCRIPT - Run this after reloading extension:
if (typeof window.ContactExtractor !== 'undefined') {
    console.log('✅ Extension loaded! Testing extraction...');
    const phone = window.ContactExtractor.extractCleanPhone();
    console.log('📞 Phone result:', phone);
} else {
    console.log('❌ Extension still not loaded');
}
`);

console.log('\n💡 ALTERNATIVE: If reload doesn\'t work, try:');
console.log('1. Disable the extension (toggle off)');
console.log('2. Enable it again (toggle on)');
console.log('3. Refresh this page');

console.log('\n🚨 IF STILL NOT WORKING:');
console.log('1. Check Chrome Developer Tools > Console for any error messages');
console.log('2. Check Chrome Developer Tools > Sources > Content Scripts');
console.log('3. Extension might need to be re-added to Chrome');

console.log('\n✅ Instructions complete - follow steps above!');
