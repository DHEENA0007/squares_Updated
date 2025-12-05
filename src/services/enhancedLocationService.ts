import { toast } from '@/hooks/use-toast';
import { localLocationService } from './localLocationService';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface State {
  id: string;
  name: string;
  countryCode: string;
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
}

export interface LocationSearchResult {
  id: string;
  name: string;
  type: 'country' | 'state' | 'district' | 'city' | 'pincode';
  fullPath: string;
  countryCode?: string;
  stateCode?: string;
  districtId?: string;
}

export interface LocationValidation {
  isValid: boolean;
  errors: string[];
}

export interface LocationHierarchy {
  country: Country;
  state: State | null;
  district: District | null;
  city: City | null;
}

export interface LocationStats {
  totalStates: number;
  totalDistricts: number;
  totalCities: number;
}

class EnhancedLocationService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("Location API request failed:", error);
      // Fallback to local service for basic operations
      throw error;
    }
  }

  // Get all countries - Only India for now
  async getCountries(): Promise<Country[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { countries: Country[] } }>('/local-locations/countries');
      return response.data.countries;
    } catch (error) {
      console.warn('API fallback to local service for countries');
      return localLocationService.getCountries();
    }
  }

  // Get states by country
  async getStatesByCountry(countryCode: string = 'IN'): Promise<State[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { states: State[] } }>(`/local-locations/states?countryCode=${countryCode}`);
      return response.data.states;
    } catch (error) {
      console.warn('API fallback to local service for states');
      return localLocationService.getStatesByCountry(countryCode);
    }
  }

  // Get districts by state
  async getDistrictsByState(stateCode: string): Promise<District[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { districts: District[] } }>(`/local-locations/districts?stateCode=${stateCode}`);
      return response.data.districts;
    } catch (error) {
      console.warn('API fallback to local service for districts');
      return localLocationService.getDistrictsByState(stateCode);
    }
  }

  // Get cities by district
  async getCitiesByDistrict(districtCode: string): Promise<City[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { cities: City[] } }>(`/local-locations/cities?districtCode=${districtCode}`);
      return response.data.cities;
    } catch (error) {
      console.warn('API fallback to local service for cities');
      return localLocationService.getCitiesByDistrict(districtCode);
    }
  }

  // Search locations
  async searchLocations(query: string, type?: 'state' | 'district' | 'city'): Promise<LocationSearchResult[]> {
    try {
      const typeParam = type ? `&type=${type}` : '';
      const response = await this.makeRequest<{ success: boolean; data: { results: LocationSearchResult[] } }>(`/local-locations/search?q=${encodeURIComponent(query)}${typeParam}`);
      return response.data.results;
    } catch (error) {
      console.warn('API fallback to local service for search');
      return localLocationService.searchLocations(query, type);
    }
  }

  // Get location suggestions for autocomplete
  async getLocationSuggestions(query: string, type: 'state' | 'district' | 'city', parentId?: string): Promise<LocationSearchResult[]> {
    try {
      // Use local service directly for better performance with autocomplete
      return localLocationService.getLocationSuggestions(query, type, parentId);
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      return [];
    }
  }

  // Validate location hierarchy
  async validateLocation(stateCode?: string, districtCode?: string, cityCode?: string): Promise<LocationValidation> {
    try {
      const params = new URLSearchParams();
      if (stateCode) params.append('stateCode', stateCode);
      if (districtCode) params.append('districtCode', districtCode);
      if (cityCode) params.append('cityCode', cityCode);

      const response = await this.makeRequest<{ success: boolean; data: LocationValidation }>(`/local-locations/validate?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.warn('API validation failed, using local validation');
      
      // Simple local validation
      const validation: LocationValidation = { isValid: true, errors: [] };
      
      if (stateCode && !localLocationService.isValidState(stateCode)) {
        validation.isValid = false;
        validation.errors.push('Invalid state');
      }
      
      if (districtCode && !localLocationService.isValidDistrict(districtCode, stateCode)) {
        validation.isValid = false;
        validation.errors.push('Invalid district');
      }
      
      if (cityCode && !localLocationService.isValidCity(cityCode, districtCode)) {
        validation.isValid = false;
        validation.errors.push('Invalid city');
      }

      return validation;
    }
  }

  // Get complete location hierarchy
  async getLocationHierarchy(cityId: string): Promise<LocationHierarchy | null> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: LocationHierarchy }>(`/local-locations/hierarchy/${cityId}`);
      return response.data;
    } catch (error) {
      console.warn('API fallback to local service for hierarchy');
      return localLocationService.getLocationHierarchy(cityId);
    }
  }

  // Get location statistics
  async getLocationStats(): Promise<LocationStats> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { stats: LocationStats } }>('/local-locations/stats');
      return response.data.stats;
    } catch (error) {
      console.warn('API fallback to local service for stats');
      return localLocationService.getStatistics();
    }
  }

  // Get formatted address from location codes
  getFormattedAddress(locationData: {
    cityCode?: string;
    districtCode?: string;
    stateCode?: string;
    countryCode?: string;
  }): string {
    return localLocationService.getFormattedAddress({
      cityId: locationData.cityCode,
      districtId: locationData.districtCode,
      stateId: locationData.stateCode,
      countryCode: locationData.countryCode
    });
  }

  // Get location by ID methods (using local service for performance)
  getStateById(stateId: string): State | null {
    return localLocationService.getStateById(stateId);
  }

  getDistrictById(districtId: string): District | null {
    return localLocationService.getDistrictById(districtId);
  }

  getCityById(cityId: string): City | null {
    return localLocationService.getCityById(cityId);
  }

  // Validation helpers
  isValidState(stateId: string): boolean {
    return localLocationService.isValidState(stateId);
  }

  isValidDistrict(districtId: string, stateId?: string): boolean {
    return localLocationService.isValidDistrict(districtId, stateId);
  }

  isValidCity(cityId: string, districtId?: string): boolean {
    return localLocationService.isValidCity(cityId, districtId);
  }

  // Hybrid method - try API first, fallback to local service
  async getStatesWithFallback(countryCode: string = 'IN'): Promise<State[]> {
    try {
      return await this.getStatesByCountry(countryCode);
    } catch (error) {
      toast({
        title: "Connection Issue",
        description: "Using offline location data",
        variant: "default"
      });
      return localLocationService.getStatesByCountry(countryCode);
    }
  }

  async getDistrictsWithFallback(stateCode: string): Promise<District[]> {
    try {
      return await this.getDistrictsByState(stateCode);
    } catch (error) {
      return localLocationService.getDistrictsByState(stateCode);
    }
  }

  async getCitiesWithFallback(districtCode: string): Promise<City[]> {
    try {
      return await this.getCitiesByDistrict(districtCode);
    } catch (error) {
      return localLocationService.getCitiesByDistrict(districtCode);
    }
  }
}

// Export singleton instance
export const enhancedLocationService = new EnhancedLocationService();
export default enhancedLocationService;
