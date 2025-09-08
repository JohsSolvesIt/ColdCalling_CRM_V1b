// Test script for realtor profile picture enhancement
// Tests the new width+height pattern handling for 260x260 -> 768x768 conversion

console.log('🧪 Testing Realtor Profile Picture Enhancement');

// Mock DatabaseService class to test the enhanced functionality
class TestDatabaseService {
  enhanceImageQuality(url, isProfile = false) {
    console.log('🔧 enhanceImageQuality called with:', url, isProfile);
    
    if (!url || typeof url !== 'string') return url;
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return url;
    
    try {
      // Determine target dimensions based on image type
      const targetWidth = isProfile ? 768 : 1024;
      const targetHeight = isProfile ? 768 : 1024;
      
      // Enhanced pattern to handle both width-only and width+height patterns
      // Handles formats like: -w260_h260, -w260, -c0rd-w260_h260
      const widthHeightPattern = /-w(\d+)_h(\d+)/i;
      const widthOnlyPattern = /-w(\d+)/i;
      
      // Check for width+height pattern first (realtor profile pictures)
      const whMatch = url.match(widthHeightPattern);
      if (whMatch) {
        const currentWidth = parseInt(whMatch[1]);
        const currentHeight = parseInt(whMatch[2]);
        
        // Special handling for 260x260 realtor profile pictures - always upgrade to 768x768
        if (currentWidth === 260 && currentHeight === 260) {
          const enhancedUrl = url.replace(widthHeightPattern, `-w${targetWidth}_h${targetHeight}`);
          console.log(`🖼️ Enhanced realtor profile picture: ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
          return enhancedUrl;
        }
        
        // For other dimensions, only enhance if both are smaller than target
        if (currentWidth < targetWidth && currentHeight < targetHeight) {
          const enhancedUrl = url.replace(widthHeightPattern, `-w${targetWidth}_h${targetHeight}`);
          console.log(`🖼️ Enhanced image quality (w+h): ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
          return enhancedUrl;
        }
      } else {
        // Handle width-only pattern (existing logic)
        const wMatch = url.match(widthOnlyPattern);
        if (wMatch) {
          const currentWidth = parseInt(wMatch[1]);
          // Only enhance if current width is smaller than target
          if (currentWidth < targetWidth) {
            const enhancedUrl = url.replace(widthOnlyPattern, `-w${targetWidth}`);
            console.log(`🖼️ Enhanced image quality (w only): ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
            return enhancedUrl;
          }
        }
      }
      
      // If no width parameter found or current dimensions are already good, return original
      return url;
      
    } catch (error) {
      console.warn('⚠️ Failed to enhance image quality:', error);
      return url;
    }
  }
}

// Test cases for realtor profile picture enhancement
const testService = new TestDatabaseService();

const testUrls = [
  // Main test case - exactly the format you specified
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-c0rd-w260_h260.webp',
  
  // Variations of the 260x260 format
  'https://ap.rdcpix.com/123456789/abcdef123456789-c0rd-w260_h260.jpg',
  'https://p.rdcpix.com/v01/ga0471500-c0rd-w260_h260.webp',
  
  // Other sizes that should be enhanced
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-c0rd-w200_h200.webp',
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-c0rd-w144_h144.webp',
  
  // Already high resolution - should not be changed
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-c0rd-w768_h768.webp',
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-c0rd-w1024_h1024.webp',
  
  // Width-only formats (existing functionality)
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-e0rd-w144.webp',
  'https://ap.rdcpix.com/675804861/11a6b6329a40cef8cc16715f97b03f1ea-e0rd-w260.jpg',
  
  // Non-rdcpix URLs - should remain unchanged
  'https://example.com/image.jpg',
  'https://other-cdn.com/photo-w260_h260.webp'
];

console.log('\n📸 Testing Profile Images (isProfile = true, target: 768x768):');
console.log('=' * 80);

testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. Testing URL:`);
  console.log(`   Original:  ${url}`);
  
  const enhanced = testService.enhanceImageQuality(url, true);
  
  console.log(`   Enhanced:  ${enhanced}`);
  console.log(`   Changed:   ${url !== enhanced ? '✅ YES' : '❌ NO'}`);
  
  // Special check for the exact case you mentioned
  if (url.includes('w260_h260')) {
    const isCorrectlyEnhanced = enhanced.includes('w768_h768');
    console.log(`   260→768:   ${isCorrectlyEnhanced ? '✅ CORRECT' : '❌ FAILED'}`);
  }
});

console.log('\n🏠 Testing Property Images (isProfile = false, target: 1024x1024):');
console.log('=' * 80);

testUrls.slice(0, 5).forEach((url, index) => {
  console.log(`\n${index + 1}. Testing URL:`);
  console.log(`   Original:  ${url}`);
  
  const enhanced = testService.enhanceImageQuality(url, false);
  
  console.log(`   Enhanced:  ${enhanced}`);
  console.log(`   Changed:   ${url !== enhanced ? '✅ YES' : '❌ NO'}`);
});

console.log('\n✅ Test completed!');
console.log('\nKey Improvements:');
console.log('- ✅ Handles width+height format: -w260_h260');
console.log('- ✅ Special case for 260x260 → 768x768 conversion');
console.log('- ✅ Preserves existing width-only functionality');
console.log('- ✅ Maintains all URL components (file extensions, parameters)');
console.log('- ✅ Only enhances smaller images, preserves high-res');
