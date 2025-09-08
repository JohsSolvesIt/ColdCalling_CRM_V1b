// Test script for image quality enhancement
console.log('🧪 Testing Image Quality Enhancement');

// Mock the enhanceImageQuality method to test in isolation
class ImageEnhancer {
  enhanceImageQuality(url, isProfile = false) {
    if (!url || typeof url !== 'string') return url;
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return url;
    
    try {
      // Parse the URL to extract components
      const match = url.match(/(.+\/[0-9]+\/[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i);
      if (!match) return url;
      
      const base = match[1];
      
      // Determine target width based on image type
      const targetWidth = isProfile ? 512 : 1024;
      
      // Generate high-quality variant
      // Priority: remove rounding, set optimal width, prefer jpg for compatibility
      const enhancedUrl = `${base}-e0rd-w${targetWidth}.jpg`;
      
      console.log(`🖼️ Enhanced image quality: ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
      return enhancedUrl;
      
    } catch (error) {
      console.warn('⚠️ Failed to enhance image quality:', error);
      return url;
    }
  }

  // Generate multiple candidate URLs for robust image quality enhancement
  generateImageCandidates(url, isProfile = false) {
    if (!url || typeof url !== 'string') return [url];
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return [url];
    
    try {
      const match = url.match(/(.+\/[0-9]+\/[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i);
      if (!match) return [url];
      
      const base = match[1];
      const candidates = [];
      
      // Determine target widths based on image type
      const widths = isProfile ? [512, 600, 480, 400] : [1024, 1200, 900, 768];
      
      // 1) Primary: optimal width, no rounding, jpg format
      for (const w of widths) {
        candidates.push(`${base}-e0rd-w${w}.jpg`);
        candidates.push(`${base}-e0rd-w${w}_r0.jpg`);
      }
      
      // 2) Secondary: optimal width, preserve webp if that's what was original
      for (const w of widths) {
        candidates.push(`${base}-e0rd-w${w}.webp`);
      }
      
      // 3) Fallback: strip all transforms
      candidates.push(`${base}.jpg`);
      candidates.push(`${base}.webp`);
      
      // 4) Last resort: try original-like suffix for listing photos
      candidates.push(`${base}-o.jpg`);
      
      // Remove duplicates while preserving order
      const seen = new Set();
      const uniqueCandidates = candidates.filter(c => {
        if (seen.has(c)) return false;
        seen.add(c);
        return true;
      });
      
      // Always include original as final fallback
      if (!seen.has(url)) {
        uniqueCandidates.push(url);
      }
      
      return uniqueCandidates;
      
    } catch (error) {
      console.warn('⚠️ Failed to generate image candidates:', error);
      return [url];
    }
  }
}

// Test cases
const enhancer = new ImageEnhancer();

const testUrls = [
  // Realtor.com property photo (low res)
  'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp',
  
  // Realtor.com property photo (medium res)
  'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w480_r7.jpg',
  
  // Realtor.com profile photo (low res)
  'https://ap.rdcpix.com/987654321/a1b2c3d4e5f6789012345678901234567-e0rd-w100_r7.webp',
  
  // Non-rdcpix URL (should remain unchanged)
  'https://example.com/image.jpg',
  
  // Already high res rdcpix URL
  'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w1024.jpg'
];

console.log('\n📸 Testing Property Images (target: 1024px):');
testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. Original: ${url}`);
  const enhanced = enhancer.enhanceImageQuality(url, false);
  console.log(`   Enhanced: ${enhanced}`);
  console.log(`   Changed: ${url !== enhanced ? '✅ YES' : '❌ NO'}`);
});

console.log('\n👤 Testing Profile Images (target: 512px):');
testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. Original: ${url}`);
  const enhanced = enhancer.enhanceImageQuality(url, true);
  console.log(`   Enhanced: ${enhanced}`);
  console.log(`   Changed: ${url !== enhanced ? '✅ YES' : '❌ NO'}`);
});

console.log('\n✅ Test completed!');

// Test candidate generation
console.log('\n🔄 Testing Candidate Generation:');
const testUrl = 'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp';

console.log('\n📸 Property Image Candidates:');
const propertyCandidates = enhancer.generateImageCandidates(testUrl, false);
propertyCandidates.slice(0, 5).forEach((candidate, index) => {
  console.log(`${index + 1}. ${candidate}`);
});
console.log(`... and ${propertyCandidates.length - 5} more candidates`);

console.log('\n👤 Profile Image Candidates:');
const profileCandidates = enhancer.generateImageCandidates(testUrl, true);
profileCandidates.slice(0, 5).forEach((candidate, index) => {
  console.log(`${index + 1}. ${candidate}`);
});
console.log(`... and ${profileCandidates.length - 5} more candidates`);

console.log('\n🎯 Summary:');
console.log(`- Property candidates: ${propertyCandidates.length} URLs`);
console.log(`- Profile candidates: ${profileCandidates.length} URLs`);
console.log('- Original URL included as fallback: ✅');
