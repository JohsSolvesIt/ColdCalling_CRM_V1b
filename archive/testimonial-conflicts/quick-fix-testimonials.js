#!/usr/bin/env node

/**
 * Quick Fix: Populate testimonials for agents with ratings
 * This script generates sample testimonials for agents with ratings > 0
 * so that the website testimonial generation can work immediately
 */

// Quick fix script - no dependencies needed

// Sample testimonials that can be used for agents with ratings
const sampleTestimonials = [
  {
    text: "Outstanding service from start to finish! They helped us find our dream home and made the entire process smooth and stress-free. Highly recommend!",
    author: "Sarah Johnson"
  },
  {
    text: "Professional, knowledgeable, and always available to answer questions. They went above and beyond to ensure we got the best deal possible.",
    author: "Michael Chen"
  },
  {
    text: "Excellent communication throughout the entire process. They truly care about their clients and it shows in everything they do.",
    author: "Jennifer Williams"
  },
  {
    text: "Made our first home buying experience wonderful. Their expertise and patience made all the difference. We couldn't be happier!",
    author: "David Rodriguez"
  },
  {
    text: "Sold our home quickly and for a great price. Their marketing strategy was spot-on and they were always professional.",
    author: "Lisa Thompson"
  },
  {
    text: "Incredibly helpful and responsive. They made what could have been a stressful process enjoyable. Definitely recommend to others!",
    author: "Robert Davis"
  },
  {
    text: "Their knowledge of the local market is unmatched. They helped us navigate a competitive market and find the perfect home.",
    author: "Amanda Miller"
  },
  {
    text: "Professional service with a personal touch. They took the time to understand our needs and delivered exactly what we were looking for.",
    author: "James Wilson"
  },
  {
    text: "Exceptional attention to detail and excellent communication. They made the selling process seamless and profitable.",
    author: "Maria Garcia"
  },
  {
    text: "Highly knowledgeable and dedicated professional. They worked tirelessly to help us find the right property within our budget.",
    author: "Kevin Brown"
  }
];

async function addTestimonialsToAgents() {
  console.log('🔧 Quick Fix: Adding testimonials to agents with ratings...');
  
  // Connect to Chrome Extension backend
  try {
    const response = await fetch('http://localhost:5001/api/agents');
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Failed to fetch agents:', data.message);
      return;
    }
    
    const agents = data.agents || [];
    console.log(`📊 Found ${agents.length} agents`);
    
    let agentsWithRatings = 0;
    let testimonialsAdded = 0;
    
    for (const agent of agents) {
      // Check if agent has ratings
      const hasRatings = agent.ratings && (
        (agent.ratings.count && parseInt(agent.ratings.count) > 0) ||
        (agent.ratings.rating && parseFloat(agent.ratings.rating) > 0)
      );
      
      if (hasRatings) {
        agentsWithRatings++;
        console.log(`✨ Agent: ${agent.name} has ratings (${agent.ratings.count || 'N/A'} reviews, ${agent.ratings.rating || 'N/A'} rating)`);
        
        // Generate 2-5 testimonials for this agent
        const numTestimonials = Math.floor(Math.random() * 4) + 2; // 2-5 testimonials
        const agentTestimonials = [];
        
        for (let i = 0; i < numTestimonials; i++) {
          const testimonial = sampleTestimonials[Math.floor(Math.random() * sampleTestimonials.length)];
          agentTestimonials.push({
            id: i + 1,
            text: testimonial.text,
            author: testimonial.author,
            date: getRandomDate(),
            source: "sample_data"
          });
        }
        
        console.log(`  📝 Generated ${agentTestimonials.length} testimonials`);
        testimonialsAdded += agentTestimonials.length;
        
        // For now, just log what we would send to update the agent
        console.log(`  💾 Would update agent ${agent.id} with testimonials`);
        
        // TODO: Add API endpoint to update agent with testimonials
        // const updateResponse = await fetch(`http://localhost:5001/api/agents/${agent.id}/testimonials`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ testimonials: agentTestimonials })
        // });
      }
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`   📊 Total agents: ${agents.length}`);
    console.log(`   ⭐ Agents with ratings: ${agentsWithRatings}`);
    console.log(`   📝 Testimonials generated: ${testimonialsAdded}`);
    console.log(`\n💡 Next step: Implement backend endpoint to store testimonials in database`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function getRandomDate() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  const year = 2024;
  const month = months[Math.floor(Math.random() * months.length)];
  return `${month} ${year}`;
}

// Run the script
addTestimonialsToAgents().catch(console.error);
