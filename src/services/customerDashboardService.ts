import { authService } from './authService';

export interface CustomerStats {
  propertiesViewed: number;
  propertiesViewedChange: string;
  savedFavorites: number;
  savedFavoritesChange: string;
  activeInquiries: number;
  activeInquiriesChange: string;
  myProperties: number;
  myPropertiesChange: string;
}

export interface CustomerActivity {
  _id: string;
  type: 'favorite' | 'inquiry' | 'search' | 'property_posted' | 'property_updated';
  message: string;
  property?: string;
  time: string;
  icon: string;
  propertyId?: string;
  metadata?: any;
}

export interface RecommendedProperty {
  _id: string;
  title: string;
  location: string;
  price: string;
  rating: number;
  image?: string;
  propertyType: string;
  listingType: 'sale' | 'rent' | 'lease';
  bedrooms: number;
  bathrooms: number;
  area: number;
}

export interface CustomerDashboardData {
  stats: CustomerStats;
  recentActivities: CustomerActivity[];
  recommendedProperties: RecommendedProperty[];
  quickStats: {
    favoritesCount: number;
    messagesCount: number;
    propertiesCount: number;
    unreadMessages: number;
  };
}

export interface CustomerDashboardResponse {
  success: boolean;
  data: CustomerDashboardData;
}

class CustomerDashboardService {
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

  async getCustomerDashboardData(): Promise<CustomerDashboardResponse> {
    try {
      const response = await this.makeRequest<CustomerDashboardResponse>('/customer/dashboard');
      return response;
    } catch (error) {
      console.error('Failed to fetch customer dashboard data:', error);
      
      // Return mock data as fallback while real API is being implemented
      const mockData: CustomerDashboardData = {
        stats: {
          propertiesViewed: 0,
          propertiesViewedChange: '+0 this week',
          savedFavorites: 0,
          savedFavoritesChange: '+0 new',
          activeInquiries: 0,
          activeInquiriesChange: '0 pending response',
          myProperties: 0,
          myPropertiesChange: '0 active listing',
        },
        recentActivities: [],
        recommendedProperties: [],
        quickStats: {
          favoritesCount: 0,
          messagesCount: 0,
          propertiesCount: 0,
          unreadMessages: 0,
        },
      };

      return {
        success: true,
        data: mockData,
      };
    }
  }

  async getCustomerStats(): Promise<CustomerStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: CustomerStats;
      }>('/dashboard/customer/stats');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to fetch customer stats');
    } catch (error) {
      console.error('Failed to fetch customer stats:', error);
      
      // Return default stats as fallback
      return {
        propertiesViewed: 0,
        propertiesViewedChange: '+0 this week',
        savedFavorites: 0,
        savedFavoritesChange: '+0 new',
        activeInquiries: 0,
        activeInquiriesChange: '0 pending response',
        myProperties: 0,
        myPropertiesChange: '0 active listing',
      };
    }
  }

  async getRecentActivities(): Promise<CustomerActivity[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: CustomerActivity[];
      }>('/customer/activities');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to fetch recent activities');
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      return [];
    }
  }

  async getRecommendedProperties(limit: number = 6): Promise<RecommendedProperty[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: RecommendedProperty[];
      }>(`/customer/recommended-properties?limit=${limit}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to fetch recommended properties');
    } catch (error) {
      console.error('Failed to fetch recommended properties:', error);
      return [];
    }
  }

  async getQuickStats(): Promise<{
    favoritesCount: number;
    messagesCount: number;
    propertiesCount: number;
    unreadMessages: number;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          favoritesCount: number;
          messagesCount: number;
          propertiesCount: number;
          unreadMessages: number;
        };
      }>('/customer/quick-stats');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to fetch quick stats');
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
      return {
        favoritesCount: 0,
        messagesCount: 0,
        propertiesCount: 0,
        unreadMessages: 0,
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

  getActivityIcon(type: CustomerActivity['type']): string {
    const iconMap = {
      favorite: 'Heart',
      inquiry: 'MessageSquare',
      search: 'Search',
      property_posted: 'Home',
      property_updated: 'Edit',
    };
    return iconMap[type] || 'Activity';
  }

  getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diffInMs = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffInMs / (1000 * 60 * 60 * 24)));
  }

  // Track property view (to be called when user views a property)
  async trackPropertyView(propertyId: string): Promise<void> {
    try {
      await this.makeRequest('/dashboard/customer/track-view', {
        method: 'POST',
        body: JSON.stringify({ propertyId }),
      });
    } catch (error) {
      console.error('Failed to track property view:', error);
      // Don't show toast for this - it should be silent tracking
    }
  }

  // Track search activity (to be called when user performs a search)
  async trackSearchActivity(searchQuery: string, filters?: any): Promise<void> {
    try {
      await this.makeRequest('/dashboard/customer/track-search', {
        method: 'POST',
        body: JSON.stringify({ searchQuery, filters }),
      });
    } catch (error) {
      console.error('Failed to track search activity:', error);
      // Don't show toast for this - it should be silent tracking
    }
  }
}

export const customerDashboardService = new CustomerDashboardService();
export default customerDashboardService;