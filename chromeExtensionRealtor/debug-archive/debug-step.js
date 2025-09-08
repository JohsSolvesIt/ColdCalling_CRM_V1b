// Debug step by step
const testUrl = 'https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp';

console.log('🔍 Step by step debugging...');
console.log('URL:', testUrl);

// Try simpler patterns
console.log('\n1. Basic structure check:');
console.log('Contains rdcpix.com:', testUrl.includes('rdcpix.com'));

console.log('\n2. Test parts separately:');
const parts = testUrl.split('/');
console.log('URL parts:', parts);

console.log('\n3. Pattern attempts:');

// Try to match just the ID part
const idPattern1 = /ga[0-9a-f]+/i;
const idMatch1 = testUrl.match(idPattern1);
console.log('ID pattern 1 (ga[0-9a-f]+):', idMatch1);

// Try broader pattern
const broadPattern = /(.+\/(?:v[0-9]+\/)?[a-z]*[0-9a-f]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const broadMatch = testUrl.match(broadPattern);
console.log('Broad pattern:', broadMatch);

// Try even simpler
const simplePattern = /(.+\/)([^\/]+)(?:-[^.]*)?\.(?:webp|jpg|jpeg|png)$/i;
const simpleMatch = testUrl.match(simplePattern);
console.log('Simple pattern:', simpleMatch);

if (simpleMatch) {
  const [, basePath, id] = simpleMatch;
  console.log('Base path:', basePath);
  console.log('ID:', id);
  console.log('Reconstructed:', `${basePath}${id}-e0rd-w512.jpg`);
}
