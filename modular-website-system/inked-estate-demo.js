const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');

console.log('🚀 Creating Inked Estate Theme Demo...\n');

// Sample agent data for testing
const testAgentData = {
  name: 'Sarah Johnson',
  email: 'sarah@inkedestate.com', 
  phone: '(832) 786-1722',
  company: 'Inked Estate Real Estate',
  sales_volume: '$15.2M',
  client_satisfaction: '98%',
  // Add reviews data for testimonials processing
  reviews: [
    {
      text: "Sarah helped us find our dream home in just 3 weeks! Her knowledge of the market and attention to detail made the entire process smooth and stress-free. We couldn't be happier with our new home.",
      author: "Mike & Jennifer Thompson",
      role: "First-time Homebuyers",
      rating: 5
    },
    {
      text: "Outstanding service from start to finish. Sarah's professional approach and excellent communication kept us informed every step of the way. She really knows the local market inside and out.",
      author: "David Chen", 
      role: "Property Investor",
      rating: 5
    },
    {
      text: "Working with Sarah was an absolute pleasure. She understood exactly what we were looking for and found us the perfect family home. Her expertise and dedication made all the difference.",
      author: "The Martinez Family",
      role: "Growing Family", 
      rating: 5
    }
  ],
  properties: [
    { 
      address: '623 Success Drive, Luxury Heights', 
      price: '$850,000',
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2850,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      status: 'For Sale'
    },
    { 
      address: '200 Million Dollar Lane, Elite District', 
      price: '$675,000',
      bedrooms: 3,
      bathrooms: 2,
      sqft: 2200,
      image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      status: 'Under Contract'
    },
    { 
      address: '456 Premium Plaza, Upscale Valley', 
      price: '$925,000',
      bedrooms: 5,
      bathrooms: 4,
      sqft: 3400,
      image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      status: 'For Sale'
    }
  ],
  testimonials: [
    {
      text: "Sarah helped us find our dream home in just 3 weeks! Her knowledge of the market and attention to detail made the entire process smooth and stress-free.",
      author: "Mike & Jennifer Thompson",
      role: "Homebuyers"
    },
    {
      text: "Outstanding service from start to finish. Sarah's professional approach and excellent communication kept us informed every step of the way.",
      author: "David Chen",
      role: "Property Investor"
    }
  ]
};

// Demo options matching generator capabilities
const demoOptions = {
  theme: 'inked-estate',
  layout: 'professional',
  heroImageSource: 'custom',
  heroImageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  heroOverlayOpacity: 0.7,
  heroOverlayWhite: false,
  heroBlur: 0,
  activationBanner: false
};

try {
  // Generate demo website
  console.log('📋 Generating demo with options:');
  console.log('   Theme:', demoOptions.theme);
  console.log('   Layout:', demoOptions.layout);
  console.log('   Hero Image:', demoOptions.heroImageSource);
  console.log('   Overlay Opacity:', demoOptions.heroOverlayOpacity);
  console.log('');

  const generator = new ModularWebsiteGenerator();
  const result = generator.generateWebsite(testAgentData, demoOptions.layout, demoOptions.theme, demoOptions);

  if (result.success) {
    const fs = require('fs');
    const outputFile = 'inked-estate-DEMO.html';
    fs.writeFileSync(outputFile, result.html);
    
    console.log('✅ Demo created successfully!');
    console.log('📁 File saved as:', outputFile);
    console.log('🌐 Open this file in your browser to view the demo');
    console.log('');
    console.log('🎯 Demo Features:');
    console.log('   ✓ "Welcome Home" hero section with custom background');
    console.log('   ✓ Professional blue and green color scheme');
    console.log('   ✓ Playfair Display + Inter typography');
    console.log('   ✓ Statistics showcase (623 clients, $200M volume)');
    console.log('   ✓ Property portfolio grid with 3 sample properties');
    console.log('   ✓ Client testimonials section');
    console.log('   ✓ Contact information and CTAs');
    console.log('   ✓ Responsive design for all devices');
    console.log('   ✓ Green action buttons throughout');
    console.log('   ✓ Professional navigation with backdrop blur');
  } else {
    console.error('❌ Demo creation failed:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error during demo generation:', error.message);
  console.error(error.stack);
  process.exit(1);
}
