const express = require('express');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware/errorMiddleware');
const router = express.Router();

// @desc    Get user's favorites
// @route   GET /api/favorites
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  const { data: favorites, error, count } = await supabase
    .from('user_favorites')
    .select(`
      id, created_at,
      properties (
        id, title, description, price, property_type, listing_type,
        bhk, area, city, state, status, featured, verified,
        property_images(id, url, is_primary)
      )
    `, { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      favorites: favorites.map(fav => ({
        id: fav.id,
        addedAt: fav.created_at,
        property: {
          ...fav.properties,
          images: fav.properties.property_images || []
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Add property to favorites
// @route   POST /api/favorites/:propertyId
// @access  Private
router.post('/:propertyId', asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  // Check if property exists
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  // Check if already in favorites
  const { data: existingFavorite } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('property_id', propertyId)
    .single();

  if (existingFavorite) {
    return res.status(400).json({
      success: false,
      message: 'Property already in favorites'
    });
  }

  // Add to favorites
  const { data: favorite, error } = await supabase
    .from('user_favorites')
    .insert({
      user_id: req.user.id,
      property_id: propertyId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(201).json({
    success: true,
    message: 'Property added to favorites',
    data: { favorite }
  });
}));

// @desc    Remove property from favorites
// @route   DELETE /api/favorites/:propertyId
// @access  Private
router.delete('/:propertyId', asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', req.user.id)
    .eq('property_id', propertyId);

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: 'Property removed from favorites'
  });
}));

// @desc    Check if property is in favorites
// @route   GET /api/favorites/check/:propertyId
// @access  Private
router.get('/check/:propertyId', asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const { data: favorite } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('property_id', propertyId)
    .single();

  res.json({
    success: true,
    data: {
      isFavorite: !!favorite
    }
  });
}));

// @desc    Bulk remove favorites
// @route   DELETE /api/favorites/bulk
// @access  Private
router.delete('/bulk', asyncHandler(async (req, res) => {
  const { propertyIds } = req.body;

  if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Property IDs array is required'
    });
  }

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', req.user.id)
    .in('property_id', propertyIds);

  if (error) {
    throw error;
  }

  res.json({
    success: true,
    message: `${propertyIds.length} properties removed from favorites`
  });
}));

module.exports = router;