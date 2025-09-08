#!/usr/bin/env node

/**
 * Test website generation with testimonials for Jordan Jr
 * This tests if we can get testimonials working by patching the data
 */

const { getTestimonialsForAgent } = require('./testimonial-patch.js');

async function testWebsiteWithTestimonials() {
  console.log('🧪 Testing website generation with testimonials...');
  
  // Jordan Jr's agent ID (we know he has 45 reviews)
  const jordanAgentId = 'b258285a-517d-40d3-b40b-96307ec2a702';
  
  try {
    // 1. Get Jordan's data from Chrome Extension API
    console.log('📡 Fetching Jordan Jr data...');
    const response = await fetch(`http://localhost:5001/api/agents/${jordanAgentId}`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Failed to fetch agent data:', data.message);
      return;
    }
    
    const agent = data.agent;
    console.log(`✅ Found agent: ${agent.name}`);
    console.log(`⭐ Ratings: ${JSON.stringify(agent.ratings)}`);
    console.log(`📊 Properties: ${agent.total_properties}`);
    
    // 2. Add testimonials to the agent data
    const testimonials = getTestimonialsForAgent(jordanAgentId);
    console.log(`📝 Adding ${testimonials.length} testimonials...`);
    
    // Patch the agent data
    agent.reviews = {
      overall: agent.ratings,
      individual: [],
      recommendations: testimonials
    };
    
    console.log(`✨ Patched agent data with testimonials:`);
    console.log(JSON.stringify(agent.reviews, null, 2));
    
    // 3. Test website generation
    console.log('\n🏗️ Testing website generation...');
    
    const websiteResponse = await fetch('http://localhost:5000/api/website/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: agent,
        layout: 'modern',
        theme: 'blue'
      })
    });
    
    if (!websiteResponse.ok) {
      console.error('❌ Website generation failed:', await websiteResponse.text());
      return;
    }
    
    const websiteResult = await websiteResponse.json();
    console.log('✅ Website generated successfully!');
    
    // Check if testimonials appear in the HTML
    const html = websiteResult.html || websiteResult.data || '';
    if (html.includes('Sarah Johnson') || html.includes('testimonial') || html.includes('Michael Chen')) {
      console.log('🎉 SUCCESS: Testimonials found in generated website!');
      console.log('📍 The testimonial system is working - we just need real review data');
    } else {
      console.log('⚠️  Testimonials not found in HTML. Let me check what was generated...');
      // Log a snippet to see what was generated
      const snippet = html.substring(0, 1000);
      console.log('HTML snippet:', snippet);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testWebsiteWithTestimonials().catch(console.error);
