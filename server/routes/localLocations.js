const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// Load location data from the frontend location.json file
const locationDataPath = path.join(__dirname, '../../src/services/location.json');
let locationData = {};

try {
  const rawData = fs.readFileSync(locationDataPath, 'utf8');
  locationData = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading location data:', error);
  locationData = { India: {} };
}

// Helper function to generate ID from name
const generateId = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to get state name by ID
const getStateNameById = (stateId) => {
  for (const stateName of Object.keys(locationData.India)) {
    if (generateId(stateName) === stateId) {
      return stateName;
    }
  }
  return null;
};

// Helper function to get district info by ID
const getDistrictInfo = (districtId) => {
  for (const [stateName, stateData] of Object.entries(locationData.India)) {
    for (const districtName of Object.keys(stateData.districts)) {
      if (generateId(districtName) === districtId) {
        return { stateName, districtName };
      }
    }
  }
  return null;
};

// @route   GET /api/local-locations/countries
// @desc    Get all countries (only India for now)
// @access  Public
router.get('/countries', asyncHandler(async (req, res) => {
  const countries = [{
    id: 'IN',
    name: 'India',
    code: 'IN'
  }];

  res.json({
    success: true,
    data: { countries }
  });
}));

// @route   GET /api/local-locations/states
// @desc    Get states by country
// @access  Public
router.get('/states', asyncHandler(async (req, res) => {
  const { countryCode = 'IN' } = req.query;

  if (countryCode !== 'IN') {
    return res.json({
      success: true,
      data: { states: [] }
    });
  }

  const states = Object.keys(locationData.India).map(stateName => ({
    id: generateId(stateName),
    name: stateName,
    countryCode: 'IN'
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    success: true,
    data: { states }
  });
}));

// @route   GET /api/local-locations/districts
// @desc    Get districts by state
// @access  Public
router.get('/districts', asyncHandler(async (req, res) => {
  const { stateCode } = req.query;

  if (!stateCode) {
    return res.status(400).json({
      success: false,
      message: 'State code is required'
    });
  }

  const stateName = getStateNameById(stateCode);
  if (!stateName || !locationData.India[stateName]) {
    return res.json({
      success: true,
      data: { districts: [] }
    });
  }

  const districts = Object.keys(locationData.India[stateName].districts).map(districtName => ({
    id: generateId(districtName),
    name: districtName,
    stateCode: stateCode,
    countryCode: 'IN'
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    success: true,
    data: { districts }
  });
}));

// @route   GET /api/local-locations/cities
// @desc    Get cities by district
// @access  Public
router.get('/cities', asyncHandler(async (req, res) => {
  const { districtCode } = req.query;

  if (!districtCode) {
    return res.status(400).json({
      success: false,
      message: 'District code is required'
    });
  }

  const districtInfo = getDistrictInfo(districtCode);
  if (!districtInfo) {
    return res.json({
      success: true,
      data: { cities: [] }
    });
  }

  const { stateName, districtName } = districtInfo;
  const districtData = locationData.India[stateName].districts[districtName];
  
  if (!districtData || !districtData.cities) {
    return res.json({
      success: true,
      data: { cities: [] }
    });
  }

  const cities = districtData.cities.map(cityName => ({
    id: generateId(cityName),
    name: cityName,
    districtId: districtCode,
    stateCode: generateId(stateName),
    countryCode: 'IN'
  })).sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    success: true,
    data: { cities }
  });
}));

// @route   GET /api/local-locations/search
// @desc    Search locations by query
// @access  Public
router.get('/search', asyncHandler(async (req, res) => {
  const { q: query, type } = req.query;

  if (!query || query.length < 2) {
    return res.json({
      success: true,
      data: { results: [] }
    });
  }

  const searchTerm = query.toLowerCase().trim();
  const results = [];

  // Search in states
  if (!type || type === 'state') {
    Object.keys(locationData.India).forEach(stateName => {
      if (stateName.toLowerCase().includes(searchTerm)) {
        results.push({
          id: generateId(stateName),
          name: stateName,
          type: 'state',
          fullPath: `India > ${stateName}`,
          countryCode: 'IN'
        });
      }
    });
  }

  // Search in districts
  if (!type || type === 'district') {
    Object.entries(locationData.India).forEach(([stateName, stateData]) => {
      Object.keys(stateData.districts).forEach(districtName => {
        if (districtName.toLowerCase().includes(searchTerm)) {
          results.push({
            id: generateId(districtName),
            name: districtName,
            type: 'district',
            fullPath: `India > ${stateName} > ${districtName}`,
            countryCode: 'IN',
            stateCode: generateId(stateName)
          });
        }
      });
    });
  }

  // Search in cities
  if (!type || type === 'city') {
    Object.entries(locationData.India).forEach(([stateName, stateData]) => {
      Object.entries(stateData.districts).forEach(([districtName, districtData]) => {
        if (districtData.cities) {
          districtData.cities.forEach(cityName => {
            if (cityName.toLowerCase().includes(searchTerm)) {
              results.push({
                id: generateId(cityName),
                name: cityName,
                type: 'city',
                fullPath: `India > ${stateName} > ${districtName} > ${cityName}`,
                countryCode: 'IN',
                stateCode: generateId(stateName),
                districtId: generateId(districtName)
              });
            }
          });
        }
      });
    });
  }

  // Sort by relevance (exact matches first, then alphabetical)
  const sortedResults = results
    .sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchTerm;
      const bExact = b.name.toLowerCase() === searchTerm;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return a.name.localeCompare(b.name);
    })
    .slice(0, 50); // Limit results for performance

  res.json({
    success: true,
    data: { results: sortedResults }
  });
}));

// @route   GET /api/local-locations/validate
// @desc    Validate location hierarchy
// @access  Public
router.get('/validate', asyncHandler(async (req, res) => {
  const { stateCode, districtCode, cityCode } = req.query;

  const validation = {
    isValid: true,
    errors: []
  };

  if (stateCode) {
    const stateName = getStateNameById(stateCode);
    if (!stateName) {
      validation.isValid = false;
      validation.errors.push('Invalid state code');
    }
  }

  if (districtCode) {
    const districtInfo = getDistrictInfo(districtCode);
    if (!districtInfo) {
      validation.isValid = false;
      validation.errors.push('Invalid district code');
    } else if (stateCode && generateId(districtInfo.stateName) !== stateCode) {
      validation.isValid = false;
      validation.errors.push('District does not belong to the specified state');
    }
  }

  if (cityCode && districtCode) {
    const districtInfo = getDistrictInfo(districtCode);
    if (districtInfo) {
      const { stateName, districtName } = districtInfo;
      const cities = locationData.India[stateName].districts[districtName].cities || [];
      const cityExists = cities.some(cityName => generateId(cityName) === cityCode);
      
      if (!cityExists) {
        validation.isValid = false;
        validation.errors.push('City does not exist in the specified district');
      }
    }
  }

  res.json({
    success: true,
    data: validation
  });
}));

// @route   GET /api/local-locations/hierarchy/:cityId
// @desc    Get complete location hierarchy for a city
// @access  Public
router.get('/hierarchy/:cityId', asyncHandler(async (req, res) => {
  const { cityId } = req.params;

  // Find city in the data
  let hierarchy = null;

  for (const [stateName, stateData] of Object.entries(locationData.India)) {
    for (const [districtName, districtData] of Object.entries(stateData.districts)) {
      if (districtData.cities) {
        for (const cityName of districtData.cities) {
          if (generateId(cityName) === cityId) {
            hierarchy = {
              country: { id: 'IN', name: 'India', code: 'IN' },
              state: { id: generateId(stateName), name: stateName, countryCode: 'IN' },
              district: { 
                id: generateId(districtName), 
                name: districtName, 
                stateCode: generateId(stateName),
                countryCode: 'IN'
              },
              city: { 
                id: cityId, 
                name: cityName, 
                districtId: generateId(districtName),
                stateCode: generateId(stateName),
                countryCode: 'IN'
              }
            };
            break;
          }
        }
        if (hierarchy) break;
      }
    }
    if (hierarchy) break;
  }

  if (!hierarchy) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }

  res.json({
    success: true,
    data: hierarchy
  });
}));

// @route   GET /api/local-locations/stats
// @desc    Get location data statistics
// @access  Public
router.get('/stats', asyncHandler(async (req, res) => {
  let totalDistricts = 0;
  let totalCities = 0;

  Object.values(locationData.India).forEach(stateData => {
    totalDistricts += Object.keys(stateData.districts).length;
    
    Object.values(stateData.districts).forEach(districtData => {
      if (districtData.cities) {
        totalCities += districtData.cities.length;
      }
    });
  });

  const stats = {
    totalStates: Object.keys(locationData.India).length,
    totalDistricts,
    totalCities
  };

  res.json({
    success: true,
    data: { stats }
  });
}));

module.exports = router;
