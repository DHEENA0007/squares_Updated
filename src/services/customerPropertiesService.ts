import { authService } from './authService';

export interface CustomerProperty {
  _id: string;
  title: string;
  description: string;
  type: 'apartment' | 'villa' | 'house' | 'plot' | 'land' | 'commercial' | 'office' | 'pg';
  status: 'active' | 'inactive' | 'rented' | 'sold' | 'pending' | 'draft';
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
    locality: string;
    city: string;
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
  views: number;
  inquiries: number;
  favorites: number;
  featured: boolean;
  verified: boolean;
  availability: string;
  postedDate: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  analytics: {
    weeklyViews: number;
    weeklyInquiries: number;
    avgResponseTime: string;
    lastActivityDate: string;
    conversionRate: number;
    totalLeads: number;
  };
  rentedTo?: {
    name: string;
    phone: string;
    email: string;
    rentStart: string;
    rentEnd: string;
    deposit: number;
  };
}

export interface CustomerPropertyStats {
  totalProperties: number;
  activeProperties: number;
  rentedProperties: number;
  soldProperties: number;
  draftProperties: number;
  pendingProperties: number;
  totalViews: number;
  totalInquiries: number;
  totalFavorites: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageViews: number;
  averageInquiries: number;
  conversionRate: number;
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  listingType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerPropertiesResponse {
  success: boolean;
  data: {
    properties: CustomerProperty[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProperties: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    stats: CustomerPropertyStats;
  };
}

export interface SinglePropertyResponse {
  success: boolean;
  data: {
    property: CustomerProperty;
  };
}

export interface PropertyStatsResponse {
  success: boolean;
  data: CustomerPropertyStats;
}

class CustomerPropertiesService {
  private baseUrl = import.meta.env.VITE_API_URL || 'https://api.buildhomemartsquares.com/api';

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

  async getCustomerProperties(filters: PropertyFilters = {}): Promise<CustomerPropertiesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/customer/properties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<CustomerPropertiesResponse>(endpoint);
      return response;
    } catch (error) {
      console.error('Failed to fetch customer properties:', error);
      
      // Return mock data as fallback
      const mockData: CustomerPropertiesResponse = {
        success: true,
        data: {
          properties: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalProperties: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          stats: {
            totalProperties: 0,
            activeProperties: 0,
            rentedProperties: 0,
            soldProperties: 0,
            draftProperties: 0,
            pendingProperties: 0,
            totalViews: 0,
            totalInquiries: 0,
            totalFavorites: 0,
            totalRevenue: 0,
            monthlyRevenue: 0,
            averageViews: 0,
            averageInquiries: 0,
            conversionRate: 0,
          },
        },
      };
      
      return mockData;
    }
  }

  async getCustomerPropertyStats(): Promise<PropertyStatsResponse> {
    try {
      const response = await this.makeRequest<PropertyStatsResponse>('/customer/properties/stats');
      return response;
    } catch (error) {
      console.error('Failed to fetch customer property stats:', error);
      
      // Return default stats as fallback
      return {
        success: true,
        data: {
          totalProperties: 0,
          activeProperties: 0,
          rentedProperties: 0,
          soldProperties: 0,
          draftProperties: 0,
          pendingProperties: 0,
          totalViews: 0,
          totalInquiries: 0,
          totalFavorites: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          averageViews: 0,
          averageInquiries: 0,
          conversionRate: 0,
        },
      };
    }
  }

  async getProperty(id: string): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/customer/properties/${id}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch property:', error);
      throw error;
    }
  }

  async createProperty(propertyData: Partial<CustomerProperty>): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>('/customer/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData),
      });
      return response;
    } catch (error) {
      console.error('Failed to create property:', error);
      throw error;
    }
  }

  async updateProperty(id: string, propertyData: Partial<CustomerProperty>): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/customer/properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify(propertyData),
      });
      return response;
    } catch (error) {
      console.error('Failed to update property:', error);
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    try {
      await this.makeRequest(`/customer/properties/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete property:', error);
      throw error;
    }
  }

  async togglePropertyStatus(id: string, status: CustomerProperty['status']): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/customer/properties/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response;
    } catch (error) {
      console.error('Failed to toggle property status:', error);
      throw error;
    }
  }

  async togglePropertyFeatured(id: string, featured: boolean): Promise<SinglePropertyResponse> {
    try {
      const response = await this.makeRequest<SinglePropertyResponse>(`/customer/properties/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured }),
      });
      return response;
    } catch (error: any) {
      const errorData = error.response?.data || error;
      
      // Show specific message for subscription-related errors
      if (errorData.upgradeRequired || errorData.limitReached) {
        toast({
          title: errorData.limitReached ? "Featured Limit Reached" : "Upgrade Required",
          description: `${errorData.message || 'Failed to toggle property featured status'} Visit the Subscription Plans page to upgrade.`,
          variant: "destructive",
        });
      }
      
      console.error('Failed to toggle property featured status:', error);
      throw error;
    }
  }

  async getPropertyAnalytics(id: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    success: boolean;
    data: {
      views: { date: string; count: number }[];
      inquiries: { date: string; count: number }[];
      favorites: { date: string; count: number }[];
      conversionRate: number;
      avgResponseTime: string;
      topReferrers: { source: string; count: number }[];
      engagement: {
        totalClicks: number;
        phoneClicks: number;
        emailClicks: number;
        messageClicks: number;
      };
    };
  }> {
    try {
      const response = await this.makeRequest<any>(`/customer/properties/${id}/analytics?period=${period}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch property analytics:', error);
      
      // Return mock analytics as fallback
      return {
        success: true,
        data: {
          views: [],
          inquiries: [],
          favorites: [],
          conversionRate: 0,
          avgResponseTime: 'N/A',
          topReferrers: [],
          engagement: {
            totalClicks: 0,
            phoneClicks: 0,
            emailClicks: 0,
            messageClicks: 0,
          },
        },
      };
    }
  }

  // Helper methods
  formatPrice(price: number, listingType: 'sale' | 'rent' | 'lease'): string {
    if (listingType === 'rent') return `₹${price.toLocaleString('en-IN')}/month`;
    if (listingType === 'lease') return `₹${price.toLocaleString('en-IN')}/year`;
    
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString('en-IN')}`;
  }

  formatArea(area: CustomerProperty['area']): string {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'Area not specified';
  }

  getStatusColor(status: CustomerProperty['status']): string {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'rented': return 'bg-blue-500';
      case 'sold': return 'bg-purple-500';
      case 'pending': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  getStatusText(status: CustomerProperty['status']): string {
    switch (status) {
      case 'active': return 'Active';
      case 'rented': return 'Rented';
      case 'sold': return 'Sold';
      case 'pending': return 'Under Review';
      case 'draft': return 'Draft';
      case 'inactive': return 'Inactive';
      default: return status;
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  getPrimaryImage(property: CustomerProperty): string {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || '/placeholder-property.jpg';
  }

  getDaysOnMarket(postedDate: string): number {
    const posted = new Date(postedDate);
    const now = new Date();
    const diffInMs = now.getTime() - posted.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }

  calculateMonthlyRevenue(properties: CustomerProperty[]): number {
    return properties
      .filter(p => p.status === 'rented' && p.listingType === 'rent')
      .reduce((total, p) => total + p.price, 0);
  }

  calculateTotalRevenue(properties: CustomerProperty[]): number {
    const soldProperties = properties.filter(p => p.status === 'sold');
    const rentedProperties = properties.filter(p => p.status === 'rented');
    
    const soldRevenue = soldProperties.reduce((total, p) => total + p.price, 0);
    const monthlyRentRevenue = this.calculateMonthlyRevenue(properties);
    
    // Estimate total rent revenue (assuming average 12 months)
    const estimatedRentRevenue = monthlyRentRevenue * 12;
    
    return soldRevenue + estimatedRentRevenue;
  }
}

export const customerPropertiesService = new CustomerPropertiesService();
export default customerPropertiesService;

function toast(arg0: { title: string; description: string; variant: string; }) {
  throw new Error('Function not implemented.');
}
