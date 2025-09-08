/**
 * Test Becki Cassidy Properties Issue
 * Testing why 2 properties are showing as 6 duplicated cards
 */

const ModularWebsiteGenerator = require('./modular-website-system/engines/ModularWebsiteGenerator');

// Create test data that matches Becki Cassidy's situation
const beckiData = {
  name: "Becki Cassidy",
  email: "becki@example.com",
  phone: "(555) 123-4567",
  title: "Real Estate Professional",
  company: "Real Estate Company",
  bio: "Professional real estate agent",
  location: "Texas",
  properties: [
    {
      id: 1,
      address: "123 Main Street",
      city: "Houston",
      state: "TX",
      price: "$450,000",
      bedrooms: 3,
      bathrooms: 2,
      sqft: "1,800",
      status: "ACTIVE",
      image_url: "https://via.placeholder.com/400x300/1e40af/ffffff?text=Property+1"
    },
    {
      id: 2,
      address: "456 Oak Avenue",
      city: "Houston", 
      state: "TX",
      price: "$550,000",
      bedrooms: 4,
      bathrooms: 3,
      sqft: "2,200",
      status: "ACTIVE",
      image_url: "https://via.placeholder.com/400x300/1e40af/ffffff?text=Property+2"
    }
  ]
};

async function testBeckiWebsite() {
  try {
    console.log('🔍 Testing Becki Cassidy properties duplication issue...');
    console.log('📊 Input properties count:', beckiData.properties.length);
    
    const generator = new ModularWebsiteGenerator();
    
    // Generate website using all available themes to see which might cause duplication
    const themes = ['modern-professional', 'luxury-professional', 'inked-estate'];
    
    for (const theme of themes) {
      console.log(`\n🎨 Testing theme: ${theme}`);
      
      try {
        const result = generator.generateWebsite(beckiData, 'professional', theme);
        const website = result.html || result.website || result;
        
        if (typeof website !== 'string') {
          console.log('❌ Result is not a string, it is:', typeof website);
          console.log('Result keys:', Object.keys(website || {}));
          continue;
        }
        
        // Count how many property cards are in the generated HTML
        const propertyCardMatches = website.match(/class="[^"]*property[^"]*card[^"]*"/gi) || [];
        const priceMatches = website.match(/\$\d{3},\d{3}/g) || [];
        const addressMatches = website.match(/(123 Main Street|456 Oak Avenue)/g) || [];
        
        console.log(`📦 Property cards found: ${propertyCardMatches.length}`);
        console.log(`💰 Price tags found: ${priceMatches.length}`);
        console.log(`🏠 Address mentions: ${addressMatches.length}`);
        
        // Check if duplication is happening
        if (propertyCardMatches.length > 2 || priceMatches.length > 2 || addressMatches.length > 4) {
          console.log('🚨 DUPLICATION DETECTED in theme:', theme);
          console.log('Property card classes found:', propertyCardMatches.slice(0, 8));
          console.log('Prices found:', priceMatches);
          console.log('Addresses found:', addressMatches);
        } else {
          console.log('✅ No duplication detected in theme:', theme);
        }
        
      } catch (error) {
        console.error(`❌ Error with theme ${theme}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBeckiWebsite();
