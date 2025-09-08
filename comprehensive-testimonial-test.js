#!/usr/bin/env node

/**
 * COMPREHENSIVE TESTIMONIAL TEST
 * This script will:
 * 1. Test Chrome Extension API response format
 * 2. Manually modify agent data to include testimonials
 * 3. Send to CRM website generation
 * 4. Check if testimonials appear in generated HTML
 */

async function comprehensiveTestimonialTest() {
  console.log('🔬 COMPREHENSIVE TESTIMONIAL TEST');
  console.log('==================================\n');
  
  // Jordan Jr's agent ID (we know he has 45 reviews, 5 rating)
  const jordanAgentId = 'b258285a-517d-40d3-b40b-96307ec2a702';
  
  try {
    // STEP 1: Get agent data from Chrome Extension
    console.log('📡 STEP 1: Fetching agent data from Chrome Extension...');
    const chromeResponse = await fetch(`http://localhost:5001/api/agents/${jordanAgentId}`);
    const chromeData = await chromeResponse.json();
    
    if (!chromeData.success) {
      console.error('❌ Chrome Extension API failed:', chromeData.message);
      return;
    }
    
    const originalAgent = chromeData.agent;
    console.log(`✅ Agent: ${originalAgent.name}`);
    console.log(`⭐ Ratings: ${JSON.stringify(originalAgent.ratings)}`);
    console.log(`📊 Reviews field: ${originalAgent.reviews}`);
    console.log(`🏢 Properties: ${originalAgent.total_properties}`);
    
    // STEP 2: Modify agent data to include testimonials
    console.log('\n🔧 STEP 2: Adding testimonials to agent data...');
    
    const modifiedAgent = {
      ...originalAgent,
      reviews: {
        overall: originalAgent.ratings,
        individual: [],
        recommendations: [
          {
            text: "Gary Jordan Jr. made our home buying experience absolutely fantastic! His extensive knowledge of construction and real estate helped us find the perfect property. Highly recommend!",
            author: "Sarah Johnson",
            date: "March 2024",
            source: "client_review"
          },
          {
            text: "Outstanding service from start to finish. Gary's 20+ years of experience really shows in his attention to detail and professionalism.",
            author: "Michael Chen", 
            date: "February 2024",
            source: "client_review"
          },
          {
            text: "As first-time buyers, Gary made the process smooth and stress-free. He's truly a dedicated advocate for his clients.",
            author: "Jennifer Williams",
            date: "January 2024", 
            source: "client_review"
          }
        ]
      }
    };
    
    console.log(`✅ Added ${modifiedAgent.reviews.recommendations.length} testimonials`);
    
    // STEP 3: Test website generation with modified data
    console.log('\n🏗️ STEP 3: Testing website generation with testimonials...');
    
    const websitePayload = {
      contact: modifiedAgent,
      layout: 'modern',
      theme: 'blue'
    };
    
    console.log('📦 Sending payload to CRM website generator...');
    
    const websiteResponse = await fetch('http://localhost:5000/api/website/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(websitePayload)
    });
    
    if (!websiteResponse.ok) {
      const errorText = await websiteResponse.text();
      console.error('❌ Website generation failed:', errorText);
      return;
    }
    
    const websiteResult = await websiteResponse.json();
    console.log('✅ Website generation completed!');
    
    // STEP 4: Analyze the generated HTML
    console.log('\n🔍 STEP 4: Analyzing generated HTML for testimonials...');
    
    const html = websiteResult.html || websiteResult.data || '';
    
    if (!html) {
      console.error('❌ No HTML returned from website generation');
      return;
    }
    
    console.log(`📄 HTML length: ${html.length} characters`);
    
    // Check for testimonial indicators
    const testimonialIndicators = [
      'Sarah Johnson',
      'Michael Chen', 
      'Jennifer Williams',
      'testimonial',
      'carousel',
      'client-review',
      'home buying experience',
      'Outstanding service'
    ];
    
    let foundIndicators = 0;
    const foundItems = [];
    
    for (const indicator of testimonialIndicators) {
      if (html.toLowerCase().includes(indicator.toLowerCase())) {
        foundIndicators++;
        foundItems.push(indicator);
      }
    }
    
    console.log(`🎯 Found ${foundIndicators}/${testimonialIndicators.length} testimonial indicators:`);
    foundItems.forEach(item => console.log(`   ✅ ${item}`));
    
    if (foundIndicators >= 3) {
      console.log('\n🎉 SUCCESS: Testimonials are working!');
      console.log('📍 The issue is that Chrome Extension needs to extract and store real review data');
    } else if (foundIndicators > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS: Some testimonial data found, but not complete');
    } else {
      console.log('\n❌ ISSUE: No testimonials found in generated HTML');
      console.log('🔧 This means the testimonial replacement logic may not be working');
      
      // Save HTML for debugging
      const fs = require('fs');
      fs.writeFileSync('/tmp/generated-website-debug.html', html);
      console.log('💾 Saved generated HTML to /tmp/generated-website-debug.html for debugging');
      
      // Show a sample of the HTML
      console.log('\n📄 HTML Sample (first 1000 chars):');
      console.log(html.substring(0, 1000));
    }
    
    // STEP 5: Summary and next steps
    console.log('\n📋 SUMMARY:');
    console.log(`   🔗 Chrome Extension API: Working`);
    console.log(`   📊 Agent Data: ${originalAgent.name} (${originalAgent.ratings.count} reviews, ${originalAgent.ratings.rating} rating)`);
    console.log(`   📝 Testimonials Added: ${modifiedAgent.reviews.recommendations.length}`);
    console.log(`   🏗️ Website Generation: ${websiteResponse.ok ? 'Success' : 'Failed'}`);
    console.log(`   🎯 Testimonials Found: ${foundIndicators}/${testimonialIndicators.length}`);
    
    console.log('\n💡 NEXT STEPS:');
    if (foundIndicators >= 3) {
      console.log('   1. ✅ Testimonial system is working correctly');
      console.log('   2. 🔧 Fix Chrome Extension to extract real review text from realtor.com');
      console.log('   3. 🗄️ Add database storage for extracted testimonials/reviews');
      console.log('   4. 🔄 Update Chrome Extension API to return stored testimonials');
    } else {
      console.log('   1. 🔍 Debug why testimonial replacement logic is not working');
      console.log('   2. 🔧 Check ModularWebsiteGenerator.js testimonial logic');
      console.log('   3. 📄 Review generated HTML to understand the issue');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the comprehensive test
comprehensiveTestimonialTest().catch(console.error);
