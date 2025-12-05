import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface AdminAddonService {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddonRequest {
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

export interface UpdateAddonRequest extends Partial<CreateAddonRequest> {}

export interface AddonFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminAddonResponse {
  addons: AdminAddonService[];
  total: number;
  totalPages: number;
  currentPage: number;
}

class AdminAddonServiceAPI {
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
      console.error("Admin Addon API request failed:", error);
      throw error;
    }
  }

  async getAddons(filters: AddonFilters = {}): Promise<AdminAddonResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      
      const endpoint = `/admin/addons${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.makeRequest<{
        success: boolean;
        data: AdminAddonResponse;
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
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

  async getAddonById(id: string): Promise<AdminAddonService> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: AdminAddonService;
      }>(`/admin/addons/${id}`);

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

  async createAddon(addonData: CreateAddonRequest): Promise<AdminAddonService> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: AdminAddonService;
      }>('/admin/addons', {
        method: 'POST',
        body: JSON.stringify(addonData),
      });

      if (response.success && response.data) {
        toast({
          title: "Success",
          description: "Addon service created successfully",
        });
        return response.data;
      }

      throw new Error("Failed to create addon");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create addon";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateAddon(id: string, addonData: UpdateAddonRequest): Promise<AdminAddonService> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: AdminAddonService;
      }>(`/admin/addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(addonData),
      });

      if (response.success && response.data) {
        toast({
          title: "Success",
          description: "Addon service updated successfully",
        });
        return response.data;
      }

      throw new Error("Failed to update addon");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update addon";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteAddon(id: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/admin/addons/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Addon service deleted successfully",
        });
        return;
      }

      throw new Error("Failed to delete addon");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete addon";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async toggleAddonStatus(id: string): Promise<AdminAddonService> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: AdminAddonService;
      }>(`/admin/addons/${id}/toggle-status`, {
        method: 'PATCH',
      });

      if (response.success && response.data) {
        toast({
          title: "Success",
          description: `Addon service ${response.data.isActive ? 'activated' : 'deactivated'} successfully`,
        });
        return response.data;
      }

      throw new Error("Failed to toggle addon status");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle addon status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateSortOrder(addonIds: string[]): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>('/admin/addons/sort-order', {
        method: 'PUT',
        body: JSON.stringify({ addonIds }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Addon sort order updated successfully",
        });
        return;
      }

      throw new Error("Failed to update sort order");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update sort order";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  getCategoryOptions() {
    return [
      { value: 'photography', label: 'Photography' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'technology', label: 'Technology' },
      { value: 'support', label: 'Support' },
      { value: 'crm', label: 'CRM' },
    ];
  }

  getBillingTypeOptions() {
    return [
      { value: 'per_property', label: 'Per Property' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'one_time', label: 'One Time' },
    ];
  }

  getCurrencyOptions() {
    return [
      { value: 'INR', label: '₹ INR' },
      { value: 'USD', label: '$ USD' },
      { value: 'EUR', label: '€ EUR' },
    ];
  }
}

export const adminAddonService = new AdminAddonServiceAPI();