const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const fs = require('fs');

console.log('🎨 Testing Manual Hero Text Color Override System...\n');

const testAgentData = {
  name: 'Sarah Johnson',
  email: 'sarah@inkedestate.com', 
  phone: '(832) 786-1722',
  company: 'Inked Estate Real Estate',
  sales_volume: '$15.2M',
  client_satisfaction: '98%',
  properties: [
    { 
      address: '623 Success Drive, Luxury Heights', 
      price: '$850,000',
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2850,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      status: 'For Sale'
    }
  ],
  reviews: [
    {
      text: "Sarah helped us find our dream home! Exceptional service.",
      author: "Happy Clients",
      rating: 5
    }
  ]
};

const generator = new ModularWebsiteGenerator();

console.log('🧪 Test 1: Default Auto Colors (Dark Overlay)');
const test1Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'luxury-living-room',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: false,
  manualHeroTextColors: false
};

const result1 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test1Options);
if (result1.success) {
  fs.writeFileSync('test-auto-dark.html', result1.html);
  console.log('✅ Created: test-auto-dark.html (Auto white text on dark overlay)');
}

console.log('\n🧪 Test 2: Default Auto Colors (White Overlay)');
const test2Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'luxury-kitchen',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: true,
  manualHeroTextColors: false
};

const result2 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test2Options);
if (result2.success) {
  fs.writeFileSync('test-auto-white.html', result2.html);
  console.log('✅ Created: test-auto-white.html (Auto dark text on white overlay)');
}

console.log('\n🎨 Test 3: Manual Red Text Override');
const test3Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'city-skyline',
  heroOverlayOpacity: 0.5,
  heroOverlayWhite: false,
  manualHeroTextColors: true,
  heroTextColor: '#ff4444',
  heroTextSecondary: '#ff8888',
  heroAccentColor: '#cc2222'
};

const result3 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test3Options);
if (result3.success) {
  fs.writeFileSync('test-manual-red.html', result3.html);
  console.log('✅ Created: test-manual-red.html (Manual red text colors)');
}

console.log('\n🎨 Test 4: Manual Blue Text Override');
const test4Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'mountain-lake',
  heroOverlayOpacity: 0.4,
  heroOverlayWhite: true,
  manualHeroTextColors: true,
  heroTextColor: '#2e5bc7',
  heroTextSecondary: '#5a7bd4',
  heroAccentColor: '#1a4499'
};

const result4 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test4Options);
if (result4.success) {
  fs.writeFileSync('test-manual-blue.html', result4.html);
  console.log('✅ Created: test-manual-blue.html (Manual blue text colors)');
}

console.log('\n🎨 Test 5: Manual Golden Text Override');
const test5Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'luxury-bedroom',
  heroOverlayOpacity: 0.7,
  heroOverlayWhite: false,
  manualHeroTextColors: true,
  heroTextColor: '#ffd700',
  heroTextSecondary: '#ffed4e',
  heroAccentColor: '#cc9900'
};

const result5 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test5Options);
if (result5.success) {
  fs.writeFileSync('test-manual-gold.html', result5.html);
  console.log('✅ Created: test-manual-gold.html (Manual golden text colors)');
}

console.log('\n🎨 Test 6: Manual Purple Text Override (Auto Secondary/Accent)');
const test6Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'modern-office',
  heroOverlayOpacity: 0.5,
  heroOverlayWhite: true,
  manualHeroTextColors: true,
  heroTextColor: '#8e44ad'
  // heroTextSecondary and heroAccentColor will be auto-generated
};

const result6 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test6Options);
if (result6.success) {
  fs.writeFileSync('test-manual-purple.html', result6.html);
  console.log('✅ Created: test-manual-purple.html (Manual purple with auto secondary/accent)');
}

console.log('\n🎯 Manual Hero Text Color Test Summary:');
console.log('   📁 test-auto-dark.html - Auto white text on dark overlay');
console.log('   📁 test-auto-white.html - Auto dark text on white overlay');
console.log('   📁 test-manual-red.html - Manual red text colors');
console.log('   📁 test-manual-blue.html - Manual blue text colors');
console.log('   📁 test-manual-gold.html - Manual golden text colors');
console.log('   📁 test-manual-purple.html - Manual purple with auto generation');
console.log('\n💡 Manual Color Override Options:');
console.log('   ✅ manualHeroTextColors: true/false');
console.log('   🎨 heroTextColor: "#hexcolor" (main text)');
console.log('   🎨 heroTextSecondary: "#hexcolor" (optional, auto-generated if not provided)');
console.log('   🎨 heroAccentColor: "#hexcolor" (optional, auto-generated if not provided)');
console.log('\n🌐 Open these files to see the different text color approaches!');
