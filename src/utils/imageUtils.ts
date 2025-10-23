/**
 * Utility functions for handling images in development
 */

// Collection of property-related Unsplash images for development
const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop&auto=format', // Modern house exterior
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop&auto=format', // Villa with garden
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format', // Apartment building
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop&auto=format', // Modern home exterior
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&auto=format', // Beautiful house with garden
  'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop&auto=format', // Contemporary home
  'https://images.unsplash.com/photo-1601760562234-9814eea6663a?w=400&h=300&fit=crop&auto=format', // Minimalist house
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&h=300&fit=crop&auto=format', // Modern apartment
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop&auto=format', // Luxury villa
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop&auto=format', // Traditional house
];

const INTERIOR_IMAGES = [
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format', // Living room
  'https://images.unsplash.com/photo-1560448075-bb485b067938?w=400&h=300&fit=crop&auto=format', // Modern kitchen
  'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=400&h=300&fit=crop&auto=format', // Bedroom
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&h=300&fit=crop&auto=format', // Bathroom
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format', // Dining room
];

/**
 * Get a random property image for development
 */
export const getRandomPropertyImage = (width = 400, height = 300): string => {
  const randomIndex = Math.floor(Math.random() * PROPERTY_IMAGES.length);
  return PROPERTY_IMAGES[randomIndex].replace(/w=\d+&h=\d+/, `w=${width}&h=${height}`);
};

/**
 * Get a random interior image for development
 */
export const getRandomInteriorImage = (width = 400, height = 300): string => {
  const randomIndex = Math.floor(Math.random() * INTERIOR_IMAGES.length);
  return INTERIOR_IMAGES[randomIndex].replace(/w=\d+&h=\d+/, `w=${width}&h=${height}`);
};

/**
 * Get multiple random property images
 */
export const getRandomPropertyImages = (count: number, width = 400, height = 300): string[] => {
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    images.push(getRandomPropertyImage(width, height));
  }
  return images;
};

/**
 * Get a property image by type
 */
export const getPropertyImageByType = (
  type: 'apartment' | 'house' | 'villa' | 'plot' | 'land' | 'commercial' | 'office' | 'pg',
  width = 400,
  height = 300
): string => {
  const typeImageMap = {
    apartment: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format',
    house: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop&auto=format',
    villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop&auto=format',
    plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop&auto=format',
    land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop&auto=format',
    commercial: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&h=300&fit=crop&auto=format',
    office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format',
    pg: 'https://images.unsplash.com/photo-1555854877-bab0e6480e44?w=400&h=300&fit=crop&auto=format'
  };

  return typeImageMap[type].replace(/w=\d+&h=\d+/, `w=${width}&h=${height}`);
};

/**
 * Default fallback property image
 */
export const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop&auto=format';