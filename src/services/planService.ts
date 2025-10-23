import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  limits: {
    properties: number;
    featuredListings: number;
    photos: number;
    videoTours: number;
  };
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  subscriberCount?: number;
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
    const period = plan.billingPeriod === 'monthly' ? '/month' : 
                   plan.billingPeriod === 'yearly' ? '/year' : '';
    
    return `${symbol}${plan.price.toLocaleString()}${period}`;
  }

  // Helper method to get plan type badge variant
  getPlanBadgeVariant(plan: Plan): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (!plan.isActive) return 'destructive';
    if (plan.isPopular) return 'default';
    return 'secondary';
  }

  // Helper method to format features for display
  formatFeatures(features: string[]): string {
    if (features.length <= 3) {
      return features.join(', ');
    }
    return `${features.slice(0, 2).join(', ')} and ${features.length - 2} more`;
  }
}

export const planService = new PlanService();
export default planService;