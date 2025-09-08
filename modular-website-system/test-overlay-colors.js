const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const fs = require('fs');

console.log('🧪 Testing Hero Overlay Text Color Changes...\n');

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

// Test 1: Black Overlay (default)
console.log('🖤 Testing BLACK overlay (light text)...');
const blackOverlayOptions = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'custom',
  heroImageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: false,
  heroBlur: 0
};

const generator = new ModularWebsiteGenerator();
const blackResult = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', blackOverlayOptions);

if (blackResult.success) {
  fs.writeFileSync('test-black-overlay.html', blackResult.html);
  console.log('✅ Black overlay test created: test-black-overlay.html');
} else {
  console.error('❌ Black overlay test failed:', blackResult.error);
}

// Test 2: White Overlay (dark text)
console.log('\n🤍 Testing WHITE overlay (dark text)...');
const whiteOverlayOptions = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'custom',
  heroImageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: true,
  heroBlur: 0
};

const whiteResult = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', whiteOverlayOptions);

if (whiteResult.success) {
  fs.writeFileSync('test-white-overlay.html', whiteResult.html);
  console.log('✅ White overlay test created: test-white-overlay.html');
} else {
  console.error('❌ White overlay test failed:', whiteResult.error);
}

console.log('\n🎯 Test Summary:');
console.log('   📁 test-black-overlay.html - Light text on dark overlay');
console.log('   📁 test-white-overlay.html - Dark text on white overlay');
console.log('\n🌐 Open both files to compare text visibility!');
