import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface Plan {
  _id: string;
  identifier?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime' | 'one-time' | 'custom';
  billingCycleMonths?: number;
  features: Array<{
    name: string;
    description?: string;
    enabled: boolean;
  }> | string[];
  limits: {
    properties: number;
    featuredListings: number;
    photos: number;
    videoTours: number;
    videos?: number;
    leads: number;
    posters: number;
    messages: number;
    leadManagement?: 'none' | 'basic' | 'advanced' | 'premium' | 'enterprise';
  };
  benefits?: {
    topRated?: boolean;
    verifiedBadge?: boolean;
    marketingManager?: boolean;
    commissionBased?: boolean;
    [key: string]: boolean | undefined;
  } | Array<{
    key: string;
    name: string;
    description?: string;
    enabled: boolean;
    icon?: string;
  }>;
  support?: 'none' | 'email' | 'priority' | 'phone' | 'dedicated';
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  subscriberCount?: number;
  priceHistory?: Array<{
    price: number;
    changedAt: string;
    changedBy?: string;
    reason?: string;
  }>;
  featureHistory?: Array<{
    action: 'added' | 'removed' | 'modified';
    featureName: string;
    previousValue?: any;
    newValue?: any;
    changedAt: string;
    changedBy?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFilters {
  page?: number;
  limit?: number;
  billingPeriod?: string;
  isActive?: boolean;
  search?: string;
}

export interface PlanResponse {
  success: boolean;
  data: {
    plans: Plan[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalPlans: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SinglePlanResponse {
  success: boolean;
  data: {
    plan: Plan;
  };
}

class PlanService {
  private baseUrl = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';

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

  async getPlans(filters: PlanFilters = {}): Promise<PlanResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/plans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<PlanResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch plans";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getPlan(id: string): Promise<SinglePlanResponse> {
    try {
      const response = await this.makeRequest<SinglePlanResponse>(`/plans/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch plan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createPlan(planData: Partial<Plan>): Promise<SinglePlanResponse> {
    try {
      const response = await this.makeRequest<SinglePlanResponse>("/plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });

      toast({
        title: "Success",
        description: "Plan created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create plan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updatePlan(id: string, planData: Partial<Plan>): Promise<SinglePlanResponse> {
    try {
      const response = await this.makeRequest<SinglePlanResponse>(`/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(planData),
      });

      toast({
        title: "Success",
        description: "Plan updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update plan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deletePlan(id: string): Promise<void> {
    try {
      await this.makeRequest(`/plans/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Plan deleted successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete plan";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async togglePlanStatus(id: string): Promise<SinglePlanResponse> {
    try {
      const response = await this.makeRequest<SinglePlanResponse>(`/plans/${id}/toggle-status`, {
        method: "PATCH",
      });

      toast({
        title: "Success",
        description: "Plan status updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update plan status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper method to format price
  formatPrice(plan: Plan): string {
    const symbol = plan.currency === 'INR' ? '₹' : plan.currency === 'USD' ? '$' : '€';
    
    let period = '';
    if (plan.billingPeriod === 'custom' && plan.billingCycleMonths) {
      period = `/${plan.billingCycleMonths} month${plan.billingCycleMonths > 1 ? 's' : ''}`;
    } else if (plan.billingPeriod === 'monthly') {
      period = '/month';
    } else if (plan.billingPeriod === 'yearly') {
      period = '/year';
    } else if (plan.billingPeriod === 'lifetime') {
      period = ' (Lifetime)';
    }
    
    return `${symbol}${plan.price.toLocaleString()}${period}`;
  }

  // Helper method to get plan type badge variant
  getPlanBadgeVariant(plan: Plan): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (!plan.isActive) return 'destructive';
    return 'secondary';
  }

  // Helper method to extract feature names from features array
  getFeatureNames(features: Array<{name: string; description?: string; enabled: boolean}> | string[]): string[] {
    return Array.isArray(features)
      ? features.map(f => typeof f === 'string' ? f : f.name)
      : [];
  }

  // Helper method to format features for display
  formatFeatures(features: Array<{name: string; description?: string; enabled: boolean}> | string[]): string {
    const featureNames = this.getFeatureNames(features);
      
    if (featureNames.length <= 3) {
      return featureNames.join(', ');
    }
    return `${featureNames.slice(0, 2).join(', ')} and ${featureNames.length - 2} more`;
  }

  // Get price history for a plan
  async getPriceHistory(id: string): Promise<{
    success: boolean;
    data: {
      planName: string;
      priceHistory: Array<{
        price: number;
        changedAt: string;
        changedBy?: { name: string; email: string };
        reason?: string;
      }>;
    };
  }> {
    try {
      const response = await this.makeRequest<any>(`/plans/${id}/price-history`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch price history";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Get available upgrade plans for current subscription
  async getUpgradePlans(currentPlanPrice: number): Promise<PlanResponse> {
    try {
      const allPlansResponse = await this.getPlans({ isActive: true });
      
      // Filter plans that cost more than current plan
      if (allPlansResponse.success) {
        const upgradePlans = allPlansResponse.data.plans.filter(plan => 
          plan.price > currentPlanPrice && plan.isActive
        );
        
        return {
          ...allPlansResponse,
          data: {
            ...allPlansResponse.data,
            plans: upgradePlans
          }
        };
      }
      
      return allPlansResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch upgrade plans";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const planService = new PlanService();
export default planService;