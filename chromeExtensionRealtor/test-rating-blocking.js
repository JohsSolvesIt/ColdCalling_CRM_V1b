// Test the rating category blocking

// Simulate the isRatingCategoryOnly function
function isRatingCategoryOnly(text) {
    if (!text || text.length < 3) return true;
    
    const ratingOnlyPatterns = [
        /^(professionalism|responsiveness|market\s*expertise|negotiation\s*skills)\s*&?\s*communication\.?\s*$/i,
        /^\s*(professionalism|responsiveness|market|negotiation)\s*&?\s*communication\.?\s*$/i,
        /^(professionalism|responsiveness|market\s*expertise|negotiation\s*skills)\.?\s*$/i,
        /^professionalism\s*&\s*communication$/i,
        /^(responsiveness|market\s*expertise|negotiation\s*skills|overall\s*rating)$/i,
        /^\d+\.\d+\s*$/,
        /^\d+\.\d+\s*out\s*of\s*\d+/i,
        /^(buyer\s*agent|seller\s*agent|overall\s*rating)$/i
    ];
    
    const isRatingOnly = ratingOnlyPatterns.some(pattern => pattern.test(text.trim()));
    
    if (isRatingOnly) {
        return true;
    }
    
    if (text.length < 50 && text.match(/(professionalism|responsiveness|market|negotiation|communication)/i)) {
        return true;
    }
    
    return false;
}

// Test cases - these should ALL be blocked
const shouldBeBlocked = [
    "Professionalism & communication",
    "Professionalism & communication.",
    "professionalism & communication",
    "Responsiveness",
    "Market expertise",
    "Negotiation skills",
    "Professionalism",
    "5.0",
    "4.5 out of 5",
    "Overall rating",
    "Buyer agent",
    "Seller agent"
];

shouldBeBlocked.forEach(text => {
    const blocked = isRatingCategoryOnly(text);
});

// Test cases - these should NOT be blocked (real reviews)
const shouldNotBeBlocked = [
    "BJ helped me sell my parent's Camarillo home. He was recommended by my dad's best friend.",
    "We've worked with BJ on three real estate transactions over the years, and every time has been exceptional.",
    "B.J. did a fantastic job guiding me through a challenging real estate market.",
    "I had the pleasure of working with BJ Ward and the Comfort Real Estate team."
];

shouldNotBeBlocked.forEach(text => {
    const blocked = isRatingCategoryOnly(text);
});

