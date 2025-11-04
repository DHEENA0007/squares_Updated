import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Property {
  _id: string;
  title: string;
  type: string;
  listingType: string;
  price: number;
  status: 'pending' | 'active' | 'rejected';
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  address: {
    city: string;
    state: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

interface SupportTicket {
  _id: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  subject?: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

interface VendorPerformance {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  totalProperties: number;
  activeProperties: number;
}

interface DashboardStats {
  pendingProperties: number;
  totalProperties: number;
  pendingSupport: number;
  totalUsers: number;
}

class SubAdminService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/dashboard`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }

  // Property Management
  async getPendingProperties(page = 1, limit = 10, search = ''): Promise<{
    properties: Property[];
    total: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/properties/pending?page=${page}&limit=${limit}&search=${search}`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch pending properties');
    }
  }

  async approveProperty(propertyId: string): Promise<Property> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/subadmin/properties/${propertyId}/approve`,
        {},
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve property');
    }
  }

  async rejectProperty(propertyId: string, reason: string): Promise<Property> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/subadmin/properties/${propertyId}/reject`,
        { reason },
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject property');
    }
  }

  // Support Tickets
  async getSupportTickets(page = 1, limit = 10, status = 'open'): Promise<{
    tickets: SupportTicket[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/support/tickets?page=${page}&limit=${limit}&status=${status}`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch support tickets');
    }
  }

  // Vendor Performance
  async getVendorPerformance(): Promise<{ vendors: VendorPerformance[] }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/vendors/performance`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch vendor performance');
    }
  }

  // Notifications
  async sendNotification(data: {
    title: string;
    message: string;
    recipients: string;
    type?: string;
  }): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/subadmin/notifications/send`,
        data,
        this.getAuthHeaders()
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send notification');
    }
  }

  // Reports
  async getCityReport(city: string, startDate?: string, endDate?: string): Promise<{
    city: string;
    propertyStats: any[];
    userStats: number;
    period: { startDate?: string; endDate?: string };
  }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/reports/city/${city}?${params}`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch city report');
    }
  }

  // Content Moderation (placeholder - implement based on your content system)
  async getContentReports(): Promise<{ reports: any[]; total: number }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/content/reports`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch content reports');
    }
  }

  // Promotions (placeholder - implement based on your promotion system)
  async getPendingPromotions(): Promise<{ promotions: any[]; total: number }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/subadmin/promotions/pending`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch pending promotions');
    }
  }
}

export default new SubAdminService();
