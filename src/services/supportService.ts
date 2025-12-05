import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  category: 'technical' | 'billing' | 'property' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: string[];
  userId?: string;
  assignedTo?: {
    _id: string;
    name: string;
  };
  responses?: {
    message: string;
    author: string;
    isAdmin: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CreateTicketData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  category: string;
  priority?: string;
  description: string;
  attachments?: File[];
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
}

export interface SupportTicketResponse {
  success: boolean;
  data: {
    tickets: SupportTicket[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalTickets: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SingleTicketResponse {
  success: boolean;
  data: {
    ticket: SupportTicket;
  };
}

class SupportService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = authService.getToken();
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (token && !options.body?.toString().includes('FormData')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createTicket(data: CreateTicketData): Promise<SingleTicketResponse> {
    try {
      // Send as JSON instead of FormData
      const requestBody = {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        subject: data.subject,
        category: data.category,
        priority: data.priority || 'medium',
        description: data.description,
      };

      const response = await this.makeRequest<SingleTicketResponse>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      toast({
        title: "Success",
        description: "Support ticket created successfully! We'll get back to you soon.",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create support ticket";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getMyTickets(filters: TicketFilters = {}): Promise<SupportTicketResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/support/tickets/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<SupportTicketResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch tickets";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTicketByNumber(ticketNumber: string, email: string): Promise<SingleTicketResponse> {
    try {
      const response = await this.makeRequest<SingleTicketResponse>(`/support/tickets/track`, {
        method: 'POST',
        body: JSON.stringify({ ticketNumber, email }),
      });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch ticket";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async addResponse(ticketNumber: string, message: string): Promise<SingleTicketResponse> {
    try {
      const response = await this.makeRequest<SingleTicketResponse>(`/support/tickets/${ticketNumber}/responses`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add response";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const supportService = new SupportService();
export default supportService;
