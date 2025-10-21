const express = require('express');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { optionalAuth, authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

// @desc    Get all properties with filters
// @route   GET /api/properties
// @access  Public
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    location,
    minPrice,
    maxPrice,
    propertyType,
    bhk,
    amenities,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    status = 'active'
  } = req.query;

  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('properties')
    .select(`
      *,
      property_images(id, url, is_primary),
      property_amenities(amenity_name),
      users!properties_owner_id_fkey(
        id,
        user_profiles(first_name, last_name, phone, avatar)
      )
    `, { count: 'exact' })
    .eq('status', status);

  // Apply filters
  if (location) {
    query = query.or(`city.ilike.%${location}%, state.ilike.%${location}%, address.ilike.%${location}%`);
  }

  if (minPrice) {
    query = query.gte('price', minPrice);
  }

  if (maxPrice) {
    query = query.lte('price', maxPrice);
  }

  if (propertyType && propertyType !== 'all') {
    query = query.eq('property_type', propertyType);
  }

  if (bhk && bhk !== 'all') {
    query = query.eq('bhk', bhk);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
  }

  if (amenities) {
    const amenityList = Array.isArray(amenities) ? amenities : [amenities];
    // This would need a more complex query in production
    // For now, we'll filter after fetching
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: properties, error, count } = await query;

  if (error) {
    throw error;
  }

  // Transform data
  const transformedProperties = properties.map(property => ({
    id: property.id,
    title: property.title,
    description: property.description,
    price: property.price,
    propertyType: property.property_type,
    listingType: property.listing_type,
    bhk: property.bhk,
    area: property.area,
    address: property.address,
    city: property.city,
    state: property.state,
    pincode: property.pincode,
    coordinates: property.coordinates,
    status: property.status,
    featured: property.featured,
    verified: property.verified,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    images: property.property_images?.map(img => ({
      id: img.id,
      url: img.url,
      isPrimary: img.is_primary
    })) || [],
    amenities: property.property_amenities?.map(a => a.amenity_name) || [],
    owner: property.users ? {
      id: property.users.id,
      name: property.users.user_profiles?.[0] ? 
        `${property.users.user_profiles[0].first_name} ${property.users.user_profiles[0].last_name}` : 
        'Unknown',
      phone: property.users.user_profiles?.[0]?.phone,
      avatar: property.users.user_profiles?.[0]?.avatar
    } : null
  }));

  // Calculate pagination info
  const totalPages = Math.ceil(count / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    success: true,
    data: {
      properties: transformedProperties,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    }
  });
}));

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: property, error } = await supabase
    .from('properties')
    .select(`
      *,
      property_images(id, url, is_primary, caption),
      property_amenities(amenity_name),
      property_nearby_places(place_name, place_type, distance),
      users!properties_owner_id_fkey(
        id,
        user_profiles(first_name, last_name, phone, avatar, bio)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  // Increment view count (if not owner)
  if (req.user && req.user.id !== property.owner_id) {
    await supabase
      .from('property_views')
      .insert({
        property_id: id,
        user_id: req.user.id,
        viewed_at: new Date().toISOString()
      });

    // Update view count
    await supabase
      .from('properties')
      .update({ 
        views: property.views + 1 
      })
      .eq('id', id);
  } else if (!req.user) {
    // Anonymous view
    await supabase
      .from('properties')
      .update({ 
        views: property.views + 1 
      })
      .eq('id', id);
  }

  // Transform data
  const transformedProperty = {
    id: property.id,
    title: property.title,
    description: property.description,
    price: property.price,
    propertyType: property.property_type,
    listingType: property.listing_type,
    bhk: property.bhk,
    area: property.area,
    address: property.address,
    city: property.city,
    state: property.state,
    pincode: property.pincode,
    coordinates: property.coordinates,
    status: property.status,
    featured: property.featured,
    verified: property.verified,
    views: property.views + 1,
    ageOfProperty: property.age_of_property,
    furnishingStatus: property.furnishing_status,
    parkingSpaces: property.parking_spaces,
    totalFloors: property.total_floors,
    propertyFloor: property.property_floor,
    facingDirection: property.facing_direction,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    images: property.property_images?.map(img => ({
      id: img.id,
      url: img.url,
      isPrimary: img.is_primary,
      caption: img.caption
    })) || [],
    amenities: property.property_amenities?.map(a => a.amenity_name) || [],
    nearbyPlaces: property.property_nearby_places?.map(place => ({
      name: place.place_name,
      type: place.place_type,
      distance: place.distance
    })) || [],
    owner: property.users ? {
      id: property.users.id,
      name: property.users.user_profiles?.[0] ? 
        `${property.users.user_profiles[0].first_name} ${property.users.user_profiles[0].last_name}` : 
        'Unknown',
      phone: property.users.user_profiles?.[0]?.phone,
      avatar: property.users.user_profiles?.[0]?.avatar,
      bio: property.users.user_profiles?.[0]?.bio
    } : null
  };

  res.json({
    success: true,
    data: {
      property: transformedProperty
    }
  });
}));

// @desc    Create new property
// @route   POST /api/properties
// @access  Private
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    propertyType,
    listingType,
    bhk,
    area,
    address,
    city,
    state,
    pincode,
    coordinates,
    images = [],
    amenities = [],
    nearbyPlaces = [],
    ageOfProperty,
    furnishingStatus,
    parkingSpaces,
    totalFloors,
    propertyFloor,
    facingDirection,
    status = 'pending'
  } = req.body;

  // Create property
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      title,
      description,
      price,
      property_type: propertyType,
      listing_type: listingType,
      bhk,
      area,
      address,
      city,
      state,
      pincode,
      coordinates,
      owner_id: req.user.id,
      status,
      age_of_property: ageOfProperty,
      furnishing_status: furnishingStatus,
      parking_spaces: parkingSpaces,
      total_floors: totalFloors,
      property_floor: propertyFloor,
      facing_direction: facingDirection,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (propertyError) {
    throw propertyError;
  }

  // Add images
  if (images.length > 0) {
    const imageInserts = images.map((image, index) => ({
      property_id: property.id,
      url: image.url,
      is_primary: image.isPrimary || index === 0,
      caption: image.caption || null
    }));

    const { error: imagesError } = await supabase
      .from('property_images')
      .insert(imageInserts);

    if (imagesError) {
      console.error('Failed to add images:', imagesError);
    }
  }

  // Add amenities
  if (amenities.length > 0) {
    const amenityInserts = amenities.map(amenity => ({
      property_id: property.id,
      amenity_name: amenity
    }));

    const { error: amenitiesError } = await supabase
      .from('property_amenities')
      .insert(amenityInserts);

    if (amenitiesError) {
      console.error('Failed to add amenities:', amenitiesError);
    }
  }

  // Add nearby places
  if (nearbyPlaces.length > 0) {
    const placesInserts = nearbyPlaces.map(place => ({
      property_id: property.id,
      place_name: place.name,
      place_type: place.type,
      distance: place.distance
    }));

    const { error: placesError } = await supabase
      .from('property_nearby_places')
      .insert(placesInserts);

    if (placesError) {
      console.error('Failed to add nearby places:', placesError);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: {
      property: {
        id: property.id,
        title: property.title,
        status: property.status
      }
    }
  });
}));

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if property exists and user owns it
  const { data: existingProperty, error: fetchError } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingProperty) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  if (existingProperty.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this property'
    });
  }

  const {
    title,
    description,
    price,
    propertyType,
    listingType,
    bhk,
    area,
    address,
    city,
    state,
    pincode,
    coordinates,
    status,
    ageOfProperty,
    furnishingStatus,
    parkingSpaces,
    totalFloors,
    propertyFloor,
    facingDirection
  } = req.body;

  // Update property
  const { data: property, error: updateError } = await supabase
    .from('properties')
    .update({
      title,
      description,
      price,
      property_type: propertyType,
      listing_type: listingType,
      bhk,
      area,
      address,
      city,
      state,
      pincode,
      coordinates,
      status,
      age_of_property: ageOfProperty,
      furnishing_status: furnishingStatus,
      parking_spaces: parkingSpaces,
      total_floors: totalFloors,
      property_floor: propertyFloor,
      facing_direction: facingDirection,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  res.json({
    success: true,
    message: 'Property updated successfully',
    data: {
      property
    }
  });
}));

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if property exists and user owns it
  const { data: existingProperty, error: fetchError } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingProperty) {
    return res.status(404).json({
      success: false,
      message: 'Property not found'
    });
  }

  if (existingProperty.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this property'
    });
  }

  // Delete property (cascade will handle related records)
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .eq('id', id);

  if (deleteError) {
    throw deleteError;
  }

  res.json({
    success: true,
    message: 'Property deleted successfully'
  });
}));

// @desc    Get user's properties
// @route   GET /api/properties/my-properties
// @access  Private
router.get('/my/properties', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  let query = supabase
    .from('properties')
    .select(`
      *,
      property_images(id, url, is_primary),
      property_amenities(amenity_name)
    `, { count: 'exact' })
    .eq('owner_id', req.user.id);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: properties, error, count } = await query;

  if (error) {
    throw error;
  }

  // Get analytics for each property
  const propertiesWithAnalytics = await Promise.all(
    properties.map(async (property) => {
      // Get recent views
      const { count: weeklyViews } = await supabase
        .from('property_views')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', property.id)
        .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get inquiries count
      const { count: inquiries } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', property.id);

      // Get favorites count
      const { count: favorites } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', property.id);

      return {
        ...property,
        analytics: {
          weeklyViews: weeklyViews || 0,
          totalInquiries: inquiries || 0,
          totalFavorites: favorites || 0
        }
      };
    })
  );

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    data: {
      properties: propertiesWithAnalytics,
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

module.exports = router;