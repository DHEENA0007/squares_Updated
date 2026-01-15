import { authService } from './authService';
import { toast } from "@/hooks/use-toast";
import { handleAuthError } from "@/utils/apiUtils";

export interface AdminPropertyResponse {
  success: boolean;
  data: {
    properties: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProperties: number;
      hasNext: boolean;
      hasPrev: boolean;
      limit: number;
    };
  };
}

export interface AdminPropertyFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  owner?: string;
  search?: string;
}

class AdminPropertyService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authService.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin${endpoint}`, config);

    // Check for auth error
    handleAuthError(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getProperties(filters: AdminPropertyFilters = {}): Promise<AdminPropertyResponse> {
    try {
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/properties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<AdminPropertyResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch properties";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async approveProperty(propertyId: string): Promise<void> {
    try {
      await this.makeRequest(`/properties/${propertyId}/approve`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: "Property approved successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to approve property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async rejectProperty(propertyId: string, reason: string): Promise<void> {
    try {
      await this.makeRequest(`/properties/${propertyId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      toast({
        title: "Success",
        description: "Property rejected successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reject property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteProperty(propertyId: string): Promise<void> {
    try {
      await this.makeRequest(`/properties/${propertyId}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Property deleted successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete property";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async togglePropertyFeatured(propertyId: string, featured: boolean): Promise<void> {
    try {
      await this.makeRequest(`/properties/${propertyId}/featured`, {
        method: "PATCH",
        body: JSON.stringify({ featured }),
      });

      toast({
        title: "Success",
        description: `Property ${featured ? 'marked as featured' : 'removed from featured'}!`,
      });
    } catch (error: any) {
      const errorData = error.response?.data || error;
      const errorMessage = errorData.message || error.message || "Failed to update property";

      // Show specific message for subscription-related errors  
      if (errorData.upgradeRequired || errorData.limitReached) {
        toast({
          title: errorData.limitReached ? "Featured Limit Reached" : "Upgrade Required",
          description: `${errorMessage} Visit the Subscription Plans page to upgrade.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  getStatusOptions() {
    return [
      { label: "Active", value: "active" },
      { label: "Available", value: "available" },
      { label: "Pending", value: "pending" },
      { label: "Sold", value: "sold" },
      { label: "Rented", value: "rented" },
      { label: "Rejected", value: "rejected" },
    ];
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'sold':
        return 'bg-blue-500';
      case 'rented':
        return 'bg-purple-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'available': 'Available',
      'pending': 'Pending Review',
      'sold': 'Sold',
      'rented': 'Rented',
      'rejected': 'Rejected'
    };
    return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
  }

  getPropertyTypeOptions() {
    return [
      { label: "Apartment", value: "apartment" },
      { label: "House", value: "house" },
      { label: "Villa", value: "villa" },
      { label: "Plot", value: "plot" },
      { label: "Commercial", value: "commercial" },
      { label: "Office", value: "office" },
    ];
  }
}

export const adminPropertyService = new AdminPropertyService();
export default adminPropertyService;