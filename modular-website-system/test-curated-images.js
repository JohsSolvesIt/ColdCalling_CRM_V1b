const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const HeroImageCollection = require('./engines/HeroImageCollection');
const fs = require('fs');

console.log('🖼️ Testing Curated Hero Image Collection...\n');

// Show available images
console.log('📸 Available Curated Hero Images:');
const imagesByCategory = HeroImageCollection.getHeroImagesByCategory();

Object.entries(imagesByCategory).forEach(([category, images]) => {
  console.log(`\n🏷️ ${category}:`);
  images.forEach(image => {
    console.log(`   📷 ${image.key} - ${image.name}`);
    console.log(`      ${image.description}`);
    console.log(`      Best overlay: ${image.bestOverlay}`);
  });
});

console.log('\n🧪 Testing Selected Curated Images...\n');

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

// Test 1: Modern Luxury Home
console.log('🏠 Testing: Modern Luxury Home...');
const test1Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'modern-luxury-home',
  heroOverlayOpacity: 0.5,
  heroOverlayWhite: false
};

const result1 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test1Options);
if (result1.success) {
  fs.writeFileSync('demo-luxury-home.html', result1.html);
  console.log('✅ Created: demo-luxury-home.html');
}

// Test 2: Modern Kitchen (with white overlay)
console.log('\n🍽️ Testing: Modern Kitchen with white overlay...');
const test2Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'luxury-kitchen',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: true
};

const result2 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test2Options);
if (result2.success) {
  fs.writeFileSync('demo-modern-kitchen.html', result2.html);
  console.log('✅ Created: demo-modern-kitchen.html');
}

// Test 3: City Skyline
console.log('\n🏙️ Testing: City Skyline...');
const test3Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'city-skyline',
  heroOverlayOpacity: 0.4,
  heroOverlayWhite: false
};

const result3 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test3Options);
if (result3.success) {
  fs.writeFileSync('demo-city-skyline.html', result3.html);
  console.log('✅ Created: demo-city-skyline.html');
}

// Test 4: Mountain Lake (nature)
console.log('\n🏔️ Testing: Mountain Lake...');
const test4Options = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'curated',
  heroImageKey: 'mountain-lake',
  heroOverlayOpacity: 0.3,
  heroOverlayWhite: true
};

const result4 = generator.generateWebsite(testAgentData, 'professional', 'inked-estate', test4Options);
if (result4.success) {
  fs.writeFileSync('demo-mountain-lake.html', result4.html);
  console.log('✅ Created: demo-mountain-lake.html');
}

console.log('\n🎯 Curated Image Demo Summary:');
console.log('   📁 demo-luxury-home.html - Modern luxury home (dark overlay)');
console.log('   📁 demo-modern-kitchen.html - Kitchen interior (white overlay)');
console.log('   📁 demo-city-skyline.html - Urban skyline (dark overlay)');
console.log('   📁 demo-mountain-lake.html - Nature landscape (white overlay)');
console.log('\n🌐 Open these files to see the curated hero images in action!');

// Show how to get image info programmatically
console.log('\n🔧 Developer Info:');
console.log('Available image keys:', Object.keys(HeroImageCollection.HERO_IMAGES));
console.log('Total curated images:', HeroImageCollection.getAllHeroImages().length);
