/**
 * Location Service using loca.json
 * Provides autocomplete for pincodes based on state, district, and city
 */

interface LocationRecord {
  state: string;
  district: string;
  city: string;
  pincode: string;
}

interface LocationData {
  records: LocationRecord[];
}

interface PincodeSuggestion {
  pincode: string;
  city: string;
  district: string;
  state: string;
}

class LocaService {
  private locationData: LocationRecord[] = [];
  private initialized: boolean = false;
  private loading: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the service by loading loca.json
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.loading && this.initPromise) {
      return this.initPromise;
    }

    this.loading = true;
    this.initPromise = this.loadData();
    
    try {
      await this.initPromise;
    } finally {
      this.loading = false;
    }
  }

  private async loadData(): Promise<void> {
    try {
      console.log('Loading loca.json...');
      const response = await fetch('/loca.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load loca.json: ${response.statusText}`);
      }

      const data: LocationData = await response.json();
      this.locationData = data.records || [];
      this.initialized = true;

      console.log(`✅ Loaded ${this.locationData.length.toLocaleString()} location records`);
    } catch (error) {
      console.error('Error loading loca.json:', error);
      this.locationData = [];
      throw error;
    }
  }

  /**
   * Get unique states
   */
  getStates(): string[] {
    const states = new Set(this.locationData.map(record => record.state));
    return Array.from(states).sort();
  }

  /**
   * Get districts for a specific state
   */
  getDistricts(state: string): string[] {
    if (!state) return [];
    
    const normalizedState = state.toUpperCase();
    const districts = new Set(
      this.locationData
        .filter(record => record.state.toUpperCase() === normalizedState)
        .map(record => record.district)
    );
    
    return Array.from(districts).sort();
  }

  /**
   * Get cities for a specific state and district
   */
  getCities(state: string, district: string): string[] {
    if (!state || !district) return [];
    
    const normalizedState = state.toUpperCase();
    const normalizedDistrict = district.toUpperCase();
    
    const cities = new Set(
      this.locationData
        .filter(record => 
          record.state.toUpperCase() === normalizedState &&
          record.district.toUpperCase() === normalizedDistrict
        )
        .map(record => record.city)
    );
    
    return Array.from(cities).sort();
  }

  /**
   * Get pincode suggestions based on state, district, and city
   */
  getPincodeSuggestions(
    state?: string,
    district?: string,
    city?: string,
    query?: string
  ): PincodeSuggestion[] {
    let filtered = this.locationData;

    // Filter by state
    if (state) {
      const normalizedState = state.toUpperCase();
      filtered = filtered.filter(record => 
        record.state.toUpperCase() === normalizedState
      );
    }

    // Filter by district
    if (district) {
      const normalizedDistrict = district.toUpperCase();
      filtered = filtered.filter(record => 
        record.district.toUpperCase() === normalizedDistrict
      );
    }

    // Filter by city
    if (city) {
      const normalizedCity = city.toUpperCase();
      filtered = filtered.filter(record => 
        record.city.toUpperCase() === normalizedCity
      );
    }

    // Filter by pincode query
    if (query && query.trim()) {
      const normalizedQuery = query.trim();
      filtered = filtered.filter(record => 
        record.pincode.startsWith(normalizedQuery)
      );
    }

    // Remove duplicates and limit results
    const uniquePincodes = new Map<string, PincodeSuggestion>();
    
    filtered.forEach(record => {
      if (!uniquePincodes.has(record.pincode)) {
        uniquePincodes.set(record.pincode, {
          pincode: record.pincode,
          city: record.city,
          district: record.district,
          state: record.state
        });
      }
    });

    return Array.from(uniquePincodes.values())
      .sort((a, b) => a.pincode.localeCompare(b.pincode))
      .slice(0, 50); // Limit to 50 suggestions
  }

  /**
   * Get location details by pincode
   */
  getLocationByPincode(pincode: string): PincodeSuggestion[] {
    if (!pincode || !pincode.trim()) return [];

    const normalizedPincode = pincode.trim();
    const matches = this.locationData.filter(record => 
      record.pincode === normalizedPincode
    );

    return matches.map(record => ({
      pincode: record.pincode,
      city: record.city,
      district: record.district,
      state: record.state
    }));
  }

  /**
   * Validate if a pincode exists
   */
  validatePincode(pincode: string): boolean {
    if (!pincode || !pincode.trim()) return false;
    
    const normalizedPincode = pincode.trim();
    return this.locationData.some(record => record.pincode === normalizedPincode);
  }

  /**
   * Search locations by text query
   */
  searchLocations(query: string, limit: number = 20): PincodeSuggestion[] {
    if (!query || !query.trim()) return [];

    const normalizedQuery = query.trim().toLowerCase();
    
    const matches = this.locationData.filter(record => 
      record.city.toLowerCase().includes(normalizedQuery) ||
      record.district.toLowerCase().includes(normalizedQuery) ||
      record.state.toLowerCase().includes(normalizedQuery) ||
      record.pincode.includes(normalizedQuery)
    );

    // Remove duplicates
    const uniquePincodes = new Map<string, PincodeSuggestion>();
    
    matches.forEach(record => {
      const key = `${record.pincode}-${record.city}`;
      if (!uniquePincodes.has(key)) {
        uniquePincodes.set(key, {
          pincode: record.pincode,
          city: record.city,
          district: record.district,
          state: record.state
        });
      }
    });

    return Array.from(uniquePincodes.values()).slice(0, limit);
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get total record count
   */
  getRecordCount(): number {
    return this.locationData.length;
  }
}

// Export singleton instance
export const locaService = new LocaService();

// Export types
export type { LocationRecord, PincodeSuggestion };
