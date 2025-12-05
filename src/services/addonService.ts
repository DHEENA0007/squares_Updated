import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface AddonService {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingType: 'per_property' | 'monthly' | 'yearly' | 'one_time';
  category: 'photography' | 'marketing' | 'technology' | 'support' | 'crm';
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

class AddonServiceAPI {
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
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("Addon API request failed:", error);
      throw error;
    }
  }

  async getAddons(category?: string): Promise<AddonService[]> {
    try {
      const queryParams = new URLSearchParams();
      if (category) queryParams.append('category', category);
      
      const endpoint = `/addons${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          addons: AddonService[];
          total: number;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data.addons;
      }

      throw new Error("Failed to fetch addons");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch addons";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getAddonById(id: string): Promise<AddonService> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: AddonService;
      }>(`/addons/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to fetch addon");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch addon";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const addonService = new AddonServiceAPI();
