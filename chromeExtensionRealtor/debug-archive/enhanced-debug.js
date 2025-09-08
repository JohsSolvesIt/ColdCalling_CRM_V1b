// Enhanced debug test for URL pattern matching
const testUrls = [
  'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp',
  'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp',
  'https://p.rdcpix.com/v01/ga0471500-c0rd-w144.webp',
  'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144.jpg'
];

console.log('🔍 Enhanced URL pattern analysis...');

testUrls.forEach((url, index) => {
  console.log(`\n--- Test URL ${index + 1} ---`);
  console.log('URL:', url);
  
  // More comprehensive pattern that captures all parts
  const pattern = /^(.+rdcpix\.com\/(?:v\d+\/)?[^\/]+)\/([\w\d\-_]+)(-\w+rd)?(-w)(\d+)(_r\d+)?\.(\w+)$/i;
  const match = url.match(pattern);
  
  if (match) {
    console.log('✅ Match found!');
    console.log('Groups:', {
      fullBase: match[1],
      id: match[2], 
      transform: match[3] || '',
      widthPrefix: match[4] || '',
      currentWidth: match[5],
      rounding: match[6] || '',
      extension: match[7]
    });
    
    // Build enhanced URL
    const base = match[1] + '/' + match[2];
    const transform = match[3] || '-e0rd';
    const newWidth = '512'; // example
    const rounding = match[6] || '';
    const extension = match[7];
    
    const enhanced = `${base}${transform}-w${newWidth}${rounding}.${extension}`;
    console.log('Enhanced:', enhanced);
  } else {
    console.log('❌ No match');
    
    // Try simpler approach - just replace width
    const simplePattern = /(-w)(\d+)/i;
    const simpleMatch = url.match(simplePattern);
    if (simpleMatch) {
      const enhanced = url.replace(simplePattern, '$1512');
      console.log('Simple replacement:', enhanced);
    }
  }
});
