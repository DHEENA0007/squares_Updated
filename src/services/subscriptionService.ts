import authService from './authService';
import { toast } from '@/hooks/use-toast';

export interface PaymentHistoryItem {
  _id: string;
  type: 'subscription_purchase' | 'addon_purchase' | 'renewal' | 'upgrade';
  amount: number;
  addons?: string[];
  date: string;
  paymentMethod?: string;
  transactionId?: string;
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };
}

export interface Subscription {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  plan: {
    _id: string;
    name: string;
    description: string;
    price: number;
    billingPeriod: string;
  };
  addons?: Array<{
    _id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    billingType: string;
  }>;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  autoRenew: boolean;
  paymentHistory?: PaymentHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  planId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  data: {
    subscriptions: Subscription[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalSubscriptions: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SingleSubscriptionResponse {
  success: boolean;
  data: {
    subscription: Subscription;
  };
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface SubscriptionStatsResponse {
  success: boolean;
  data: SubscriptionStats;
}

class SubscriptionService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
        // Handle authentication errors
        if (response.status === 401) {
          console.error('Authentication failed - redirecting to login');
          authService.logout();
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        
        if (response.status === 403) {
          throw new Error('Admin access required');
        }

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

  async getSubscriptions(filters: SubscriptionFilters = {}): Promise<SubscriptionResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/subscriptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<SubscriptionResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch subscriptions";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getSubscription(id: string): Promise<SingleSubscriptionResponse> {
    try {
      const response = await this.makeRequest<SingleSubscriptionResponse>(`/subscriptions/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createSubscription(subscriptionData: Partial<Subscription>): Promise<SingleSubscriptionResponse> {
    try {
      const response = await this.makeRequest<SingleSubscriptionResponse>("/subscriptions", {
        method: "POST",
        body: JSON.stringify(subscriptionData),
      });

      toast({
        title: "Success",
        description: "Subscription created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateSubscription(id: string, subscriptionData: Partial<Subscription>): Promise<SingleSubscriptionResponse> {
    try {
      const response = await this.makeRequest<SingleSubscriptionResponse>(`/subscriptions/${id}`, {
        method: "PUT",
        body: JSON.stringify(subscriptionData),
      });

      toast({
        title: "Success",
        description: "Subscription updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async cancelSubscription(id: string): Promise<SingleSubscriptionResponse> {
    try {
      const response = await this.makeRequest<SingleSubscriptionResponse>(`/subscriptions/${id}/cancel`, {
        method: "PATCH",
      });

      toast({
        title: "Success",
        description: "Subscription cancelled successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async renewSubscription(id: string): Promise<SingleSubscriptionResponse> {
    try {
      const response = await this.makeRequest<SingleSubscriptionResponse>(`/subscriptions/${id}/renew`, {
        method: "PATCH",
      });

      toast({
        title: "Success",
        description: "Subscription renewed successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to renew subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getSubscriptionStats(): Promise<SubscriptionStatsResponse> {
    try {
      const response = await this.makeRequest<SubscriptionStatsResponse>("/subscriptions/stats");
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch subscription statistics";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper methods
  formatSubscriptionStatus(status: string): { label: string; color: string } {
    const statusMap = {
      active: { label: "Active", color: "green" },
      cancelled: { label: "Cancelled", color: "red" },
      expired: { label: "Expired", color: "orange" },
      pending: { label: "Pending", color: "blue" },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, color: "gray" };
  }

  formatAmount(subscription: Subscription): string {
    const symbol = subscription.currency === 'INR' ? '₹' : subscription.currency === 'USD' ? '$' : '€';
    return `${symbol}${subscription.amount.toLocaleString()}`;
  }

  isSubscriptionExpiringSoon(subscription: Subscription, days: number = 7): boolean {
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  }

  getDaysUntilExpiry(subscription: Subscription): number {
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;