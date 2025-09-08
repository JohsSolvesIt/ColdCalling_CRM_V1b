// Debug test for URL pattern matching
const testUrl = 'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp';

console.log('🔍 Debugging URL pattern matching...');
console.log('URL:', testUrl);

// Test the first pattern
const pattern1 = /(.+\/[0-9]+\/[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const match1 = testUrl.match(pattern1);
console.log('Pattern 1:', pattern1);
console.log('Match 1:', match1);

// Test the second pattern
const pattern2 = /(.+\/v[0-9]+\/[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const match2 = testUrl.match(pattern2);
console.log('Pattern 2:', pattern2);
console.log('Match 2:', match2);

// Test a more general pattern
const pattern3 = /(.+\/(?:v[0-9]+|[0-9]+)\/[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const match3 = testUrl.match(pattern3);
console.log('Pattern 3 (combined):', pattern3);
console.log('Match 3:', match3);

if (match3) {
  const base = match3[1];
  console.log('Base:', base);
  console.log('Enhanced URL:', `${base}-e0rd-w512.jpg`);
}
