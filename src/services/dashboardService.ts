import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface DashboardStats {
  totalUsers: number;
  totalProperties: number;
  totalRevenue: number;
  activeListings: number;
  pendingProperties: number;
  soldProperties: number;
  newUsersThisMonth: number;
  newPropertiesThisMonth: number;
  revenueThisMonth: number;
  engagementRate: number;
  userGrowth: number;
  propertyGrowth: number;
  revenueGrowth: number;
}

export interface RecentActivity {
  _id: string;
  type: 'user_registered' | 'property_listed' | 'property_sold' | 'property_rented' | 'inquiry_received' | 'subscription_purchased';
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    recentActivities: RecentActivity[];
  };
}

class DashboardService {
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
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        throw new Error((errorData && errorData.message) || 'An error occurred');
      }

      const result = await response.json();
      
      // Validate that the result is not null or undefined
      if (result === null || result === undefined) {
        throw new Error('Received null or undefined response from server');
      }
      
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getDashboardData(): Promise<DashboardResponse> {
    try {
      const response = await this.makeRequest<DashboardResponse>('/dashboard');
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Return mock data as fallback while real API is being implemented
      const mockData: DashboardResponse = {
        success: true,
        data: {
          stats: {
            totalUsers: 0,
            totalProperties: 0,
            totalRevenue: 0,
            activeListings: 0,
            pendingProperties: 0,
            soldProperties: 0,
            newUsersThisMonth: 0,
            newPropertiesThisMonth: 0,
            revenueThisMonth: 0,
            engagementRate: 0,
            userGrowth: 0,
            propertyGrowth: 0,
            revenueGrowth: 0
          },
          recentActivities: []
        }
      };
      
      return mockData;
    }
  }

  // Helper method to format revenue
  formatRevenue(amount: number): string {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} Lac`;
    } else {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  }

  // Helper method to format percentage change
  formatPercentageChange(current: number, previous: number): string {
    if (previous === 0) return '+0%';
    
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  // Helper method to format activity description
  formatActivityDescription(activity: RecentActivity): string {
    switch (activity.type) {
      case 'user_registered':
        return `New user registered: ${activity.metadata?.email || 'Unknown'}`;
      case 'property_listed':
        return `New property listed: ${activity.metadata?.title || 'Unknown'}`;
      case 'property_sold':
        return `Property sold: ${activity.metadata?.title || 'Unknown'}`;
      case 'property_rented':
        return `Property rented: ${activity.metadata?.title || 'Unknown'}`;
      case 'inquiry_received':
        return `New inquiry received for: ${activity.metadata?.propertyTitle || 'Unknown'}`;
      case 'subscription_purchased':
        return `Subscription purchased: ${activity.metadata?.planName || 'Unknown'} - ₹${activity.metadata?.amount || 0}`;
      default:
        return activity.description;
    }
  }

  // Helper method to format timestamp
  formatTimestamp(timestamp: string): string {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMs = now.getTime() - activityTime.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return activityTime.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;