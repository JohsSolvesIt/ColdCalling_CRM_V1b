#!/usr/bin/env node

// Test bio extraction patterns

const fullExpectedBio = `Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with how fortunate we are to be able to live in this community and experience the quality of life that we are able to experience on a daily basis. This truly is paradise! After obtaining my broker license in 2004, I decided in January of 2005 to open and operate my own company, Comfort Real Estate Services. In 2005 we closed nearly $10 million in real estate sales and have been going strong ever since. In 2009, I was selected as one of REALTOR® Magazine's "30 under 30". This was a tremendous honor as it attest to the success of individual agents in their specific markets. The magazine chooses just 30 agents, owners or managers under the age of 30 across the nation to feature for their achievements in the real estate field. Not only was I chosen as one of the 30, but I was selected to be one of the 5 agents for the cover. This honor was a complete testament to the loyalty of my clients and the quality of agents that make up the Comfort team. As the years go on Comfort Real Estate Services, Inc. will continue to grow. We will also continue to strengthen our foothold in the local market. However, the core values on which we base our business will never change and will surely not be compromised. When you work with a Comfort Real Estate consultant you will be represented fairly, honestly and with your best interest at heart. Thank you for taking the time to get to know me and our company.`;

const truncatedBio = `My name is B. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with how fortunate we are to be able to live in this community and experience the quality of life that we are able to experience on a daily basis. This truly is paradise. After obtaining my broker license in 2004, I decided in January of 2005 to open and operate my own company, Comfort Real Estate Services. In 2005 we closed nearly $10 million in real estate sales and have been going strong ever since. In 2009, I was selected as one of REALTOR® Magazine's "30 under 30". This was a tremendous honor as it attest to the success of individual agents in their specific markets. The magazine chooses just 30 agents, owners or managers under the age of 30 across the nation to feature for their achievements in the real estate field. Not only was I chosen as one of the 30, but I was selected to be one of the 5 agents for the cover. This honor was a complete testament to the loyalty of my clients and the quality of agents that make up the Comfort team. As the years go on Comfort Real Estate Services, Inc. will continue to grow. We will also continue to strengthen our foothold in the local market. However, the core values on which we base our business will never change and will surely not be compromised. When you work with a Comfort Real Estate consultant you will be represented fairly, honestly and with your best interest at heart. Thank you for taking the time to get to know me and our company.`;

console.log('🔬 TESTING BIO EXTRACTION PATTERNS\n');

// Test patterns for complete bio
const completeBioPatterns = [
  // Match the exact expected bio pattern
  /Hello!\s*My\s+name\s+is\s+B\.J\.\s+Ward\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time\s+to\s+get\s+to\s+know\s+me\s+and\s+our\s+company\./i,
  
  // More flexible pattern for the complete bio
  /Hello!\s*My\s+name\s+is\s+[A-Z][^.]*\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
  
  // Look for any bio that starts with Hello and is substantial
  /Hello!\s*My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]{300,}?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
  
  // Alternative without exclamation point
  /Hello\s*My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]{300,}?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i
];

console.log('Testing patterns against FULL EXPECTED BIO:');
completeBioPatterns.forEach((pattern, index) => {
  const match = fullExpectedBio.match(pattern);
  console.log(`Pattern ${index + 1}: ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
  if (match) {
    console.log(`  - Matched length: ${match[0].length} chars`);
    console.log(`  - First 100 chars: "${match[0].substring(0, 100)}..."`);
  }
});

console.log('\nTesting patterns against TRUNCATED BIO:');
completeBioPatterns.forEach((pattern, index) => {
  const match = truncatedBio.match(pattern);
  console.log(`Pattern ${index + 1}: ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
  if (match) {
    console.log(`  - Matched length: ${match[0].length} chars`);
    console.log(`  - First 100 chars: "${match[0].substring(0, 100)}..."`);
  }
});

// Test key phrase detection
console.log('\n🔍 Testing key phrase detection:');
const keyPhrases = [
  'I am the Broker/Owner of Comfort Real Estate Services',
  'In 2009, I was selected as one of REALTOR',
  'gorgeous coastal region of Ventura County',
  'Thank you for taking the time to get to know me'
];

keyPhrases.forEach(phrase => {
  const inFull = fullExpectedBio.includes(phrase);
  const inTruncated = truncatedBio.includes(phrase);
  console.log(`"${phrase.substring(0, 40)}...": Full=${inFull ? '✅' : '❌'}, Truncated=${inTruncated ? '✅' : '❌'}`);
});

console.log('\n📊 ANALYSIS:');
console.log(`Full bio length: ${fullExpectedBio.length} characters`);
console.log(`Truncated bio length: ${truncatedBio.length} characters`);
console.log(`Difference: ${fullExpectedBio.length - truncatedBio.length} characters`);

// Check what's missing
const missing = fullExpectedBio.replace(truncatedBio, '');
console.log(`Missing text: "${missing}"`);
