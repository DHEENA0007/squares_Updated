import { authService } from './authService';
import { toast } from "@/hooks/use-toast";
import { DEFAULT_PROPERTY_IMAGE } from '@/utils/imageUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface Property {
  _id: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'villa' | 'plot' | 'land' | 'commercial' | 'office' | 'pg';
  status: 'available' | 'sold' | 'rented' | 'leased' | 'pending' | 'active' | 'rejected';
  listingType: 'sale' | 'rent' | 'lease';
  price: number;
  area: {
    builtUp?: number;
    carpet?: number;
    plot?: number;
    unit: 'sqft' | 'sqm' | 'acre';
  };
  bedrooms: number;
  bathrooms: number;
  address: {
    street: string;
    district?: string;
    city: string;
    taluk?: string;
    locationName?: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  amenities: string[];
  images: Array<{
    url: string;
    caption?: string;
    isPrimary: boolean;
  }>;
  virtualTour?: string;
  owner: {
    _id: string;
    email: string;
    role?: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  agent?: {
    _id: string;
    email: string;
    role?: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  vendor?: {
    _id: string;
    name?: string;
  };
  assignedTo?: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  assignedAt?: string;
  assignedBy?: string;
  assignmentNotes?: string;
  views: number;
  featured: boolean;
  verified: boolean;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  ownerType?: 'admin' | 'client';
  clientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  listingType?: 'sale' | 'rent' | 'lease';
  search?: string;
}

export interface PropertyResponse {
  success: boolean;
  data: {
    properties: Property[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProperties: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SinglePropertyResponse {
  success: boolean;
  data: {
    property: Property;
  };
}

class PropertyService {
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

    // Add auth token if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        
        // Better error message for validation errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          throw new Error(`Validation failed: ${errorData.errors.join(', ')}`);
        }
        
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async getProperties(filters: PropertyFilters = {}): Promise<PropertyResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/properties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<PropertyResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch properties";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getProperty(id: string): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/properties/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getAdminProperty(id: string): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/admin/properties/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createProperty(propertyData: Partial<Property>): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>("/properties", {
        method: "POST",
        body: JSON.stringify(propertyData),
      });

      toast({
        title: "Success",
        description: "Property created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createAdminProperty(propertyData: Partial<Property>): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>("/admin/properties", {
        method: "POST",
        body: JSON.stringify(propertyData),
      });

      toast({
        title: "Success",
        description: "Property created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateProperty(id: string, propertyData: Partial<Property>): Promise<SinglePropertyResponse> {
    try {
      // Check user role to determine which endpoint to use
      const userStr = localStorage.getItem("user");
      let endpoint = `/properties/${id}`;
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Use vendor-specific endpoint for agents/vendors
          if (user.role === 'agent') {
            endpoint = `/vendors/properties/${id}`;
          }
        } catch (e) {
          // If parsing fails, use default endpoint
          console.warn("Failed to parse user data, using default endpoint");
        }
      }

      const response = await this.makeRequest<SinglePropertyResponse>(endpoint, {
        method: "PUT",
        body: JSON.stringify(propertyData),
      });

      toast({
        title: "Success",
        description: "Property updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    try {
      await this.makeRequest(`/properties/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Property deleted successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper method to format price
  formatPrice(price: number, listingType: 'sale' | 'rent' | 'lease'): string {
    if (listingType === 'rent') {
      return `₹${price.toLocaleString('en-IN')}/month`;
    } else if (listingType === 'lease') {
      return `₹${price.toLocaleString('en-IN')}/year`;
    } else {
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(1)} Lac`;
      } else {
        return `₹${price.toLocaleString('en-IN')}`;
      }
    }
  }

  // Helper method to get primary image
  getPrimaryImage(property: Property): string {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || DEFAULT_PROPERTY_IMAGE;
  }

  // Helper method to format area
  formatArea(area: Property['area']): string {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'Area not specified';
  }

  // Vendor-specific methods
  async getVendorProperties(filters: PropertyFilters = {}): Promise<PropertyResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/vendors/properties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<PropertyResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vendor properties";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getVendorPropertyStats(): Promise<{
    totalProperties: number;
    totalViews: number;
    totalLeads: number;
    averageRating: number;
    activeProperties: number;
    soldProperties: number;
    pendingProperties: number;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
      }>("/vendors/statistics");

      if (response.success && response.data) {
        return {
          totalProperties: response.data.totalProperties || 0,
          totalViews: response.data.totalViews || 0,
          totalLeads: response.data.totalLeads || 0,
          averageRating: response.data.rating || 0,
          activeProperties: response.data.activeProperties || 0,
          soldProperties: response.data.soldProperties || 0,
          pendingProperties: response.data.pendingProperties || 0
        };
      }

      // Return default stats if endpoint doesn't return property stats
      return {
        totalProperties: 0,
        totalViews: 0,
        totalLeads: 0,
        averageRating: 0,
        activeProperties: 0,
        soldProperties: 0,
        pendingProperties: 0
      };
    } catch (error) {
      console.error("Failed to fetch vendor property stats:", error);
      // Return default stats on error
      return {
        totalProperties: 0,
        totalViews: 0,
        totalLeads: 0,
        averageRating: 0,
        activeProperties: 0,
        soldProperties: 0,
        pendingProperties: 0
      };
    }
  }

  async togglePropertyStatus(propertyId: string, status: string): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/properties/${propertyId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      toast({
        title: "Success",
        description: "Property status updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update property status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async togglePropertyFeatured(propertyId: string, featured: boolean): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/properties/${propertyId}/featured`, {
        method: "PATCH",
        body: JSON.stringify({ featured }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Property ${featured ? 'featured' : 'unfeatured'} successfully!`,
        });
      } else {
        throw new Error("Failed to update property featured status");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update property featured status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async assignPropertyToCustomer(
    propertyId: string, 
    customerId: string, 
    status: string,
    notes?: string
  ): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(
        `/properties/${propertyId}/assign-customer`, 
        {
          method: "POST",
          body: JSON.stringify({ 
            customerId, 
            status,
            notes 
          }),
        }
      );

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to assign property to customer";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "available": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "sold": return "bg-blue-500";
      case "rented": return "bg-purple-500";
      case "inactive": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  }

  getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export const propertyService = new PropertyService();
export default propertyService;