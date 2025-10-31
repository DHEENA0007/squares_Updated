import { toast } from '@/hooks/use-toast';

interface PincodeRecord {
  circlename: string;
  regionname: string;
  divisionname: string;
  officename: string;
  pincode: string;
  officetype: string;
  delivery: string;
  district: string;
  statename: string;
  latitude?: string;
  longitude?: string;
}

interface PincodeData {
  index_name: string;
  title: string;
  desc: string;
  records: PincodeRecord[];
}

interface PincodeSuggestion {
  id: string;
  name: string;
  pincode: string;
  district: string;
  state: string;
  officename: string;
  displayName: string;
  relevance: number;
}

class PincodeService {
  private pincodeData: PincodeRecord[] | null = null;
  private loading = false;
  private initialized = false;

  // Load pincode data from JSON file
  async loadPincodeData(): Promise<void> {
    if (this.initialized || this.loading) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch('/5c2f62fe-5afa-4119-a499-fec9d604d5bd.json');
      if (!response.ok) {
        throw new Error('Failed to load pincode data');
      }

      const data: PincodeData = await response.json();
      this.pincodeData = data.records || [];
      this.initialized = true;

      console.log(`Loaded ${this.pincodeData.length} pincode records`);
    } catch (error) {
      console.error('Error loading pincode data:', error);
      this.pincodeData = [];
      toast({
        title: "Warning",
        description: "Pincode autocomplete data could not be loaded. You can still enter pincodes manually.",
        variant: "destructive",
      });
    } finally {
      this.loading = false;
    }
  }

  // Get pincode suggestions based on query
  async getPincodeSuggestions(
    query: string, 
    state?: string, 
    district?: string, 
    limit: number = 10
  ): Promise<{ success: boolean; suggestions: PincodeSuggestion[] }> {
    try {
      // Ensure data is loaded
      if (!this.initialized) {
        await this.loadPincodeData();
      }

      if (!this.pincodeData || this.pincodeData.length === 0) {
        return { success: false, suggestions: [] };
      }

      const searchQuery = query.toLowerCase().trim();
      if (searchQuery.length < 1) {
        return { success: false, suggestions: [] };
      }

      let filteredRecords = this.pincodeData;

      // Filter by state if provided
      if (state) {
        const stateNormalized = state.toLowerCase();
        filteredRecords = filteredRecords.filter(record => 
          record.statename.toLowerCase().includes(stateNormalized)
        );
      }

      // Filter by district if provided
      if (district) {
        const districtNormalized = district.toLowerCase();
        filteredRecords = filteredRecords.filter(record => 
          record.district.toLowerCase().includes(districtNormalized)
        );
      }

      // Search in multiple fields with relevance scoring
      const suggestions: PincodeSuggestion[] = [];
      const seenPincodes = new Set<string>();

      for (const record of filteredRecords) {
        if (suggestions.length >= limit * 3) break; // Get more records for better filtering

        let relevance = 0;
        let matches = false;

        // Check if pincode starts with query (highest relevance)
        if (record.pincode.startsWith(searchQuery)) {
          relevance += 100;
          matches = true;
        }
        // Check if pincode contains query
        else if (record.pincode.includes(searchQuery)) {
          relevance += 80;
          matches = true;
        }
        // Check office name
        else if (record.officename.toLowerCase().includes(searchQuery)) {
          relevance += 60;
          matches = true;
        }
        // Check district
        else if (record.district.toLowerCase().includes(searchQuery)) {
          relevance += 40;
          matches = true;
        }
        // Check circle name
        else if (record.circlename.toLowerCase().includes(searchQuery)) {
          relevance += 20;
          matches = true;
        }

        if (matches && !seenPincodes.has(record.pincode)) {
          seenPincodes.add(record.pincode);
          
          suggestions.push({
            id: record.pincode,
            name: record.pincode,
            pincode: record.pincode,
            district: record.district,
            state: record.statename,
            officename: record.officename,
            displayName: `${record.pincode} - ${record.officename}, ${record.district}`,
            relevance
          });
        }
      }

      // Sort by relevance and limit results
      const sortedSuggestions = suggestions
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);

      return {
        success: true,
        suggestions: sortedSuggestions
      };

    } catch (error) {
      console.error('Error getting pincode suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  // Get location details by exact pincode
  async getLocationByPincode(pincode: string): Promise<{
    success: boolean;
    data?: {
      pincode: string;
      country: string;
      state: string;
      district: string;
      city: string;
      locality: string;
      area?: string;
      officename: string;
      officetype: string;
      latitude?: number;
      longitude?: number;
      formattedAddress: string;
    };
  }> {
    try {
      // Ensure data is loaded
      if (!this.initialized) {
        await this.loadPincodeData();
      }

      if (!this.pincodeData || this.pincodeData.length === 0) {
        return { success: false };
      }

      // Find exact pincode match
      const record = this.pincodeData.find(r => r.pincode === pincode);
      if (!record) {
        return { success: false };
      }

      const locationData = {
        pincode: record.pincode,
        country: 'India',
        state: record.statename,
        district: record.district,
        city: record.district, // Using district as city for consistency
        locality: record.officename,
        area: record.regionname,
        officename: record.officename,
        officetype: record.officetype,
        latitude: record.latitude ? parseFloat(record.latitude) : undefined,
        longitude: record.longitude ? parseFloat(record.longitude) : undefined,
        formattedAddress: `${record.officename}, ${record.district}, ${record.statename}, India - ${record.pincode}`
      };

      return {
        success: true,
        data: locationData
      };

    } catch (error) {
      console.error('Error getting location by pincode:', error);
      return { success: false };
    }
  }

  // Validate pincode format and existence
  async validatePincode(pincode: string): Promise<{
    success: boolean;
    valid: boolean;
    exists: boolean;
    message: string;
  }> {
    try {
      // Basic format validation
      if (!/^[1-9][0-9]{5}$/.test(pincode)) {
        return {
          success: true,
          valid: false,
          exists: false,
          message: 'Pincode must be 6 digits and cannot start with 0'
        };
      }

      // Check if pincode exists in our data
      const locationResult = await this.getLocationByPincode(pincode);
      
      return {
        success: true,
        valid: true,
        exists: locationResult.success,
        message: locationResult.success 
          ? `Valid pincode for ${locationResult.data?.district}, ${locationResult.data?.state}` 
          : 'Valid format but pincode not found in database'
      };

    } catch (error) {
      console.error('Error validating pincode:', error);
      return {
        success: false,
        valid: false,
        exists: false,
        message: 'Validation failed'
      };
    }
  }

  // Get all pincodes for a specific state
  async getPincodesByState(stateName: string, limit: number = 50): Promise<{
    success: boolean;
    pincodes: string[];
  }> {
    try {
      if (!this.initialized) {
        await this.loadPincodeData();
      }

      if (!this.pincodeData) {
        return { success: false, pincodes: [] };
      }

      const stateNormalized = stateName.toLowerCase();
      const pincodes = new Set<string>();

      for (const record of this.pincodeData) {
        if (pincodes.size >= limit) break;
        
        if (record.statename.toLowerCase().includes(stateNormalized)) {
          pincodes.add(record.pincode);
        }
      }

      return {
        success: true,
        pincodes: Array.from(pincodes).sort()
      };

    } catch (error) {
      console.error('Error getting pincodes by state:', error);
      return { success: false, pincodes: [] };
    }
  }

  // Get all pincodes for a specific district
  async getPincodesByDistrict(districtName: string, stateName?: string, limit: number = 30): Promise<{
    success: boolean;
    pincodes: string[];
  }> {
    try {
      if (!this.initialized) {
        await this.loadPincodeData();
      }

      if (!this.pincodeData) {
        return { success: false, pincodes: [] };
      }

      const districtNormalized = districtName.toLowerCase();
      const stateNormalized = stateName?.toLowerCase();
      const pincodes = new Set<string>();

      for (const record of this.pincodeData) {
        if (pincodes.size >= limit) break;
        
        const districtMatch = record.district.toLowerCase().includes(districtNormalized);
        const stateMatch = !stateNormalized || record.statename.toLowerCase().includes(stateNormalized);
        
        if (districtMatch && stateMatch) {
          pincodes.add(record.pincode);
        }
      }

      return {
        success: true,
        pincodes: Array.from(pincodes).sort()
      };

    } catch (error) {
      console.error('Error getting pincodes by district:', error);
      return { success: false, pincodes: [] };
    }
  }

  // Initialize service (call this early in app lifecycle)
  async initialize(): Promise<void> {
    await this.loadPincodeData();
  }

  // Check if service is ready
  isReady(): boolean {
    return this.initialized && !!this.pincodeData;
  }

  // Get statistics
  getStats(): {
    totalRecords: number;
    totalPincodes: number;
    totalStates: number;
    totalDistricts: number;
  } {
    if (!this.pincodeData) {
      return { totalRecords: 0, totalPincodes: 0, totalStates: 0, totalDistricts: 0 };
    }

    const uniquePincodes = new Set(this.pincodeData.map(r => r.pincode));
    const uniqueStates = new Set(this.pincodeData.map(r => r.statename));
    const uniqueDistricts = new Set(this.pincodeData.map(r => r.district));

    return {
      totalRecords: this.pincodeData.length,
      totalPincodes: uniquePincodes.size,
      totalStates: uniqueStates.size,
      totalDistricts: uniqueDistricts.size
    };
  }
}

export const pincodeService = new PincodeService();
export default pincodeService;
