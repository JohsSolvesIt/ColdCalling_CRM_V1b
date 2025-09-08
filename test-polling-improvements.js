// Test script to verify polling improvements in Chrome extension
// Run this in a browser console to test the ContentPollingManager

console.log('🧪 Testing ContentPollingManager improvements...');

// Test 1: Basic polling functionality
async function testBasicPolling() {
  console.log('🔧 Test 1: Basic polling functionality');
  
  // Create a test element after a delay
  setTimeout(() => {
    const testEl = document.createElement('div');
    testEl.id = 'test-polling-element';
    testEl.textContent = 'Test element for polling';
    document.body.appendChild(testEl);
  }, 200);
  
  const startTime = Date.now();
  const result = await ContentPollingManager.pollForElement('#test-polling-element', {
    maxAttempts: 20,
    interval: 50,
    timeout: 2000
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ Element polling result: ${result}, elapsed: ${elapsed}ms`);
  
  // Cleanup
  const el = document.getElementById('test-polling-element');
  if (el) el.remove();
}

// Test 2: Content stability polling
async function testContentStability() {
  console.log('🔧 Test 2: Content stability polling');
  
  // Create a changing element
  const testEl = document.createElement('div');
  testEl.id = 'test-stability-element';
  testEl.textContent = 'Initial content';
  document.body.appendChild(testEl);
  
  // Change content a few times
  let changeCount = 0;
  const changeInterval = setInterval(() => {
    changeCount++;
    testEl.textContent = `Content change ${changeCount}`;
    
    if (changeCount >= 3) {
      clearInterval(changeInterval);
    }
  }, 100);
  
  const startTime = Date.now();
  const result = await ContentPollingManager.pollForContentStability('#test-stability-element', {
    maxAttempts: 30,
    interval: 50,
    timeout: 3000,
    stabilityPeriod: 300
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ Stability polling result: ${result}, elapsed: ${elapsed}ms`);
  
  // Cleanup
  testEl.remove();
}

// Test 3: Timeout behavior
async function testTimeout() {
  console.log('🔧 Test 3: Timeout behavior');
  
  const startTime = Date.now();
  const result = await ContentPollingManager.pollForElement('#non-existent-element', {
    maxAttempts: 5,
    interval: 100,
    timeout: 600
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ Timeout test result: ${result}, elapsed: ${elapsed}ms (should be ~600ms)`);
}

// Run all tests
async function runTests() {
  try {
    await testBasicPolling();
    await testContentStability();
    await testTimeout();
    console.log('🎉 All polling tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Check if ContentPollingManager exists and run tests
if (typeof ContentPollingManager !== 'undefined') {
  runTests();
} else {
  console.error('❌ ContentPollingManager not found. Make sure content.js is loaded.');
}
