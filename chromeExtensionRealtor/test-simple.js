// SIMPLE TEST CONTENT SCRIPT
console.log('🚨 TEST EXTENSION LOADED! 🚨');
console.log('URL:', window.location.href);
console.log('Time:', new Date().toLocaleTimeString());

// Test if we can access DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚨 DOM READY - TEST EXTENSION WORKING! 🚨');
  });
} else {
  console.log('🚨 DOM ALREADY READY - TEST EXTENSION WORKING! 🚨');
}

// Set a global variable to confirm script loaded
window.TEST_EXTENSION_LOADED = true;
