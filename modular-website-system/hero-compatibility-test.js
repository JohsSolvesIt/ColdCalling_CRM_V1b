const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const fs = require('fs');

console.log('🎯 Testing Hero Component Generator Compatibility...\n');

// Sample agent data
const testAgentData = {
  name: 'Sarah Johnson',
  email: 'sarah@inkedestate.com', 
  phone: '(832) 786-1722',
  company: 'Inked Estate Real Estate',
  bio: 'Professional real estate agent with over 10 years of experience helping clients find their perfect home.',
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
  ]
};

// Test different hero configurations
const heroTests = [
  {
    name: 'No Hero Image',
    options: {
      theme: 'inked-estate',
      layout: 'professional',
      heroImageSource: 'none',
      activationBanner: false
    }
  },
  {
    name: 'Property Image Hero',
    options: {
      theme: 'inked-estate',
      layout: 'professional',
      heroImageSource: 'property_first',
      heroOverlayOpacity: 0.5,
      heroOverlayWhite: false,
      activationBanner: false
    }
  },
  {
    name: 'Custom Image with Heavy Overlay',
    options: {
      theme: 'inked-estate',
      layout: 'professional',
      heroImageSource: 'custom',
      heroImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      heroOverlayOpacity: 0.8,
      heroOverlayWhite: false,
      heroBlur: 2,
      activationBanner: false
    }
  },
  {
    name: 'White Overlay Light Blur',
    options: {
      theme: 'inked-estate',
      layout: 'professional',
      heroImageSource: 'custom',
      heroImageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      heroOverlayOpacity: 0.4,
      heroOverlayWhite: true,
      heroBlur: 1,
      activationBanner: false
    }
  }
];

// Generate and test each configuration
const generator = new ModularWebsiteGenerator();

heroTests.forEach((test, index) => {
  console.log(`\n🎨 Testing: ${test.name}`);
  console.log('Options:', JSON.stringify(test.options, null, 2));
  
  try {
    const result = generator.generateWebsite(testAgentData, test.options.layout, test.options.theme, test.options);
    
    if (result.success) {
      const filename = `hero-test-${index + 1}-${test.name.toLowerCase().replace(/\s+/g, '-')}.html`;
      fs.writeFileSync(filename, result.html);
      console.log(`✅ Generated: ${filename}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
});

console.log('\n🎯 Hero Component Tests Complete!');
console.log('📁 Check the generated HTML files to see different hero configurations');
console.log('\n🎮 Available Hero Controls:');
console.log('   • heroImageSource: "none", "custom", "property_first", "property_featured"');
console.log('   • heroImageUrl: Custom image URL');
console.log('   • heroOverlayOpacity: 0.0 to 1.0');
console.log('   • heroOverlayWhite: true/false (white vs black overlay)');
console.log('   • heroBlur: 0 to 10 (background blur intensity)');
