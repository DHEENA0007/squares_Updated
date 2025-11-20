import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

export interface Lead {
  _id: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  recipient: string;
  property?: {
    _id: string;
    title: string;
    price: number;
    listingType: 'sale' | 'rent';
    address: {
      locality: string;
      city: string;
      state: string;
    };
  };
  subject: string;
  message: string;
  type: string;
  status: 'unread' | 'read' | 'responded' | 'qualified' | 'converted' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  source: string;
  budget?: {
    min: number;
    max: number;
  };
  preferredLocation?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
  lastContact?: string;
}

export interface LeadStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: string;
  avgLeadScore: number;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class LeadService {
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
      console.error("Lead API request failed:", error);
      throw error;
    }
  }

  async getVendorLeads(filters: LeadFilters = {}): Promise<{
    leads: Lead[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLeads: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.priority && filters.priority !== 'all') queryParams.append('priority', filters.priority);
      if (filters.source && filters.source !== 'all') queryParams.append('source', filters.source);
      if (filters.sortBy) queryParams.append('sort', `${filters.sortOrder === 'desc' ? '-' : ''}${filters.sortBy}`);

      const endpoint = `/vendors/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          leads: Lead[];
          pagination: any;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to fetch vendor leads");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch leads";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getVendorLeadStats(): Promise<LeadStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: LeadStats;
      }>("/vendors/lead-stats");

      if (response.success && response.data) {
        return response.data;
      }

      // Return default stats if endpoint doesn't exist yet
      return {
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        avgResponseTime: "Not calculated",
        avgLeadScore: 0
      };
    } catch (error) {
      console.error("Failed to fetch lead stats:", error);
      // Return default stats on error
      return {
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        avgResponseTime: "Not calculated",
        avgLeadScore: 0
      };
    }
  }

  async updateLeadStatus(leadId: string, status: Lead['status']): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Lead status updated to ${status}!`,
        });
      } else {
        throw new Error("Failed to update lead status");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update lead status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateLeadPriority(leadId: string, priority: Lead['priority']): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ priority }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Lead priority updated to ${priority}!`,
        });
      } else {
        throw new Error("Failed to update lead priority");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update lead priority";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async respondToLead(leadId: string, responseMessage: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/${leadId}/respond`, {
        method: "POST",
        body: JSON.stringify({ message: responseMessage }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Response sent successfully!",
        });
      } else {
        throw new Error("Failed to send response");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send response";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  formatName(lead: Lead): string {
    return `${lead.sender.profile.firstName} ${lead.sender.profile.lastName}`;
  }

  formatPrice(price: number, listingType: 'sale' | 'rent'): string {
    if (listingType === 'rent') return `₹${price.toLocaleString('en-IN')}/month`;
    
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString('en-IN')}`;
  }

  getStatusColor(status: Lead['status']): string {
    switch (status) {
      case "unread": return "bg-red-500";
      case "read": return "bg-yellow-500";
      case "responded": return "bg-blue-500";
      case "qualified": return "bg-purple-500";
      case "converted": return "bg-green-500";
      case "rejected": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  }

  getPriorityColor(priority: Lead['priority']): string {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }

  getStatusText(status: Lead['status']): string {
    switch (status) {
      case "unread": return "New";
      case "read": return "Read";
      case "responded": return "Contacted";
      case "qualified": return "Qualified";
      case "converted": return "Converted";
      case "rejected": return "Rejected";
    }
  }

  getPriorityText(priority: Lead['priority']): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  calculateLeadScore(lead: Lead): number {
    // Simple lead scoring algorithm
    let score = 50; // Base score

    // Score based on budget match (if property exists)
    if (lead.property && lead.budget) {
      const propertyPrice = lead.property.price;
      const budgetMid = (lead.budget.min + lead.budget.max) / 2;
      const priceDiff = Math.abs(propertyPrice - budgetMid) / propertyPrice;
      score += (1 - priceDiff) * 30; // Up to 30 points for budget match
    }

    // Score based on response time
    const daysSinceCreated = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 1) score += 20; // Fresh leads get bonus points

    // Score based on message quality
    if (lead.message.length > 50) score += 10; // Detailed messages get bonus

    return Math.min(Math.max(Math.round(score), 0), 100);
  }
}

export const leadService = new LeadService();
export default leadService;