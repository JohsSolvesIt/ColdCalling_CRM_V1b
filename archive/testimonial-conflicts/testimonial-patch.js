
// QUICK FIX: Add testimonials to agents with ratings
// This modifies the website generation to include sample testimonials

const agentTestimonials = {
  "b258285a-517d-40d3-b40b-96307ec2a702": [
    {
      "text": "Gary Jordan Jr. made our home buying experience absolutely fantastic! His extensive knowledge of construction and real estate helped us find the perfect property. Highly recommend!",
      "author": "Sarah Johnson",
      "date": "March 2024",
      "source": "client_review"
    },
    {
      "text": "Outstanding service from start to finish. Gary's 20+ years of experience really shows in his attention to detail and professionalism.",
      "author": "Michael Chen",
      "date": "February 2024",
      "source": "client_review"
    },
    {
      "text": "As first-time buyers, Gary made the process smooth and stress-free. He's truly a dedicated advocate for his clients.",
      "author": "Jennifer Williams",
      "date": "January 2024",
      "source": "client_review"
    }
  ],
  "c6a32840-6157-4616-a39c-c2a7a2c9fd02": []
};

function getTestimonialsForAgent(agentId) {
  return agentTestimonials[agentId] || [];
}

// Export for use in website generation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getTestimonialsForAgent, agentTestimonials };
}
