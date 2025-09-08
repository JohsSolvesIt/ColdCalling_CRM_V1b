// Test file for image quality enhancement
console.log('🧪 Testing Image Quality Enhancement...');

// Test the enhanceImageQuality method
function testImageEnhancement() {
  // Mock RealtorDataExtractor class with just the needed methods
  class TestExtractor {
    enhanceImageQuality(url, isProfile = false) {
      if (!url || typeof url !== 'string') return url;
      
      // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
      if (!url.includes('rdcpix.com')) return url;
      
      try {
        // Determine target width based on image type
        const targetWidth = isProfile ? 512 : 1024;
        
        // Simple approach: just replace the width parameter while preserving everything else
        const widthPattern = /-w(\d+)/i;
        const match = url.match(widthPattern);
        
        if (match) {
          const currentWidth = match[1];
          // Only enhance if current width is smaller than target
          if (parseInt(currentWidth) < targetWidth) {
            const enhancedUrl = url.replace(widthPattern, `-w${targetWidth}`);
            console.log(`🖼️ Enhanced: ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
            return enhancedUrl;
          }
        }
        
        // If no width parameter found or current width is already good, return original
        return url;
        
      } catch (error) {
        console.warn('⚠️ Failed to enhance image quality:', error);
        return url;
      }
    }
  }

  const extractor = new TestExtractor();
  
  // Test cases with corrected expected results (preserving extension and _r7)
  const testCases = [
    {
      type: 'profile',
      input: 'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp',
      expected: 'https://p.rdcpix.com/v01/ga0471500-c0rd-w512_r7.webp'
    },
    {
      type: 'property', 
      input: 'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp',
      expected: 'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w1024_r7.webp'
    },
    {
      type: 'non-rdcpix',
      input: 'https://example.com/image.jpg',
      expected: 'https://example.com/image.jpg'
    },
    {
      type: 'already-high-resolution',
      input: 'https://p.rdcpix.com/v01/ga0471500-c0rd-w2048_r7.webp',
      expected: 'https://p.rdcpix.com/v01/ga0471500-c0rd-w2048_r7.webp'
    }
  ];

  console.log('\n🚀 Running test cases...');
  
  testCases.forEach((testCase, index) => {
    const result = extractor.enhanceImageQuality(testCase.input, testCase.type === 'profile');
    const passed = result === testCase.expected;
    
    console.log(`\nTest ${index + 1} (${testCase.type}):`);
    console.log(`  Input:    ${testCase.input}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Result:   ${result}`);
    console.log(`  Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  console.log('\n🏁 Test completed!');
}

// Run tests
testImageEnhancement();
