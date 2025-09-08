/**
 * Curated Hero Images Collection for Modular Website Generator
 * High-quality images optimized for real estate and professional websites
 */

const HERO_IMAGES = {
  // Modern Architecture & Real Estate
  'modern-luxury-home': {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Modern Luxury Home',
    category: 'Real Estate',
    description: 'Stunning modern home with clean lines and glass features',
    bestOverlay: 'dark'
  },
  'luxury-living-room': {
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Luxury Living Room',
    category: 'Interior',
    description: 'Elegant living room with beautiful natural lighting',
    bestOverlay: 'dark'
  },
  'contemporary-house': {
    url: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Contemporary House',
    category: 'Real Estate',
    description: 'Beautiful contemporary home exterior',
    bestOverlay: 'dark'
  },
  'luxury-kitchen': {
    url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Modern Kitchen',
    category: 'Interior',
    description: 'Sleek modern kitchen with marble countertops',
    bestOverlay: 'white'
  },
  'city-skyline': {
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'City Skyline',
    category: 'Urban',
    description: 'Metropolitan city skyline at sunset',
    bestOverlay: 'dark'
  },
  
  // Lifestyle & Professional
  'modern-office': {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Modern Office',
    category: 'Business',
    description: 'Clean, professional office space',
    bestOverlay: 'white'
  },
  'handshake-deal': {
    url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Professional Handshake',
    category: 'Business',
    description: 'Business professionals closing a deal',
    bestOverlay: 'dark'
  },
  'elegant-chair': {
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Elegant Interior',
    category: 'Interior',
    description: 'Sophisticated interior design with elegant furniture',
    bestOverlay: 'dark'
  },
  
  // Nature & Landscapes (for broader appeal)
  'mountain-lake': {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Mountain Lake',
    category: 'Nature',
    description: 'Serene mountain lake with pristine reflection',
    bestOverlay: 'white'
  },
  'forest-path': {
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Forest Path',
    category: 'Nature',
    description: 'Peaceful forest path with dappled sunlight',
    bestOverlay: 'white'
  },
  'ocean-sunset': {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Ocean Sunset',
    category: 'Nature',
    description: 'Dramatic ocean sunset with golden colors',
    bestOverlay: 'dark'
  },
  
  // Additional Real Estate
  'luxury-bedroom': {
    url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Luxury Bedroom',
    category: 'Interior',
    description: 'Elegant master bedroom with natural lighting',
    bestOverlay: 'white'
  },
  'modern-bathroom': {
    url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Modern Bathroom',
    category: 'Interior',
    description: 'Spa-like modern bathroom design',
    bestOverlay: 'white'
  },
  'garden-view': {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Garden View',
    category: 'Exterior',
    description: 'Beautiful landscaped garden and outdoor space',
    bestOverlay: 'dark'
  },
  
  // Abstract & Professional
  'abstract-architecture': {
    url: 'https://images.unsplash.com/photo-1493238792000-8113da705763?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Abstract Architecture',
    category: 'Abstract',
    description: 'Modern architectural details and patterns',
    bestOverlay: 'white'
  },
  'geometric-building': {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    name: 'Geometric Building',
    category: 'Architecture',
    description: 'Modern building with geometric patterns',
    bestOverlay: 'dark'
  }
};

/**
 * Get all hero images organized by category
 */
function getHeroImagesByCategory() {
  const categories = {};
  
  Object.entries(HERO_IMAGES).forEach(([key, image]) => {
    if (!categories[image.category]) {
      categories[image.category] = [];
    }
    categories[image.category].push({
      key,
      ...image
    });
  });
  
  return categories;
}

/**
 * Get a specific hero image by key
 */
function getHeroImage(key) {
  return HERO_IMAGES[key] || null;
}

/**
 * Get all hero images as a flat array
 */
function getAllHeroImages() {
  return Object.entries(HERO_IMAGES).map(([key, image]) => ({
    key,
    ...image
  }));
}

/**
 * Get recommended overlay type for an image
 */
function getRecommendedOverlay(imageKey) {
  const image = getHeroImage(imageKey);
  return image ? image.bestOverlay : 'dark';
}

module.exports = {
  HERO_IMAGES,
  getHeroImagesByCategory,
  getHeroImage,
  getAllHeroImages,
  getRecommendedOverlay
};
