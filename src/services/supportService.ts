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

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://app.buildhomemartsquares.com';
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
      const formData = new FormData();
      
      // Append text fields
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('phone', data.phone || '');
      formData.append('subject', data.subject);
      formData.append('category', data.category);
      formData.append('priority', data.priority || 'medium');
      formData.append('description', data.description);

      // Append attachments if any
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await this.makeRequest<SingleTicketResponse>('/support/tickets', {
        method: 'POST',
        body: formData,
      });

      const attachmentCount = data.attachments?.length || 0;
      const attachmentText = attachmentCount > 0 
        ? ` with ${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}`
        : '';

      toast({
        title: "Success",
        description: `Support ticket #${response.data.ticket.ticketNumber} created successfully${attachmentText}!`,
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

  async getTicketByNumberAuth(ticketNumber: string): Promise<SingleTicketResponse> {
    try {
      const response = await this.makeRequest<SingleTicketResponse>(`/support/tickets/${ticketNumber}`);
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
