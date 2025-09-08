/**
 * Test Inked Realtor Theme
 * Verify the new theme works with the modular website system
 */

const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');

// Test agent data inspired by Inked Real Estate
const testAgentData = {
  name: "Sarah Johnson",
  email: "sarah@example.com", 
  phone: "(555) 123-4567",
  title: "Real Estate Professional",
  company: "Johnson Realty Group",
  bio: "With over 15 years of experience in real estate, I specialize in helping clients find their dream homes. My commitment to excellence and client satisfaction has earned me recognition as a top-performing agent. I believe in making the home buying and selling process as smooth and stress-free as possible for my clients.",
  location: "Houston, TX Metro Area",
  profile_image_url: "https://via.placeholder.com/400x600/2563eb/ffffff?text=Agent+Photo",
  properties: [
    {
      id: 1,
      address: "123 Oak Street",
      city: "Houston",
      state: "TX",
      price: "$450,000",
      bedrooms: 4,
      bathrooms: 3,
      sqft: "2,500",
      status: "SOLD",
      image_url: "https://via.placeholder.com/400x300/059669/ffffff?text=SOLD+Property"
    },
    {
      id: 2,
      address: "456 Pine Avenue", 
      city: "Spring",
      state: "TX",
      price: "$325,000",
      bedrooms: 3,
      bathrooms: 2,
      sqft: "1,850",
      status: "FOR SALE",
      image_url: "https://via.placeholder.com/400x300/2563eb/ffffff?text=FOR+SALE"
    }
  ],
  testimonials: [
    {
      text: "Sarah made our home buying experience incredible. She truly goes above and beyond for her clients!",
      author: "Mike & Lisa Chen",
      rating: 5,
      source: "Google"
    },
    {
      text: "Professional, knowledgeable, and always responsive. Sarah is the best realtor we've ever worked with.",
      author: "David Rodriguez",
      rating: 5,
      source: "Zillow"
    },
    {
      text: "Sarah helped us sell our home quickly and for top dollar. Her expertise made all the difference.",
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

console.log('🧪 Testing Inked Realtor Theme...');
console.log('Agent:', testAgentData.name);
console.log('Theme:', testOptions.theme);
console.log('Layout:', testOptions.layout);
console.log('');

// Generate the website
try {
  const result = generator.generateWebsite(testAgentData, testOptions.layout, testOptions.theme, testOptions);
  
  if (result.success) {
    console.log('✅ Successfully generated Inked Realtor theme website!');
    console.log('📊 Metadata:', result.metadata);
    console.log('📏 HTML Length:', result.html.length, 'characters');
    
    // Check for key elements
    const html = result.html;
    const checks = [
      { name: 'WELCOME HOME heading', test: html.includes('WELCOME HOME') },
      { name: 'Agent name replacement', test: html.includes(testAgentData.name) },
      { name: 'Phone number', test: html.includes(testAgentData.phone) },
      { name: 'Stats section', test: html.includes('Clients Helped') },
      { name: 'Hero search', test: html.includes('Search Properties') },
      { name: 'Professional styling', test: html.includes('var(--primary-blue)') },
      { name: 'Navigation', test: html.includes('nav-container') },
      { name: 'Contact section', test: html.includes('Work With') },
      { name: 'Footer', test: html.includes('Silicode LLC') }
    ];
    
    console.log('\n🔍 Element checks:');
    checks.forEach(check => {
      console.log(`${check.test ? '✅' : '❌'} ${check.name}`);
    });
    
    // Count template variables that might not have been replaced
    const unreplacedVars = (html.match(/\{\{[^}]+\}\}/g) || []);
    if (unreplacedVars.length > 0) {
      console.log('\n⚠️  Unreplaced template variables found:');
      console.log(unreplacedVars);
    } else {
      console.log('\n✅ All template variables successfully replaced!');
    }
    
  } else {
    console.log('❌ Theme generation failed:', result.error);
    if (result.fallback) {
      console.log('📄 Fallback HTML provided, length:', result.fallback.length);
    }
  }

} catch (error) {
  console.error('🚨 Test error:', error.message);
  console.error(error.stack);
}

console.log('\n🎯 Test completed!');
