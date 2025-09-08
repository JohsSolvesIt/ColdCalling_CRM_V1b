// SUPER SIMPLE EXTENSION TEST
console.log('🚨🚨🚨 EXTENSION TEST SCRIPT LOADED 🚨🚨🚨');
console.log('URL:', window.location.href);
console.log('Time:', new Date().toLocaleTimeString());

// Add a visible element to the page
const testDiv = document.createElement('div');
testDiv.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: red;
  color: white;
  padding: 10px;
  border: 2px solid yellow;
  z-index: 99999;
  font-size: 16px;
  font-weight: bold;
`;
testDiv.textContent = 'EXTENSION LOADED!';
document.body.appendChild(testDiv);

// Auto-remove after 5 seconds
setTimeout(() => {
  if (testDiv.parentNode) {
    testDiv.parentNode.removeChild(testDiv);
  }
}, 5000);
