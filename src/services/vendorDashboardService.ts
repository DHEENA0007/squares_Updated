import { toast } from "@/hooks/use-toast";
import { reviewsService } from "./reviewsService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

export interface VendorStats {
  totalProperties: number;
  totalPropertiesChange: string;
  propertyViews: number;
  propertyViewsChange: string;
  dateRangeViews?: number;
  uniqueViewers?: number;
  unreadMessages: number;
  totalMessages: number;
  messagesChange: string;
  totalRevenue: number;
  revenueChange: string;
  conversionRate: number;
  conversionChange: string;
  averageRating?: number;
  ratingChange?: string;
  phoneCalls?: number;
  phoneCallsChange?: string;
}

export interface Property {
  _id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  listingType: 'sale' | 'rent' | 'lease';
  status: 'active' | 'pending' | 'sold' | 'rented' | 'inactive';
  views: number;
  leads: number;
  favorites: number;
  rating?: number;
  averageRating?: number;
  images: Array<string | { url?: string; caption?: string; isPrimary?: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyTitle: string;
  message: string;
  interestLevel: 'high' | 'medium' | 'low';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceData {
  date: string;
  views: number;
  uniqueViews?: number;
  interactions?: number;
  leads: number;
  conversions: number;
  revenue: number;
}

export interface VendorAnalytics {
  monthlyPerformance: PerformanceData[];
  leadsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  propertyPerformance: Array<{
    propertyId: string;
    title: string;
    views: number;
    leads: number;
    conversionRate: number;
  }>;
  topPerformingAreas: Array<{
    area: string;
    properties: number;
    avgViews: number;
    avgLeads: number;
  }>;
}

export interface VendorDashboardData {
  stats: VendorStats;
  recentProperties: Property[];
  recentLeads: Lead[];
  performanceData: PerformanceData[];
  analytics: VendorAnalytics;
  notifications: Array<{
    id: string;
    type: 'lead' | 'message' | 'property' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export interface VendorFilters {
  dateRange?: string;
  propertyType?: string;
  status?: string;
  leadStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class VendorDashboardService {
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

    // Add auth token
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
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("Vendor Dashboard API request failed:", error);
      throw error;
    }
  }

  async getDashboardData(filters: VendorFilters = {}): Promise<VendorDashboardData> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/vendors/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorDashboardData;
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      // Return empty data for real-time approach
      return this.getEmptyDashboardData();
    } catch (error) {
      console.error("Failed to fetch vendor dashboard data:", error);
      // Return empty data to show real state
      return this.getEmptyDashboardData();
    }
  }

  async getVendorStats(dateRange = '7d'): Promise<VendorStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorStats;
      }>(`/vendors/stats?dateRange=${dateRange}`);

      if (response.success && response.data) {
        // Ensure rating data is synced from reviews
        try {
          const reviewStats = await reviewsService.getReviewStats();
          response.data.averageRating = reviewStats.averageRating;
        } catch (reviewError) {
          console.log("Could not sync rating data:", reviewError);
        }
        return response.data;
      }

      throw new Error("Failed to fetch vendor stats");
    } catch (error) {
      console.error("Failed to fetch vendor stats:", error);
      
      // Get real rating data even for fallback stats
      let averageRating = 0;
      try {
        const reviewStats = await reviewsService.getReviewStats();
        averageRating = reviewStats.averageRating;
      } catch (reviewError) {
        console.log("Could not get rating for fallback stats:", reviewError);
      }
      
      // Return empty stats for real-time data approach
      return {
        totalProperties: 0,
        totalPropertiesChange: "+0",
        propertyViews: 0,
        propertyViewsChange: "+0%",
        unreadMessages: 0,
        totalMessages: 0,
        messagesChange: "0 unread",
        totalRevenue: 0,
        revenueChange: "+0%",
        conversionRate: 0,
        conversionChange: "+0%",
        averageRating,
        phoneCalls: 0,
        phoneCallsChange: "+0%"
      };
    }
  }

  async getRecentProperties(limit = 6): Promise<Property[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { properties: Property[] };
      }>(`/vendors/properties/recent?limit=${limit}`);

      if (response.success && response.data) {
        return response.data.properties;
      }

      throw new Error("Failed to fetch recent properties");
    } catch (error) {
      console.error("Failed to fetch recent properties:", error);
      return [];
    }
  }

  async getRecentLeads(limit = 10): Promise<Lead[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { leads: Lead[] };
      }>(`/vendors/leads/recent?limit=${limit}`);

      if (response.success && response.data) {
        return response.data.leads;
      }

      throw new Error("Failed to fetch recent leads");
    } catch (error) {
      console.error("Failed to fetch recent leads:", error);
      return [];
    }
  }

  async getPerformanceData(dateRange = '7d'): Promise<PerformanceData[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { performance: PerformanceData[] };
      }>(`/vendors/performance?dateRange=${dateRange}`);

      if (response.success && response.data) {
        return response.data.performance;
      }

      throw new Error("Failed to fetch performance data");
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
      // Return empty array for real-time data approach
      return [];
    }
  }

  async getVendorAnalytics(dateRange = '30d'): Promise<VendorAnalytics> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorAnalytics;
      }>(`/vendors/analytics?dateRange=${dateRange}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to fetch vendor analytics");
    } catch (error) {
      console.error("Failed to fetch vendor analytics:", error);
      // Return empty analytics for real-time data approach
      return {
        monthlyPerformance: [],
        leadsBySource: [],
        propertyPerformance: [],
        topPerformingAreas: []
      };
    }
  }

  async getNotifications(): Promise<Array<{
    id: string;
    type: 'lead' | 'message' | 'property' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { notifications: any[] };
      }>("/vendors/notifications");

      if (response.success && response.data) {
        return response.data.notifications;
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
      }>(`/vendors/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      return response.success;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  }

  async updateLeadStatus(leadId: string, status: Lead['status']): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
      }>(`/vendors/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Lead status updated successfully!",
        });
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update lead status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  // Utility methods
  getImageUrl(image: string | { url?: string; caption?: string; isPrimary?: boolean } | undefined): string {
    if (!image) {
      return "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop&auto=format";
    }
    
    if (typeof image === 'string') {
      return image;
    }
    
    return image.url || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop&auto=format";
  }

  formatPrice(price: number, currency = '₹'): string {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString('en-IN')}`;
  }

  formatPercentageChange(value: string): { value: string; isPositive: boolean } {
    const isPositive = value.startsWith('+');
    return { value, isPositive };
  }

  getStatusColor(status: string): string {
    const colors = {
      active: 'bg-green-500',
      pending: 'bg-yellow-500',
      sold: 'bg-blue-500',
      rented: 'bg-purple-500',
      inactive: 'bg-gray-500',
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      qualified: 'bg-orange-500',
      converted: 'bg-green-500',
      lost: 'bg-red-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  }

  getInterestColor(interest: string): string {
    const colors = {
      high: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
      medium: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900',
      low: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900',
    };
    return colors[interest as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  }

  private async getEmptyDashboardData(): Promise<VendorDashboardData> {
    // Get real rating data even for empty dashboard
    let averageRating = 0;
    try {
      const reviewStats = await reviewsService.getReviewStats();
      averageRating = reviewStats.averageRating;
    } catch (reviewError) {
      console.log("Could not get rating for empty dashboard:", reviewError);
    }

    return {
      stats: {
        totalProperties: 0,
        totalPropertiesChange: "+0",
        propertyViews: 0,
        propertyViewsChange: "+0%",
        unreadMessages: 0,
        totalMessages: 0,
        messagesChange: "0 unread",
        totalRevenue: 0,
        revenueChange: "+0%",
        conversionRate: 0,
        conversionChange: "+0%",
        averageRating,
        phoneCalls: 0,
        phoneCallsChange: "+0%"
      },
      recentProperties: [],
      recentLeads: [],
      performanceData: [],
      analytics: {
        monthlyPerformance: [],
        leadsBySource: [],
        propertyPerformance: [],
        topPerformingAreas: []
      },
      notifications: []
    };
  }
}

export const vendorDashboardService = new VendorDashboardService();
export default vendorDashboardService;