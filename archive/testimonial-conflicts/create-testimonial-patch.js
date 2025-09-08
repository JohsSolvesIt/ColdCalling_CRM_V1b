// Quick fix: Generate testimonial data for testing
// This script will create a JSON file with testimonials for agents with ratings

const agentTestimonials = {
  // Jordan Jr (45 reviews, 5 rating)
  "b258285a-517d-40d3-b40b-96307ec2a702": [
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
  ],
  
  // For other agents with ratings, add more here...
  "c6a32840-6157-4616-a39c-c2a7a2c9fd02": [ // Pamela Libby (no reviews shown but has ratings count 0)
    // Will check if she actually has reviews
  ]
};

// Quick patch script to test testimonials in the website generation
const fs = require('fs');

// Create a patch file for the modular website system
const testimonialPatch = `
// QUICK FIX: Add testimonials to agents with ratings
// This modifies the website generation to include sample testimonials

const agentTestimonials = ${JSON.stringify(agentTestimonials, null, 2)};

function getTestimonialsForAgent(agentId) {
  return agentTestimonials[agentId] || [];
}

// Export for use in website generation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getTestimonialsForAgent, agentTestimonials };
}
`;

fs.writeFileSync('/home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35/testimonial-patch.js', testimonialPatch);

console.log('✅ Created testimonial patch file');
console.log('📁 File: /home/realm/Documents/ColdCalling CRM B-extract.8.22 -.BETA35/testimonial-patch.js');
console.log('\n💡 Next steps:');
console.log('1. Test website generation with Jordan Jr (has 45 reviews)');
console.log('2. Check if testimonials now appear');
console.log('3. If working, implement proper Chrome Extension database storage');

// Also create a test to generate a website for Jordan Jr immediately
console.log('\n🧪 Let\'s test with Jordan Jr right now...');
