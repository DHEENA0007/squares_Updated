import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

export interface VendorService {
  _id: string;
  vendorId: string;
  title: string;
  description: string;
  category: 'property_management' | 'consultation' | 'legal_services' | 'home_loans' | 'interior_design' | 'moving_services' | 'insurance' | 'other';
  subcategory?: string;
  pricing: {
    type: 'fixed' | 'hourly' | 'percentage' | 'negotiable';
    amount?: number;
    currency: string;
    details?: string;
  };
  features: string[];
  duration?: string;
  availability: {
    days: string[];
    hours: {
      start: string;
      end: string;
    };
    timezone: string;
  };
  serviceArea: {
    cities: string[];
    radius?: number;
    onlineAvailable: boolean;
  };
  requirements?: string[];
  tags: string[];
  isActive: boolean;
  isPromoted: boolean;
  statistics: {
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
    responseTime: number;
  };
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBooking {
  _id: string;
  serviceId: string;
  clientId: string;
  vendorId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  clientDetails: {
    name: string;
    email: string;
    phone: string;
    requirements?: string;
  };
  notes?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'bookings' | 'revenue';
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  popularCategories: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
}

class VendorServicesService {
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
      console.error("Services API request failed:", error);
      throw error;
    }
  }

  async getServices(filters: ServiceFilters = {}): Promise<{
    services: VendorService[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/vendors/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          services: VendorService[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        services: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    } catch (error) {
      console.error("Failed to fetch services:", error);
      return {
        services: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  async getServiceById(serviceId: string): Promise<VendorService | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorService;
      }>(`/vendors/services/${serviceId}`);

      return response.success ? response.data : null;
    } catch (error) {
      console.error("Failed to fetch service:", error);
      return null;
    }
  }

  async createService(serviceData: Partial<VendorService>): Promise<VendorService | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorService;
        message: string;
      }>("/vendors/services", {
        method: "POST",
        body: JSON.stringify(serviceData),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Service created successfully!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to create service");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create service";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateService(serviceId: string, serviceData: Partial<VendorService>): Promise<VendorService | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorService;
        message: string;
      }>(`/vendors/services/${serviceId}`, {
        method: "PUT",
        body: JSON.stringify(serviceData),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Service updated successfully!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to update service");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update service";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteService(serviceId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/vendors/services/${serviceId}`, {
        method: "DELETE",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Service deleted successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to delete service");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete service";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  async toggleServiceStatus(serviceId: string): Promise<VendorService | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorService;
        message: string;
      }>(`/vendors/services/${serviceId}/toggle-status`, {
        method: "PATCH",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Service status updated!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to update service status");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update service status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  async getServiceBookings(serviceId: string): Promise<ServiceBooking[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ServiceBooking[];
      }>(`/vendors/services/${serviceId}/bookings`);

      return response.success ? response.data : [];
    } catch (error) {
      console.error("Failed to fetch service bookings:", error);
      return [];
    }
  }

  async getServiceStats(): Promise<ServiceStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ServiceStats;
      }>("/vendors/services/stats");

      if (response.success && response.data) {
        return response.data;
      }

      return {
        totalServices: 0,
        activeServices: 0,
        totalBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        popularCategories: [],
      };
    } catch (error) {
      console.error("Failed to fetch service stats:", error);
      return {
        totalServices: 0,
        activeServices: 0,
        totalBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        popularCategories: [],
      };
    }
  }

  async updateBookingStatus(bookingId: string, status: ServiceBooking['status']): Promise<ServiceBooking | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ServiceBooking;
        message: string;
      }>(`/vendors/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Booking status updated!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to update booking status");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update booking status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getServiceCategoryLabel(category: VendorService['category']): string {
    const labels = {
      property_management: 'Property Management',
      consultation: 'Real Estate Consultation',
      legal_services: 'Legal Services',
      home_loans: 'Home Loans',
      interior_design: 'Interior Design',
      moving_services: 'Moving Services',
      insurance: 'Property Insurance',
      other: 'Other Services',
    };
    return labels[category] || category;
  }

  getStatusColor(status: string): string {
    const colors = {
      active: 'text-green-600 bg-green-100',
      inactive: 'text-gray-600 bg-gray-100',
      pending: 'text-yellow-600 bg-yellow-100',
      confirmed: 'text-blue-600 bg-blue-100',
      in_progress: 'text-purple-600 bg-purple-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  }

  getPricingDisplay(pricing: VendorService['pricing']): string {
    if (!pricing) {
      return 'Contact for pricing';
    }
    
    if (pricing.type === 'negotiable') {
      return 'Negotiable';
    }
    
    if (!pricing.amount) {
      return 'Contact for pricing';
    }

    const amount = this.formatCurrency(pricing.amount);
    
    switch (pricing.type) {
      case 'hourly':
        return `${amount}/hour`;
      case 'percentage':
        return `${pricing.amount}% commission`;
      case 'fixed':
      default:
        return amount;
    }
  }
}

export const vendorServicesService = new VendorServicesService();
export default vendorServicesService;