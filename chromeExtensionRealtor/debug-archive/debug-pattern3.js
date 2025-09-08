// Test final pattern
const testUrl1 = 'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp';
const testUrl2 = 'https://ap.rdcpix.com/1662131925/55cacf0f7ee4ab045da5c6723f084e13a-e0rd-w144_r7.webp';

console.log('🔍 Testing final pattern...');

// Final pattern that handles all rdcpix variations
const pattern = /(.+\/(?:v[0-9]+\/)?[0-9a-f][0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;

console.log('Test 1 - Profile URL:');
console.log('URL:', testUrl1);
const match1 = testUrl1.match(pattern);
console.log('Match:', match1);
if (match1) {
  const base = match1[1];
  console.log('Enhanced:', `${base}-e0rd-w512.jpg`);
}

console.log('\nTest 2 - Property URL:');
console.log('URL:', testUrl2);
const match2 = testUrl2.match(pattern);
console.log('Match:', match2);
if (match2) {
  const base = match2[1];
  console.log('Enhanced:', `${base}-e0rd-w1024.jpg`);
}
