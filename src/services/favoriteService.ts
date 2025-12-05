import authService from './authService';
import { toast } from '@/hooks/use-toast';

export interface Favorite {
  _id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated property data
  property?: {
    _id: string;
    title: string;
    description: string;
    price: number;
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
    city?: string; // Legacy field support
    state?: string; // Legacy field support
    area: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    listingType: string;
    status: 'available' | 'sold' | 'rented' | 'pending' | 'active' | 'inactive';
    amenities: string[];
    images: Array<{
      url: string;
      caption?: string;
      isPrimary: boolean;
    }> | string[];
    isAvailable?: boolean; // Legacy field support
    owner: {
      _id: string;
      name?: string;
      email: string;
      phone?: string;
      profile?: {
        firstName: string;
        lastName: string;
        phone: string;
      };
    };
  };
}

export interface FavoriteFilters {
  page?: number;
  limit?: number;
  search?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  state?: string;
}

export interface FavoriteResponse {
  success: boolean;
  data: {
    favorites: Favorite[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalFavorites: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SingleFavoriteResponse {
  success: boolean;
  data: {
    favorite: Favorite;
  };
}

export interface FavoriteStats {
  totalFavorites: number;
  availableProperties: number;
  avgPrice: number;
  priceDrops: number;
}

export interface FavoriteStatsResponse {
  success: boolean;
  data: FavoriteStats;
}

class FavoriteService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = authService.getToken();
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
        throw new Error(errorData.message || 'An error occurred');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getFavorites(filters: FavoriteFilters = {}): Promise<FavoriteResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/favorites${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<FavoriteResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch favorites";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async addToFavorites(propertyId: string): Promise<SingleFavoriteResponse> {
    try {
      const response = await this.makeRequest<SingleFavoriteResponse>(`/favorites/${propertyId}`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Property added to favorites!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add to favorites";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async removeFromFavorites(propertyId: string): Promise<void> {
    try {
      await this.makeRequest(`/favorites/${propertyId}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Property removed from favorites!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove from favorites";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async isFavorite(propertyId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { isFavorite: boolean } }>(`/favorites/check/${propertyId}`);
      return response.data.isFavorite;
    } catch (error) {
      console.error("Failed to check favorite status:", error);
      return false;
    }
  }

  async getFavoriteStats(): Promise<FavoriteStatsResponse> {
    try {
      const response = await this.makeRequest<FavoriteStatsResponse>("/favorites/stats");
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch favorite statistics";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper methods
  formatPrice(price: number): string {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(0)} Lac`;
    }
    return `₹${price.toLocaleString()}`;
  }

  formatPricePerSqFt(price: number, area: number): string {
    const pricePerSqFt = Math.round(price / area);
    return this.formatPrice(pricePerSqFt);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  getPropertyStatusBadge(property: any): { variant: string; label: string } {
    const status = property?.status || 'available';
    
    switch (status.toLowerCase()) {
      case 'sold':
        return { variant: "destructive", label: "Sold" };
      case 'rented':
        return { variant: "secondary", label: "Rented" };
      case 'pending':
        return { variant: "outline", label: "Under Review" };
      case 'rejected':
        return { variant: "destructive", label: "Rejected" };
      case 'active':
      case 'available':
        return { variant: "default", label: "Available" };
      default:
        return { variant: "outline", label: status.charAt(0).toUpperCase() + status.slice(1) };
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }
}

export const favoriteService = new FavoriteService();
export default favoriteService;