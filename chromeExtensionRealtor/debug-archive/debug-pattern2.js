// Test better patterns
const testUrl = 'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp';

console.log('🔍 Testing improved patterns...');
console.log('URL:', testUrl);

// Better pattern that handles both numeric and alphanumeric IDs
const pattern = /(.+\/(?:v[0-9]+\/)?[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const match = testUrl.match(pattern);
console.log('Improved Pattern:', pattern);
console.log('Match:', match);

if (match) {
  const base = match[1];
  console.log('Base:', base);
  console.log('Enhanced URL:', `${base}-e0rd-w512.jpg`);
}

// Test with the property URL too
const propertyUrl = 'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp';
console.log('\n🔍 Testing property URL...');
console.log('URL:', propertyUrl);
const propertyMatch = propertyUrl.match(pattern);
console.log('Match:', propertyMatch);
if (propertyMatch) {
  const base = propertyMatch[1];
  console.log('Base:', base);
  console.log('Enhanced URL:', `${base}-e0rd-w1024.jpg`);
}
