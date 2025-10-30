import locationData from './location.json';

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
  type: 'country' | 'state' | 'district' | 'city';
  fullPath: string;
  countryCode?: string;
  stateCode?: string;
  districtId?: string;
}

class LocalLocationService {
  private locationCache: Map<string, any> = new Map();

  constructor() {
    // Pre-process location data for faster lookups
    this.preprocessLocationData();
  }

  private preprocessLocationData() {
    // Cache processed data for faster lookups
    const countries = this.getCountries();
    this.locationCache.set('countries', countries);

    countries.forEach(country => {
      const states = this.getStatesByCountry(country.code);
      this.locationCache.set(`states_${country.code}`, states);

      states.forEach(state => {
        const districts = this.getDistrictsByState(state.id);
        this.locationCache.set(`districts_${state.id}`, districts);

        districts.forEach(district => {
          const cities = this.getCitiesByDistrict(district.id);
          this.locationCache.set(`cities_${district.id}`, cities);
        });
      });
    });
  }

  // Get all countries - Only India for now
  getCountries(): Country[] {
    const cached = this.locationCache.get('countries');
    if (cached) return cached;

    return [{
      id: 'IN',
      name: 'India',
      code: 'IN'
    }];
  }

  // Get states by country
  getStatesByCountry(countryCode: string): State[] {
    const cached = this.locationCache.get(`states_${countryCode}`);
    if (cached) return cached;

    if (countryCode !== 'IN') return [];

    const states: State[] = [];
    
    Object.keys(locationData.India).forEach(stateName => {
      const stateId = this.generateId(stateName);
      states.push({
        id: stateId,
        name: stateName,
        countryCode: 'IN'
      });
    });

    return states.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get districts by state
  getDistrictsByState(stateId: string): District[] {
    const cached = this.locationCache.get(`districts_${stateId}`);
    if (cached) return cached;

    const stateName = this.getStateNameById(stateId);
    if (!stateName || !locationData.India[stateName]) return [];

    const districts: District[] = [];
    const stateData = locationData.India[stateName];

    Object.keys(stateData.districts).forEach(districtName => {
      const districtId = this.generateId(districtName);
      districts.push({
        id: districtId,
        name: districtName,
        stateCode: stateId,
        countryCode: 'IN'
      });
    });

    return districts.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get cities by district
  getCitiesByDistrict(districtId: string): City[] {
    const cached = this.locationCache.get(`cities_${districtId}`);
    if (cached) return cached;

    const districtInfo = this.getDistrictInfo(districtId);
    if (!districtInfo) return [];

    const { stateName, districtName } = districtInfo;
    const districtData = locationData.India[stateName].districts[districtName];
    
    if (!districtData || !districtData.cities) return [];

    const cities: City[] = [];
    
    districtData.cities.forEach(cityName => {
      const cityId = this.generateId(cityName);
      cities.push({
        id: cityId,
        name: cityName,
        districtId: districtId,
        stateCode: this.generateId(stateName),
        countryCode: 'IN'
      });
    });

    return cities.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Search functionality
  searchLocations(query: string, type?: 'state' | 'district' | 'city'): LocationSearchResult[] {
    if (!query || query.length < 2) return [];

    const searchTerm = query.toLowerCase().trim();
    const results: LocationSearchResult[] = [];

    // Search in states
    if (!type || type === 'state') {
      Object.keys(locationData.India).forEach(stateName => {
        if (stateName.toLowerCase().includes(searchTerm)) {
          results.push({
            id: this.generateId(stateName),
            name: stateName,
            type: 'state',
            fullPath: `India > ${stateName}`,
            countryCode: 'IN',
            stateCode: this.generateId(stateName)
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
              id: this.generateId(districtName),
              name: districtName,
              type: 'district',
              fullPath: `India > ${stateName} > ${districtName}`,
              countryCode: 'IN',
              stateCode: this.generateId(stateName),
              districtId: this.generateId(districtName)
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
                  id: this.generateId(cityName),
                  name: cityName,
                  type: 'city',
                  fullPath: `India > ${stateName} > ${districtName} > ${cityName}`,
                  countryCode: 'IN',
                  stateCode: this.generateId(stateName),
                  districtId: this.generateId(districtName)
                });
              }
            });
          }
        });
      });
    }

    // Sort by relevance (exact matches first, then alphabetical)
    return results
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, 50); // Limit results for performance
  }

  // Get location suggestions for autocomplete
  getLocationSuggestions(query: string, type: 'state' | 'district' | 'city', parentId?: string): LocationSearchResult[] {
    if (!query || query.length < 1) {
      // Return all options for the type when no query
      return this.getAllLocationsByType(type, parentId);
    }

    const searchTerm = query.toLowerCase().trim();
    const results: LocationSearchResult[] = [];

    switch (type) {
      case 'state':
        Object.keys(locationData.India).forEach(stateName => {
          if (stateName.toLowerCase().includes(searchTerm)) {
            results.push({
              id: this.generateId(stateName),
              name: stateName,
              type: 'state',
              fullPath: `India > ${stateName}`,
              countryCode: 'IN'
            });
          }
        });
        break;

      case 'district':
        if (parentId) {
          const stateName = this.getStateNameById(parentId);
          if (stateName && locationData.India[stateName]) {
            Object.keys(locationData.India[stateName].districts).forEach(districtName => {
              if (districtName.toLowerCase().includes(searchTerm)) {
                results.push({
                  id: this.generateId(districtName),
                  name: districtName,
                  type: 'district',
                  fullPath: `India > ${stateName} > ${districtName}`,
                  countryCode: 'IN',
                  stateCode: parentId
                });
              }
            });
          }
        }
        break;

      case 'city':
        if (parentId) {
          const districtInfo = this.getDistrictInfo(parentId);
          if (districtInfo) {
            const { stateName, districtName } = districtInfo;
            const cities = locationData.India[stateName].districts[districtName].cities || [];
            
            cities.forEach(cityName => {
              if (cityName.toLowerCase().includes(searchTerm)) {
                results.push({
                  id: this.generateId(cityName),
                  name: cityName,
                  type: 'city',
                  fullPath: `India > ${stateName} > ${districtName} > ${cityName}`,
                  countryCode: 'IN',
                  stateCode: this.generateId(stateName),
                  districtId: parentId
                });
              }
            });
          }
        }
        break;
    }

    return results
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === searchTerm;
        const bExact = b.name.toLowerCase() === searchTerm;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, 20);
  }

  // Get all locations by type (for dropdowns when no query)
  private getAllLocationsByType(type: 'state' | 'district' | 'city', parentId?: string): LocationSearchResult[] {
    const results: LocationSearchResult[] = [];

    switch (type) {
      case 'state':
        Object.keys(locationData.India).forEach(stateName => {
          results.push({
            id: this.generateId(stateName),
            name: stateName,
            type: 'state',
            fullPath: `India > ${stateName}`,
            countryCode: 'IN'
          });
        });
        break;

      case 'district':
        if (parentId) {
          const stateName = this.getStateNameById(parentId);
          if (stateName && locationData.India[stateName]) {
            Object.keys(locationData.India[stateName].districts).forEach(districtName => {
              results.push({
                id: this.generateId(districtName),
                name: districtName,
                type: 'district',
                fullPath: `India > ${stateName} > ${districtName}`,
                countryCode: 'IN',
                stateCode: parentId
              });
            });
          }
        }
        break;

      case 'city':
        if (parentId) {
          const districtInfo = this.getDistrictInfo(parentId);
          if (districtInfo) {
            const { stateName, districtName } = districtInfo;
            const cities = locationData.India[stateName].districts[districtName].cities || [];
            
            cities.forEach(cityName => {
              results.push({
                id: this.generateId(cityName),
                name: cityName,
                type: 'city',
                fullPath: `India > ${stateName} > ${districtName} > ${cityName}`,
                countryCode: 'IN',
                stateCode: this.generateId(stateName),
                districtId: parentId
              });
            });
          }
        }
        break;
    }

    return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100);
  }

  // Utility methods
  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private getStateNameById(stateId: string): string | null {
    for (const stateName of Object.keys(locationData.India)) {
      if (this.generateId(stateName) === stateId) {
        return stateName;
      }
    }
    return null;
  }

  private getDistrictInfo(districtId: string): { stateName: string; districtName: string } | null {
    for (const [stateName, stateData] of Object.entries(locationData.India)) {
      for (const districtName of Object.keys(stateData.districts)) {
        if (this.generateId(districtName) === districtId) {
          return { stateName, districtName };
        }
      }
    }
    return null;
  }

  // Get location by ID methods
  getStateById(stateId: string): State | null {
    const stateName = this.getStateNameById(stateId);
    if (!stateName) return null;

    return {
      id: stateId,
      name: stateName,
      countryCode: 'IN'
    };
  }

  getDistrictById(districtId: string): District | null {
    const districtInfo = this.getDistrictInfo(districtId);
    if (!districtInfo) return null;

    return {
      id: districtId,
      name: districtInfo.districtName,
      stateCode: this.generateId(districtInfo.stateName),
      countryCode: 'IN'
    };
  }

  getCityById(cityId: string): City | null {
    // Find city in the data
    for (const [stateName, stateData] of Object.entries(locationData.India)) {
      for (const [districtName, districtData] of Object.entries(stateData.districts)) {
        if (districtData.cities) {
          for (const cityName of districtData.cities) {
            if (this.generateId(cityName) === cityId) {
              return {
                id: cityId,
                name: cityName,
                districtId: this.generateId(districtName),
                stateCode: this.generateId(stateName),
                countryCode: 'IN'
              };
            }
          }
        }
      }
    }
    return null;
  }

  // Validation methods
  isValidState(stateId: string): boolean {
    return this.getStateById(stateId) !== null;
  }

  isValidDistrict(districtId: string, stateId?: string): boolean {
    const district = this.getDistrictById(districtId);
    if (!district) return false;
    
    if (stateId) {
      return district.stateCode === stateId;
    }
    
    return true;
  }

  isValidCity(cityId: string, districtId?: string): boolean {
    const city = this.getCityById(cityId);
    if (!city) return false;
    
    if (districtId) {
      return city.districtId === districtId;
    }
    
    return true;
  }

  // Get location hierarchy
  getLocationHierarchy(cityId: string): {
    country: Country;
    state: State | null;
    district: District | null;
    city: City | null;
  } {
    const city = this.getCityById(cityId);
    const district = city ? this.getDistrictById(city.districtId) : null;
    const state = district ? this.getStateById(district.stateCode) : null;
    const country = this.getCountries()[0]; // India

    return {
      country,
      state,
      district,
      city
    };
  }

  // Get formatted address
  getFormattedAddress(locationData: {
    cityId?: string;
    districtId?: string;
    stateId?: string;
    countryCode?: string;
  }): string {
    const parts: string[] = [];

    if (locationData.cityId) {
      const city = this.getCityById(locationData.cityId);
      if (city) parts.push(city.name);
    }

    if (locationData.districtId) {
      const district = this.getDistrictById(locationData.districtId);
      if (district) parts.push(district.name);
    }

    if (locationData.stateId) {
      const state = this.getStateById(locationData.stateId);
      if (state) parts.push(state.name);
    }

    if (locationData.countryCode === 'IN') {
      parts.push('India');
    }

    return parts.join(', ');
  }

  // Get statistics
  getStatistics(): {
    totalStates: number;
    totalDistricts: number;
    totalCities: number;
  } {
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

    return {
      totalStates: Object.keys(locationData.India).length,
      totalDistricts,
      totalCities
    };
  }
}

// Export singleton instance
export const localLocationService = new LocalLocationService();
