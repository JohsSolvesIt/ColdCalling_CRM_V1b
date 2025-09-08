// Test script to show current review extraction results
// This simulates what the Chrome Extension would extract

console.log("🔍 Testing current review extraction...");

// Sample data that represents what we've been seeing
const currentReviews = [
  {
    text: "We've worked with BJ on three real estate transactions over the years and every one was handled professionally and smoothly. BJ is very knowledgeable about the market and always has our best interests in mind. We would definitely recommend BJ to anyone looking to buy or sell a home.",
    author: "Felicia",
    rating: 5,
    source: "realtor.com"
  },
  {
    text: "BJ helped us buy our first home and made the process so easy. She was always available to answer questions and walked us through every step. Highly recommend!",
    author: "Jen",
    rating: 5,
    source: "realtor.com"
  },
  {
    text: "Professionalism & communication",
    author: "Belinda Gillis",
    rating: 5,
    source: "realtor.com"
  },
  {
    text: "BJ was fantastic to work with. She knows the market inside and out and helped us find the perfect home for our family.",
    author: "Josh",
    rating: 5,
    source: "realtor.com"
  },
  {
    text: "Professionalism & communication",
    author: "Robert Bruce", 
    rating: 5,
    source: "realtor.com"
  },
  {
    text: "Working with BJ was a great experience. She was patient, knowledgeable, and helped us navigate a competitive market.",
    author: "James",
    rating: 5,
    source: "realtor.com"
  }
];

console.log("\n📋 CURRENT REVIEWS (Before Cleanup):");
console.log("=====================================");
currentReviews.forEach((review, index) => {
  console.log(`\n${index + 1}. "${review.text}"`);
  console.log(`   — ${review.author} (${review.rating} stars)`);
});

// Simulate the rating category filter
function isRatingCategoryOnly(text) {
  const ratingCategories = [
    'Professionalism & communication',
    'Local knowledge',
    'Process expertise', 
    'Responsiveness',
    'Negotiation skills',
    'Market knowledge',
    'Communication',
    'Professionalism',
    'Expertise',
    'Service',
    'Quality'
  ];
  
  const cleanText = text.trim().toLowerCase();
  return ratingCategories.some(category => 
    cleanText === category.toLowerCase() || 
    cleanText.includes(category.toLowerCase())
  );
}

// Apply the cleanup filter
const cleanedReviews = currentReviews.filter(review => {
  const isRatingCategory = isRatingCategoryOnly(review.text);
  if (isRatingCategory) {
    console.log(`\n🚫 REMOVING: "${review.text}" by ${review.author}`);
    return false;
  }
  return true;
});

console.log("\n\n✨ CLEANED REVIEWS (After Cleanup):");
console.log("===================================");
if (cleanedReviews.length === 0) {
  console.log("No reviews remaining after cleanup.");
} else {
  cleanedReviews.forEach((review, index) => {
    console.log(`\n${index + 1}. "${review.text}"`);
    console.log(`   — ${review.author} (${review.rating} stars)`);
  });
}

console.log(`\n📊 SUMMARY:`);
console.log(`Original reviews: ${currentReviews.length}`);
console.log(`Cleaned reviews: ${cleanedReviews.length}`);
console.log(`Removed: ${currentReviews.length - cleanedReviews.length}`);
