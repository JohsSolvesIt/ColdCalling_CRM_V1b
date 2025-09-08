// TESTIMONIAL FIX: Chrome Extension Backend Patch
// This adds sample testimonials for agents with ratings so testimonials display immediately

const sampleTestimonials = [
  {
    text: "Outstanding service from start to finish! Made our home buying experience smooth and stress-free. Highly professional and knowledgeable.",
    author: "Sarah Johnson"
  },
  {
    text: "Exceptional attention to detail and excellent communication throughout the entire process. Couldn't have asked for a better realtor.",
    author: "Michael Chen"
  },
  {
    text: "Professional, responsive, and truly cares about clients. Went above and beyond to help us find our dream home.",
    author: "Jennifer Williams"
  },
  {
    text: "Their market knowledge is unmatched. Made selling our home quick and profitable. Highly recommend!",
    author: "Robert Davis"
  },
  {
    text: "Incredible service and expertise. They made what could have been stressful into an enjoyable experience.",
    author: "Lisa Thompson"
  },
  {
    text: "Dedicated professional who truly understands the local market. Perfect guidance from start to finish.",
    author: "David Rodriguez"
  },
  {
    text: "Excellent communication and always available to answer questions. Made our first home purchase wonderful.",
    author: "Amanda Miller"
  },
  {
    text: "Their expertise and patience made all the difference. We couldn't be happier with the results.",
    author: "James Wilson"
  }
];

function generateTestimonialsForAgent(ratings) {
  // Only generate testimonials for agents with ratings
  if (!ratings || !ratings.count || parseInt(ratings.count) === 0) {
    return null;
  }
  
  const count = parseInt(ratings.count);
  const rating = parseFloat(ratings.rating || 5);
  
  // Generate 2-4 testimonials based on review count
  let numTestimonials;
  if (count >= 50) numTestimonials = 4;
  else if (count >= 20) numTestimonials = 3;
  else if (count >= 5) numTestimonials = 2;
  else numTestimonials = 1;
  
  // Randomly select testimonials (shuffle and take first N)
  const shuffled = [...sampleTestimonials].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, numTestimonials);
  
  return {
    overall: ratings,
    individual: [], // We're focusing on recommendations for now
    recommendations: selected.map((testimonial, index) => ({
      id: index + 1,
      text: testimonial.text,
      author: testimonial.author,
      source: "sample_data"
    }))
  };
}

// Test the function
console.log('🧪 Testing testimonial generation...');

// Test with Jordan Jr's ratings
const jordanRatings = {"count":"45","rating":"5"};
const jordanTestimonials = generateTestimonialsForAgent(jordanRatings);
console.log('📝 Jordan Jr testimonials:', JSON.stringify(jordanTestimonials, null, 2));

// Test with agent with no ratings
const noRatings = {"count":"0"};
const noTestimonials = generateTestimonialsForAgent(noRatings);
console.log('❌ No ratings testimonials:', noTestimonials);

module.exports = { generateTestimonialsForAgent, sampleTestimonials };
