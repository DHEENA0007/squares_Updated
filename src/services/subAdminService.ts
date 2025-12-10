const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';

interface Property {
  _id: string;
  title: string;
  type: string;
  listingType: string;
  price: number;
  status: 'pending' | 'available' | 'rejected';
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  address: {
    city: string;
    district?: string;
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
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  ticketNumber?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  responses?: Array<{
    message: string;
    author: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
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
  totalPropertiesApproved: number;
  availablePropertiesApproved: number;
  pendingProperties: number;
  rejectedPropertiesApproved: number;
  totalSupport: number;
  openSupport: number;
  resolvedSupport: number;
  closedSupport: number;
  analytics?: {
    propertiesApprovedLast7Days: number;
    propertiesApprovedLast30Days: number;
    supportTicketsResolvedLast7Days: number;
    supportTicketsResolvedLast30Days: number;
    propertiesApprovedThisMonth: number;
    propertiesApprovedLastMonth: number;
    supportTicketsThisMonth: number;
    supportTicketsLastMonth: number;
    propertyApprovalTrend: number;
    supportTicketTrend: number;
    avgResponseTimeHours: number;
  };
  recentActivity?: {
    approvals: Array<{
      _id: string;
      title: string;
      type: string;
      approvedAt: string;
      owner: {
        _id: string;
        email: string;
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
    rejections: Array<{
      _id: string;
      title: string;
      type: string;
      rejectionReason: string;
      updatedAt: string;
    }>;
    tickets: Array<{
      _id: string;
      subject: string;
      status: string;
      priority: string;
      updatedAt: string;
      user: {
        _id: string;
        email: string;
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
  };
}

class SubAdminService {
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
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
          }));
        } else {
          errorData = {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        
        const error = new Error(errorData.message || "An error occurred");
        (error as any).status = response.status;
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format: Expected JSON');
      }

      return await response.json();
    } catch (error) {
      console.error("SubAdmin API request failed:", error);
      throw error;
    }
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: DashboardStats }>(
        '/subadmin/dashboard'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch dashboard stats');
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
      const response = await this.makeRequest<{ success: boolean; data: any }>(
        `/subadmin/properties/pending?page=${page}&limit=${limit}&search=${search}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending properties');
    }
  }

  async approveProperty(propertyId: string): Promise<Property> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: Property }>(
        `/subadmin/properties/${propertyId}/approve`,
        { method: 'POST' }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve property');
    }
  }

  async rejectProperty(propertyId: string, reason: string): Promise<Property> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: Property }>(
        `/subadmin/properties/${propertyId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reject property');
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
      const response = await this.makeRequest<{ success: boolean; data: any }>(
        `/subadmin/support/tickets?page=${page}&limit=${limit}&status=${status}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch support tickets');
    }
  }

  async updateSupportTicket(ticketId: string, status: string, response: string): Promise<SupportTicket> {
    try {
      const res = await this.makeRequest<{ success: boolean; data: SupportTicket }>(
        `/subadmin/support/tickets/${ticketId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, response }),
        }
      );
      return res.data;
    } catch (error: any) {
      // Preserve the status code for locked tickets
      const err = new Error(error.message || 'Failed to update support ticket');
      (err as any).status = error.status;
      throw err;
    }
  }

  // Vendor Performance
  async getVendorPerformance(): Promise<{ vendors: VendorPerformance[] }> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { vendors: VendorPerformance[] } }>(
        '/subadmin/vendors/performance'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch vendor performance');
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
      await this.makeRequest<{ success: boolean }>(
        '/subadmin/notifications/send',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send notification');
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
      
      const response = await this.makeRequest<{ success: boolean; data: any }>(
        `/subadmin/reports/city/${city}?${params}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch city report');
    }
  }

  // Content Moderation (placeholder - implement based on your content system)
  async getContentReports(): Promise<{ reports: any[]; total: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: any }>(
        '/subadmin/content/reports'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch content reports');
    }
  }

  // Promotions (placeholder - implement based on your promotion system)
  async getPendingPromotions(): Promise<{ promotions: any[]; total: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: any }>(
        '/subadmin/promotions/pending'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending promotions');
    }
  }
}

export default new SubAdminService();
