import { toast } from "@/hooks/use-toast";
import { reviewsService } from "./reviewsService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface AnalyticsOverviewStats {
  totalViews: number;
  totalLeads: number;
  totalCalls: number;
  totalMessages: number;
  totalRevenue: number;
  soldPropertyRevenue: number;
  leasedPropertyRevenue: number;
  rentedPropertyRevenue: number;
  totalProperties: number;
  averageRating: number;
  responseTime: string;
  conversionRate: number;
  trends?: {
    views: {
      current: number;
      previous: number;
      growth: number;
    };
    leads: {
      current: number;
      previous: number;
      growth: number;
    };
    properties: {
      current: number;
      previous: number;
      growth: number;
    };
    revenue: {
      current: number;
      previous: number;
      growth: number;
    };
  };
}

export interface AnalyticsFilters {
  timeframe: '7days' | '30days' | '90days' | '1year';
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PerformanceMetrics {
  viewsData: ChartData[];
  leadsData: ChartData[];
  conversionData: ChartData[];
  revenueData: ChartData[];
  propertyPerformance: Array<{
    propertyId: string;
    title: string;
    views: number;
    leads: number;
    conversionRate: number;
    revenue: number;
    favorites?: number;
  }>;
  leadSources: ChartData[];
  demographicsData: ChartData[];
}

class AnalyticsService {
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
      console.error("Analytics API request failed:", error);
      throw error;
    }
  }

  async getOverviewStats(filters: AnalyticsFilters): Promise<AnalyticsOverviewStats> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('timeframe', filters.timeframe);
      if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const endpoint = `/vendors/analytics/overview?${queryParams.toString()}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: AnalyticsOverviewStats;
      }>(endpoint);

      if (response.success && response.data) {
        // Ensure we have the latest rating data from reviews
        try {
          const reviewStats = await reviewsService.getReviewStats();
          response.data.averageRating = reviewStats.averageRating;
        } catch (reviewError) {
          console.log("Could not fetch review stats for rating:", reviewError);
        }
        return response.data;
      }

      // Return default stats with real rating if endpoint doesn't exist yet
      let averageRating = 0;
      try {
        const reviewStats = await reviewsService.getReviewStats();
        averageRating = reviewStats.averageRating;
      } catch (reviewError) {
        console.log("Could not fetch review stats for default rating:", reviewError);
      }

      return {
        totalViews: 0,
        totalLeads: 0,
        totalCalls: 0,
        totalMessages: 0,
        totalRevenue: 0,
        soldPropertyRevenue: 0,
        leasedPropertyRevenue: 0,
        rentedPropertyRevenue: 0,
        totalProperties: 0,
        averageRating,
        responseTime: "Not calculated",
        conversionRate: 0
      };
    } catch (error) {
      console.error("Failed to fetch overview stats:", error);
      
      // Return default stats with real rating on error
      let averageRating = 0;
      try {
        const reviewStats = await reviewsService.getReviewStats();
        averageRating = reviewStats.averageRating;
      } catch (reviewError) {
        console.log("Could not fetch review stats for error rating:", reviewError);
      }

      return {
        totalViews: 0,
        totalLeads: 0,
        totalCalls: 0,
        totalMessages: 0,
        totalRevenue: 0,
        soldPropertyRevenue: 0,
        leasedPropertyRevenue: 0,
        rentedPropertyRevenue: 0,
        totalProperties: 0,
        averageRating,
        responseTime: "Not calculated",
        conversionRate: 0
      };
    }
  }

  async getPerformanceMetrics(filters: AnalyticsFilters): Promise<PerformanceMetrics> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('timeframe', filters.timeframe);
      if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const endpoint = `/vendors/analytics/performance?${queryParams.toString()}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: PerformanceMetrics;
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      // Return default metrics if endpoint doesn't exist yet
      return {
        viewsData: [],
        leadsData: [],
        conversionData: [],
        revenueData: [],
        propertyPerformance: [],
        leadSources: [],
        demographicsData: []
      };
    } catch (error) {
      console.error("Failed to fetch performance metrics:", error);
      // Return default metrics on error
      return {
        viewsData: [],
        leadsData: [],
        conversionData: [],
        revenueData: [],
        propertyPerformance: [],
        leadSources: [],
        demographicsData: []
      };
    }
  }

  async exportAnalyticsData(filters: AnalyticsFilters, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('timeframe', filters.timeframe);
      queryParams.append('format', format);
      if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

      const endpoint = `/vendors/analytics/export?${queryParams.toString()}`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export analytics data");
      }

      const blob = await response.blob();
      
      toast({
        title: "Success",
        description: `Analytics data exported as ${format.toUpperCase()}!`,
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export analytics data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0';
    }
    
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  }

  formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '0%';
    }
    return `${value.toFixed(1)}%`;
  }

  calculateChangePercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  getChangeType(change: number): 'increase' | 'decrease' | 'neutral' {
    if (change > 0) return 'increase';
    if (change < 0) return 'decrease';
    return 'neutral';
  }

  getChangeColor(changeType: 'increase' | 'decrease' | 'neutral'): string {
    switch (changeType) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
    }
  }

  generateDateRange(timeframe: string): ChartData[] {
    const now = new Date();
    const data: ChartData[] = [];
    
    switch (timeframe) {
      case '7days':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          data.push({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: 0
          });
        }
        break;
      case '30days':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          data.push({
            name: date.getDate().toString(),
            value: 0
          });
        }
        break;
      case '90days':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          data.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            value: 0
          });
        }
        break;
      case '1year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          data.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            value: 0
          });
        }
        break;
    }
    
    return data;
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;