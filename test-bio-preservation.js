// Bio Preservation Test - Verify exact bio content we expect
console.log('🧪 BIO PRESERVATION TEST STARTING...');

const expectedBio = "Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with how fortunate we are to be able to live in this community and experience the quality of life that we are able to experience on a daily basis. This truly is paradise! After obtaining my broker license in 2004, I decided in January of 2005 to open and operate my own company, Comfort Real Estate Services. In 2005 we closed nearly $10 million in real estate sales.";

const actualBio = "My name is B. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of County my entire life and have yet to come to grips with how fortunate we are to be able to live in this community and experience the quality of life that we are able to experience on a daily basis. This truly is paradise. After obtaining my broker license in 2004, I decided in January of 2005 to open and operate my own company, Comfort Real Estate Services. In 2005 we closed nearly $.";

console.log('📊 BIO COMPARISON:');
console.log(`Expected length: ${expectedBio.length} characters`);
console.log(`Actual length: ${actualBio.length} characters`);
console.log(`Length difference: ${expectedBio.length - actualBio.length} characters`);

console.log('\n🔍 CONTENT ANALYSIS:');
console.log(`Expected starts with "Hello!": ${expectedBio.startsWith('Hello!') ? '✅' : '❌'}`);
console.log(`Actual starts with "Hello!": ${actualBio.startsWith('Hello!') ? '✅' : '❌'}`);

console.log(`Expected contains "B.J. Ward": ${expectedBio.includes('B.J. Ward') ? '✅' : '❌'}`);
console.log(`Actual contains "B.J. Ward": ${actualBio.includes('B.J. Ward') ? '✅' : '❌'}`);

console.log(`Expected contains "Ventura County": ${expectedBio.includes('Ventura County') ? '✅' : '❌'}`);
console.log(`Actual contains "Ventura County": ${actualBio.includes('Ventura County') ? '✅' : '❌'}`);

console.log(`Expected contains "$10 million": ${expectedBio.includes('$10 million') ? '✅' : '❌'}`);
console.log(`Actual contains "$10 million": ${actualBio.includes('$10 million') ? '✅' : '❌'}`);

console.log(`Expected ends properly: ${expectedBio.endsWith('sales.') ? '✅' : '❌'}`);
console.log(`Actual ends properly: ${actualBio.endsWith('sales.') ? '✅' : '❌'}`);

console.log('\n💡 KEY DIFFERENCES:');
console.log('1. Missing "Hello!" at start');
console.log('2. "B." instead of "B.J. Ward"');
console.log('3. "County" instead of "Ventura County"');
console.log('4. "paradise." instead of "paradise!"');
console.log('5. "nearly $." instead of "nearly $10 million in real estate sales."');

console.log('\n🎯 FIXES NEEDED:');
console.log('- Preserve opening "Hello!"');
console.log('- Preserve full name "B.J. Ward"');
console.log('- Preserve location "Ventura County"');
console.log('- Preserve sales figure "$10 million"');
console.log('- Preserve complete ending');

console.log('\n🔧 ROOT CAUSE:');
console.log('The bio extraction is finding truncated content, OR');
console.log('The bio cleaning is destroying the complete content.');
console.log('With our fixes, this should now preserve the full bio!');
