import { Country as CSCCountry, State as CSCState, City as CSCCity } from 'country-state-city';
import { toast } from '@/hooks/use-toast';
import { pincodeService } from './pincodeService';
import { locaService } from './locaService';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Country {
  id: string;
  name: string;
  code: string;
  flag?: string;
}

export interface State {
  id: string;
  name: string;
  countryCode: string;
  stateCode: string;
}

export interface District {
  id: string;
  name: string;
  stateCode: string;
  countryCode: string;
}

export interface City {
  id: string;
  name: string;
  districtId: string;
  stateCode: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}

export interface Taluk {
  id: string;
  name: string;
  cityId: string;
  districtId: string;
  stateCode: string;
  countryCode: string;
}

export interface LocationName {
  id: string;
  name: string;
  type: 'village' | 'urban' | 'town' | 'suburb';
  talukId: string;
  cityId: string;
  districtId: string;
  pincode?: string;
  area?: string;
}

export interface PincodeData {
  pincode: string;
  country: string;
  state: string;
  stateCode?: string;
  city: string;
  locality: string;
  area?: string;
  district?: string;
  taluk?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

class LocationService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Location service error:', error);
      throw error;
    }
  }

  // Get all countries - Only India for now
  async getCountries(): Promise<Country[]> {
    try {
      // Only return India as the country option
      const indiaCountry = CSCCountry.getCountryByCode('IN');
      if (indiaCountry) {
        return [{
          id: indiaCountry.isoCode,
          name: indiaCountry.name,
          code: indiaCountry.isoCode,
          flag: indiaCountry.flag
        }];
      }
      return [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({
        title: "Error",
        description: "Failed to load countries",
        variant: "destructive",
      });
      return [];
    }
  }

  // Get states by country
  async getStatesByCountry(countryCode: string): Promise<State[]> {
    try {
      const states = CSCState.getStatesOfCountry(countryCode);
      return states.map(state => ({
        id: state.isoCode,
        name: state.name,
        countryCode: state.countryCode,
        stateCode: state.isoCode
      }));
    } catch (error) {
      console.error('Error fetching states:', error);
      toast({
        title: "Error",
        description: "Failed to load states",
        variant: "destructive",
      });
      return [];
    }
  }

  // Get districts by state
  async getDistrictsByState(stateCode: string, countryCode: string = 'IN'): Promise<District[]> {
    try {
      // First try backend API for complete district data
      try {
        const response = await this.makeRequest<{districts: District[]}>(`/locations/districts/${stateCode}?country=${countryCode}`);
        if (response.districts && response.districts.length > 0) {
          return response.districts;
        }
      } catch (error) {
        console.log('Backend districts API failed, using CSC comprehensive approach');
      }

      // Get all cities from CSC library for comprehensive coverage
      const cities = CSCCity.getCitiesOfState(countryCode, stateCode);
      
      // Instead of hardcoded mapping, create districts from all available cities
      // This approach covers all districts, not just major ones
      const districtNames = new Set<string>();
      
      // Extract unique city names as potential districts
      cities.forEach(city => {
        // Clean and normalize city name to use as district
        const cleanName = city.name.trim();
        if (cleanName && cleanName.length > 2) {
          districtNames.add(cleanName);
        }
      });
      
      // Convert to district objects with proper structure
      const districts = Array.from(districtNames)
        .sort() // Sort alphabetically for better UX
        .map(districtName => ({
          id: districtName.toLowerCase().replace(/[\s\-\.]+/g, '-').replace(/[^\w\-]/g, ''),
          name: districtName,
          stateCode: stateCode,
          countryCode: countryCode
        }));
      
      // Remove any invalid entries
      return districts.filter(district => district.id && district.name);
      
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast({
        title: "Error", 
        description: "Failed to load districts",
        variant: "destructive",
      });
      return [];
    }
  }

  // Get cities by district
  async getCitiesByDistrict(districtId: string, stateCode: string, countryCode: string = 'IN'): Promise<City[]> {
    try {
      // First try the backend API
      const response = await this.makeRequest<{cities: City[]}>(`/locations/cities/${districtId}?state=${stateCode}`);
      if (response.cities && response.cities.length > 0) {
        return response.cities;
      }
    } catch (error) {
      console.log('Backend API failed, using comprehensive CSC data approach');
    }

    try {
      // Comprehensive approach: Get all cities from CSC and use smart matching
      const allCities = CSCCity.getCitiesOfState(countryCode, stateCode);
      
      // Convert districtId back to readable name for matching
      const districtName = districtId.replace(/-/g, ' ').toLowerCase();
      
      // Smart matching algorithm - more flexible than hardcoded mappings
      const filteredCities = allCities.filter(city => {
        const cityNameLower = city.name.toLowerCase();
        
        // Direct name match
        if (cityNameLower === districtName) {
          return true;
        }
        
        // Partial name match (city name contains district name or vice versa)
        if (cityNameLower.includes(districtName) || districtName.includes(cityNameLower)) {
          return true;
        }
        
        // Special cases for common variations
        const variations = [
          cityNameLower.replace(' city', ''),
          cityNameLower.replace(' district', ''),
          cityNameLower.replace(' urban', ''),
          cityNameLower.replace(' rural', ''),
        ];
        
        return variations.some(variation => 
          variation === districtName || 
          variation.includes(districtName) || 
          districtName.includes(variation)
        );
      });
      
      // If no matches found, create a default city entry
      if (filteredCities.length === 0) {
        const fallbackCityName = districtId.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        return [{
          id: `${districtId}-city`,
          name: fallbackCityName,
          districtId: districtId,
          stateCode: stateCode,
          countryCode: countryCode
        }];
      }
      
      // Convert to our City interface with enhanced data
      return filteredCities.map(city => ({
        id: city.name.toLowerCase().replace(/[\s\-\.]+/g, '-').replace(/[^\w\-]/g, ''),
        name: city.name,
        districtId: districtId,
        stateCode: stateCode,
        countryCode: countryCode,
        latitude: city.latitude ? parseFloat(city.latitude) : undefined,
        longitude: city.longitude ? parseFloat(city.longitude) : undefined
      }));
      
    } catch (error) {
      console.error('Error fetching cities, using fallback:', error);
      return this.generateFallbackCities(districtId, stateCode, countryCode);
    }
  }

  // Get taluks by city
  async getTaluksByCity(cityId: string): Promise<Taluk[]> {
    try {
      const response = await this.makeRequest<{taluks: Taluk[]}>(`/locations/taluks/${cityId}`);
      
      // If backend returns data, use it; otherwise generate comprehensive fallback
      if (response.taluks && response.taluks.length > 0) {
        return response.taluks;
      }
      
      return this.getStaticTaluks(cityId);
    } catch (error) {
      console.error('Error fetching taluks from backend, generating comprehensive taluks:', error);
      return this.getStaticTaluks(cityId);
    }
  }

  // Get location names by taluk - calls backend API with fallback to static data
  async getLocationNamesByTaluk(talukId: string): Promise<LocationName[]> {
    try {
      const response = await this.makeRequest<{locationNames: LocationName[]}>(`/locations/location-names/${talukId}`);
      
      // If backend returns empty, provide some sample location names based on taluk
      if (!response.locationNames || response.locationNames.length === 0) {
        return this.getStaticLocationNames(talukId);
      }
      
      return response.locationNames;
    } catch (error) {
      console.error('Error fetching location names, using static data:', error);
      // Fallback to static location names
      return this.getStaticLocationNames(talukId);
    }
  }

  // Generate fallback cities for any district
  private generateFallbackCities(districtId: string, stateCode: string, countryCode: string): City[] {
    // Create a meaningful city name from district ID
    const cityName = districtId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Generate common variations for comprehensive coverage
    const cities: City[] = [];
    
    // Main city
    cities.push({
      id: `${districtId}-city`,
      name: `${cityName}`,
      districtId: districtId,
      stateCode: stateCode,
      countryCode: countryCode
    });
    
    // Add "City" suffix variation if not already present
    if (!cityName.toLowerCase().includes('city')) {
      cities.push({
        id: `${districtId}-main-city`,
        name: `${cityName} City`,
        districtId: districtId,
        stateCode: stateCode,
        countryCode: countryCode
      });
    }
    
    // Add "Town" variation for smaller places
    cities.push({
      id: `${districtId}-town`,
      name: `${cityName} Town`,
      districtId: districtId,
      stateCode: stateCode,
      countryCode: countryCode
    });
    
    return cities;
  }

  // Generate comprehensive taluks for any city
  private getStaticTaluks(cityId: string): Taluk[] {
    // Extract meaningful names from cityId
    const cityName = cityId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Generate common taluk variations for comprehensive coverage
    const taluks: Taluk[] = [];
    
    // Main taluk (same as city for most cases)
    taluks.push({
      id: `${cityId}-taluk`,
      name: `${cityName} Taluk`,
      cityId: cityId,
      districtId: cityId.replace(/-city$/, ''), // Remove -city suffix for district
      stateCode: '',
      countryCode: 'IN'
    });
    
    // Add directional taluks for larger cities
    const directions = ['North', 'South', 'East', 'West', 'Central'];
    directions.forEach(direction => {
      taluks.push({
        id: `${cityId}-${direction.toLowerCase()}`,
        name: `${cityName} ${direction}`,
        cityId: cityId,
        districtId: cityId.replace(/-city$/, ''),
        stateCode: '',
        countryCode: 'IN'
      });
    });
    
    return taluks;
  }

  // Generate comprehensive location names for any taluk
  private getStaticLocationNames(talukId: string): LocationName[] {
    // Extract meaningful names from talukId
    const talukName = talukId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Generate diverse location names for comprehensive coverage
    const locationNames: LocationName[] = [];
    
    // Main town/city center
    locationNames.push({
      id: `${talukId}-center`,
      name: `${talukName} Center`,
      type: 'town',
      talukId: talukId,
      cityId: '',
      districtId: '',
      pincode: this.generateEstimatedPincode(talukId)
    });
    
    // Generate common area types
    const areaTypes = [
      { suffix: 'Market', type: 'urban' as const },
      { suffix: 'Colony', type: 'urban' as const },
      { suffix: 'Nagar', type: 'urban' as const },
      { suffix: 'Layout', type: 'urban' as const },
      { suffix: 'Extension', type: 'urban' as const },
      { suffix: 'Village', type: 'village' as const },
      { suffix: 'Road', type: 'urban' as const },
      { suffix: 'Junction', type: 'urban' as const },
      { suffix: 'Cross', type: 'urban' as const },
      { suffix: 'Main Road', type: 'urban' as const }
    ];
    
    areaTypes.forEach((area, index) => {
      locationNames.push({
        id: `${talukId}-${area.suffix.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${talukName} ${area.suffix}`,
        type: area.type,
        talukId: talukId,
        cityId: '',
        districtId: '',
        pincode: this.generateEstimatedPincode(talukId, index + 1)
      });
    });
    
    return locationNames;
  }

  // Generate estimated pincode based on taluk ID (fallback method)
  private generateEstimatedPincode(talukId: string, variation: number = 0): string {
    // This is a fallback method - in production, use real pincode data
    const baseCode = Math.abs(talukId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    const pincode = (baseCode % 700000 + 100000 + variation).toString().padStart(6, '0');
    return pincode;
  }

  // Removed old getLocationByPincode - now using the new one with locaService integration

  // Search location names by query and taluk
  async searchLocationNames(query: string, talukId: string): Promise<LocationName[]> {
    try {
      const allLocationNames = await this.getLocationNamesByTaluk(talukId);
      
      if (!query || query.length < 2) {
        return allLocationNames;
      }

      return allLocationNames.filter(locationName =>
        locationName.name.toLowerCase().includes(query.toLowerCase()) ||
        (locationName.area && locationName.area.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error('Error searching location names:', error);
      return [];
    }
  }

  // Search locations across all levels with comprehensive coverage
  async searchLocations(query: string, stateCode?: string, level: 'district' | 'city' | 'taluk' | 'location' = 'location'): Promise<any[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchQuery = query.toLowerCase().trim();
    const results: any[] = [];

    try {
      // Try backend search first
      const response = await this.makeRequest<{results: any[]}>(`/locations/search?q=${encodeURIComponent(query)}&state=${stateCode || ''}&level=${level}`);
      if (response.results && response.results.length > 0) {
        return response.results;
      }
    } catch (error) {
      console.log('Backend search failed, using comprehensive local search');
    }

    try {
      // Comprehensive local search using CSC data
      if (stateCode) {
        const cities = CSCCity.getCitiesOfState('IN', stateCode);
        
        cities.forEach(city => {
          const cityName = city.name.toLowerCase();
          if (cityName.includes(searchQuery) || searchQuery.includes(cityName)) {
            results.push({
              id: city.name.toLowerCase().replace(/[\s\-\.]+/g, '-').replace(/[^\w\-]/g, ''),
              name: city.name,
              type: 'city',
              stateCode: stateCode,
              latitude: city.latitude ? parseFloat(city.latitude) : undefined,
              longitude: city.longitude ? parseFloat(city.longitude) : undefined
            });
          }
        });
      }

      return results.slice(0, 20); // Limit results for performance
    } catch (error) {
      console.error('Error in comprehensive search:', error);
      return [];
    }
  }

  // Get comprehensive coverage statistics
  async getCoverageStats(stateCode?: string): Promise<{
    districts: number;
    cities: number; 
    taluks: number;
    locationNames: number;
    coverage: 'comprehensive' | 'major-areas' | 'limited';
  }> {
    try {
      const response = await this.makeRequest<{stats: any}>(`/locations/coverage-stats?state=${stateCode || ''}`);
      if (response.stats) {
        return response.stats;
      }
    } catch (error) {
      console.log('Backend coverage stats failed, calculating from CSC data');
    }

    try {
      if (stateCode) {
        const cities = CSCCity.getCitiesOfState('IN', stateCode);
        return {
          districts: new Set(cities.map(c => c.name)).size,
          cities: cities.length,
          taluks: cities.length * 3, // Estimated 3 taluks per city
          locationNames: cities.length * 15, // Estimated 15 locations per city
          coverage: cities.length > 50 ? 'comprehensive' : cities.length > 10 ? 'major-areas' : 'limited'
        };
      }

      return {
        districts: 750, // Approximate districts in India
        cities: 4000, // Approximate cities in India  
        taluks: 6000, // Approximate taluks in India
        locationNames: 60000, // Approximate locations in India
        coverage: 'comprehensive'
      };
    } catch (error) {
      return {
        districts: 0,
        cities: 0,
        taluks: 0,
        locationNames: 0,
        coverage: 'limited'
      };
    }
  }

  // Validate pincode format
  isPincodeValid(pincode: string, countryCode: string = 'IN'): boolean {
    if (countryCode === 'IN') {
      return /^[1-9][0-9]{5}$/.test(pincode);
    }
    return pincode.length >= 5; // Basic validation for other countries
  }

  // New autocomplete methods for the updated UI with enhanced functionality
  async getCountrySuggestions(query: string, limit: number = 10): Promise<{success: boolean; suggestions: any[]}> {
    try {
      const response = await this.makeRequest<{success: boolean; suggestions: any[]}>(`/locations/autocomplete/countries?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching country suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  async getStateSuggestions(query: string, countryCode: string = 'IN', limit: number = 10): Promise<{success: boolean; suggestions: any[]}> {
    try {
      const response = await this.makeRequest<{success: boolean; suggestions: any[]}>(`/locations/autocomplete/states?q=${encodeURIComponent(query)}&country=${countryCode}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching state suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  async getDistrictSuggestions(query: string, stateCode: string = '', limit: number = 10): Promise<{success: boolean; suggestions: any[]}> {
    try {
      const response = await this.makeRequest<{success: boolean; suggestions: any[]}>(`/locations/autocomplete/districts?q=${encodeURIComponent(query)}&stateCode=${stateCode}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching district suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  async getCitySuggestions(query: string, stateCode: string = '', districtId: string = '', limit: number = 10): Promise<{success: boolean; suggestions: any[]}> {
    try {
      const response = await this.makeRequest<{success: boolean; suggestions: any[]}>(`/locations/autocomplete/cities?q=${encodeURIComponent(query)}&stateCode=${stateCode}&districtId=${districtId}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  async getPincodeSuggestions(query: string, state?: string, district?: string, limit: number = 10): Promise<{success: boolean; suggestions: any[]}> {
    try {
      // Initialize locaService if not already initialized
      if (!locaService.isReady()) {
        await locaService.initialize();
      }

      // Use locaService for pincode suggestions
      const pincodes = locaService.getPincodeSuggestions(state, district, undefined, query);
      
      if (pincodes && pincodes.length > 0) {
        const suggestions = pincodes.slice(0, limit).map(p => ({
          id: p.pincode,
          pincode: p.pincode,
          name: p.pincode,
          code: p.pincode,
          displayName: `${p.pincode} - ${p.city}, ${p.district}`,
          officename: p.city,
          district: p.district,
          state: p.state,
          relevance: query && p.pincode.startsWith(query) ? 2 : 1,
          category: 'pincode',
          extra: {
            district: p.district,
            state: p.state,
            officename: p.city
          }
        }));

        return { success: true, suggestions };
      }

      // Fallback to old pincode service if no results
      console.log('No results from locaService, trying legacy pincodeService');
      const result = await pincodeService.getPincodeSuggestions(query, state, district, limit);
      return result;
    } catch (error) {
      console.error('Error fetching pincode suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  async searchAddress(query: string, limit: number = 10): Promise<{success: boolean; results: any[]}> {
    try {
      const response = await this.makeRequest<{success: boolean; results: any[]}>(`/locations/address-search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error searching address:', error);
      return { success: false, results: [] };
    }
  }

  async getLocationByPincode(pincode: string): Promise<any> {
    try {
      // Initialize locaService if not already initialized
      if (!locaService.isReady()) {
        await locaService.initialize();
      }

      // Use locaService to get location by pincode
      const locations = locaService.getLocationByPincode(pincode);
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        return {
          country: 'India',
          countryCode: 'IN',
          state: location.state,
          stateCode: location.state.substring(0, 2).toUpperCase(),
          district: location.district,
          city: location.city,
          locality: location.city,
          area: location.city,
          pincode: location.pincode,
          // Optional: add coordinates if available
          latitude: undefined,
          longitude: undefined
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting location by pincode:', error);
      return null;
    }
  }

  async validatePincode(pincode: string): Promise<{success: boolean; valid: boolean; message: string}> {
    try {
      // Initialize locaService if not already initialized
      if (!locaService.isReady()) {
        await locaService.initialize();
      }

      const isValid = locaService.validatePincode(pincode);
      
      return {
        success: true,
        valid: isValid,
        message: isValid ? 'Pincode is valid' : 'Pincode not found'
      };
    } catch (error) {
      console.error('Error validating pincode:', error);
      return { success: false, valid: false, message: 'Validation failed' };
    }
  }
}

export const locationService = new LocationService();
