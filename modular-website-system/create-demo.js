/**
 * Create Final InkedRealEstate.com Inspired Demo
 * Showcase the new theme with updated colors, fonts, and styling
 */

const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const fs = require('fs');

// Test agent data inspired by Inked Real Estate with proper branding
const testAgentData = {
  name: "Sarah Johnson",
  email: "sarah@inkedrealestate.com", 
  phone: "(832) 786-1722",
  title: "Senior Real Estate Professional",
  company: "Inked Real Estate",
  bio: "With over 15 years of experience in luxury real estate, I specialize in helping clients achieve their property dreams. My commitment to excellence and client satisfaction has helped over 623 families find their perfect homes. I believe in making the real estate process seamless and stress-free while delivering exceptional results that exceed expectations.",
  location: "Houston, TX Metro Area",
  profile_image_url: "https://via.placeholder.com/400x600/1e40af/ffffff?text=Sarah+Johnson",
  properties: [
    {
      id: 1,
      address: "623 Success Drive",
      city: "Houston", 
      state: "TX",
      price: "$850,000",
      bedrooms: 5,
      bathrooms: 4,
      sqft: "3,500",
      status: "SOLD",
      image_url: "https://via.placeholder.com/400x300/1e40af/ffffff?text=Luxury+Estate+SOLD"
    },
    {
      id: 2,
      address: "200 Million Dollar Lane",
      city: "The Woodlands",
      state: "TX", 
      price: "$675,000",
      bedrooms: 4,
      bathrooms: 3,
      sqft: "2,800",
      status: "FOR_SALE",
      image_url: "https://via.placeholder.com/400x300/10b981/ffffff?text=Modern+Home+For+Sale"
    }
  ],
  testimonials: [
    {
      text: "Sarah made our home buying experience incredible. She truly goes above and beyond for her clients! We found our dream home thanks to her dedication.",
      author: "Mike & Lisa Chen",
      rating: 5,
      source: "Google"
    },
    {
      text: "Professional, knowledgeable, and always responsive. Sarah is the best realtor we've ever worked with. 5 stars!",
      author: "David Rodriguez", 
      rating: 5,
      source: "Zillow"
    },
    {
      text: "Sarah helped us sell our home quickly and for top dollar. Her expertise made all the difference in our success.",
      author: "Jennifer Adams",
      rating: 5,
      source: "Google"
    }
  ]
};

// Test generation options
const testOptions = {
  theme: 'inked-realtor',
  layout: 'professional',
  heroImageUrl: 'https://via.placeholder.com/1920x1080/1e40af/ffffff?text=Beautiful+Home',
  heroImageSource: 'custom',
  heroOverlayOpacity: 0.6,
  heroOverlayWhite: false,
  activationBanner: false
};

// Initialize generator
const generator = new ModularWebsiteGenerator();

// Hero options for InkedRealEstate.com style
const heroOptions = {
  theme: 'inked-realtor',
  layout: 'professional', 
  heroImageUrl: 'https://via.placeholder.com/1920x1080/0f172a/ffffff?text=WELCOME+HOME+-+InkedRealEstate.com+Inspired',
  heroImageSource: 'custom',
  heroOverlayOpacity: 0.7,
  heroOverlayWhite: false,
  activationBanner: false
};

console.log('🎨 Creating InkedRealEstate.com Inspired Demo...');
console.log('Agent:', testAgentData.name);
console.log('Theme: inked-realtor');
console.log('Layout: professional');
console.log('');

// Initialize the generator
const generator = new ModularWebsiteGenerator();

// Generate the website
try {
  const result = generator.generateWebsite(testAgentData, 'inked-realtor', 'professional', heroOptions);
  
  if (result.success) {
    // Write the demo file
    fs.writeFileSync('inked-realtor-FINAL-DEMO.html', result.html);
    
    console.log('✅ Successfully created InkedRealEstate.com inspired demo!');
    console.log('� File: inked-realtor-FINAL-DEMO.html');
    console.log('📏 HTML Length:', result.html.length, 'characters');
    console.log('📊 Metadata:', result.metadata);
    
    // Check for key elements
    const html = result.html;
    const checks = [
      { name: 'WELCOME HOME heading', test: html.includes('WELCOME HOME') },
      { name: 'New color scheme (1e40af)', test: html.includes('1e40af') },
      { name: 'Playfair Display font', test: html.includes('Playfair Display') },
      { name: 'Agent name replacement', test: html.includes(testAgentData.name) },
      { name: 'InkedRealEstate phone', test: html.includes('(832) 786-1722') },
      { name: 'Updated button styling', test: html.includes('gradient-primary') },
      { name: 'Modern animations', test: html.includes('cubic-bezier') },
      { name: 'Enhanced shadows', test: html.includes('shadow-xl') }
    ];
    
    console.log('\n🔍 InkedRealEstate.com Style Checks:');
    checks.forEach(check => {
      console.log(\`\${check.test ? '✅' : '❌'} \${check.name}\`);
    });
    
    console.log('\n🎯 Demo file ready! Open inked-realtor-FINAL-DEMO.html to see the result.');
    
  } else {
    console.log('❌ Demo generation failed:', result.error);
  }

} catch (error) {
  console.error('🚨 Demo creation error:', error.message);
  console.error(error.stack);
}

console.log('\n� Demo creation completed!');
