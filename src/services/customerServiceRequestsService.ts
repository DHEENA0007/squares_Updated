const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

export interface ServiceRequest {
  id: string;
  serviceType: 'home_loan' | 'movers' | 'legal' | 'interior' | 'cleaning' | 'security';
  title: string;
  description: string;
  amount?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progress?: number;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  property?: {
    id: string;
    title: string;
    city: string;
    state: string;
    price: number;
  };
  provider?: {
    id: string;
    name: string;
    rating: number;
    phone: string;
    avatar?: string;
  };
  documents?: Array<{
    id: string;
    document_type: string;
    document_url: string;
    status: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ServiceProvider {
  id: string;
  name: string;
  description: string;
  services: string[];
  rating: number;
  totalRatings: number;
  phone: string;
  email: string;
  avatar?: string;
  city: string;
  state: string;
  serviceAreas: string[];
  experience?: number;
  verified: boolean;
  recentReviews?: Array<{
    rating: number;
    review: string;
    createdAt: string;
    users: {
      user_profiles: {
        first_name: string;
        last_name: string;
      };
    };
  }>;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  providerCount: number;
}

export interface ServiceRequestFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'all';
  serviceType?: string;
  sortBy?: 'created_at' | 'updated_at' | 'status' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateServiceRequestData {
  serviceType: string;
  title: string;
  description: string;
  propertyId?: string;
  providerId?: string;
  amount?: number;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

class CustomerServiceRequestsService {
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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `${response.statusText} - ${endpoint}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Service Request API request failed:", error);
      throw error;
    }
  }

  async getServiceRequests(filters: ServiceRequestFilters = {}): Promise<{
    requests: ServiceRequest[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/services/requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          requests: ServiceRequest[];
          pagination: {
            currentPage: number;
            totalPages: number;
            totalCount: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
            limit: number;
          };
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        requests: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
        },
      };
    } catch (error) {
      console.error("Failed to fetch service requests:", error);
      throw error;
    }
  }

  async createServiceRequest(data: CreateServiceRequestData): Promise<ServiceRequest | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: {
          request: ServiceRequest;
        };
      }>('/services/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        return response.data.request;
      }

      return null;
    } catch (error) {
      console.error("Failed to create service request:", error);
      throw error;
    }
  }

  async updateServiceRequest(
    requestId: string,
    data: Partial<ServiceRequest>
  ): Promise<ServiceRequest | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: {
          request: ServiceRequest;
        };
      }>(`/services/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        return response.data.request;
      }

      return null;
    } catch (error) {
      console.error("Failed to update service request:", error);
      throw error;
    }
  }

  async cancelServiceRequest(requestId: string, reason?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/services/requests/${requestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      return response.success;
    } catch (error) {
      console.error("Failed to cancel service request:", error);
      throw error;
    }
  }

  async rateServiceRequest(
    requestId: string,
    rating: number,
    review?: string
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/services/requests/${requestId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, review }),
      });

      return response.success;
    } catch (error) {
      console.error("Failed to rate service request:", error);
      throw error;
    }
  }

  async getServiceProviders(filters: {
    serviceType?: string;
    city?: string;
    minRating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Promise<{
    providers: ServiceProvider[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/services/providers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          providers: ServiceProvider[];
          pagination: {
            currentPage: number;
            totalPages: number;
            totalCount: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
            limit: number;
          };
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        providers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 12,
        },
      };
    } catch (error) {
      console.error("Failed to fetch service providers:", error);
      throw error;
    }
  }

  async getServiceCategories(): Promise<ServiceCategory[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          categories: ServiceCategory[];
        };
      }>('/services/categories');

      if (response.success && response.data) {
        return response.data.categories;
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch service categories:", error);
      throw error;
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  getServiceTypeLabel(serviceType: string): string {
    const labels: Record<string, string> = {
      home_loan: 'Home Loans',
      movers: 'Packers & Movers',
      legal: 'Legal Services',
      interior: 'Interior Design',
      cleaning: 'Cleaning Services',
      security: 'Security Services',
    };
    return labels[serviceType] || serviceType;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return texts[status] || status;
  }
}

export const customerServiceRequestsService = new CustomerServiceRequestsService();
export default customerServiceRequestsService;
