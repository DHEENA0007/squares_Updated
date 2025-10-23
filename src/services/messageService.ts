import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      avatar?: string;
    };
  };
  recipient: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      avatar?: string;
    };
  };
  subject?: string;
  message: string;
  type: 'inquiry' | 'lead' | 'property_inquiry' | 'contact' | 'general';
  status: 'unread' | 'read' | 'responded';
  priority: 'low' | 'medium' | 'high';
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
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      avatar?: string;
    };
  }>;
  lastMessage: Message;
  unreadCount: number;
  property?: {
    _id: string;
    title: string;
    price: number;
    listingType: 'sale' | 'rent';
  };
  createdAt: string;
  updatedAt: string;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class MessageService {
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
      console.error("Message API request failed:", error);
      throw error;
    }
  }

  async getConversations(filters: MessageFilters = {}): Promise<{
    conversations: Conversation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalConversations: number;
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
      if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);

      const endpoint = `/messages/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          conversations: Conversation[];
          pagination: any;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to fetch conversations");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversations";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<{
    messages: Message[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMessages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const endpoint = `/messages/conversations/${conversationId}/messages?${queryParams.toString()}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          messages: Message[];
          pagination: any;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error("Failed to fetch conversation messages");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversation messages";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async sendMessage(conversationId: string, message: string, type: Message['type'] = 'general'): Promise<Message> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { message: Message };
      }>(`/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message, type }),
      });

      if (response.success && response.data) {
        toast({
          title: "Success",
          description: "Message sent successfully!",
        });
        return response.data.message;
      }

      throw new Error("Failed to send message");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/${messageId}/read`, {
        method: "PATCH",
      });

      if (!response.success) {
        throw new Error("Failed to mark message as read");
      }
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      // Don't show toast for this - it should be silent
    }
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/conversations/${conversationId}/read`, {
        method: "PATCH",
      });

      if (!response.success) {
        throw new Error("Failed to mark conversation as read");
      }
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
      // Don't show toast for this - it should be silent
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/${messageId}`, {
        method: "DELETE",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Message deleted successfully!",
        });
      } else {
        throw new Error("Failed to delete message");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/messages/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Conversation deleted successfully!",
        });
      } else {
        throw new Error("Failed to delete conversation");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete conversation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  formatName(user: { profile: { firstName: string; lastName: string } }): string {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} day ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  formatPrice(price: number, listingType: 'sale' | 'rent'): string {
    if (listingType === 'rent') {
      return `₹${price.toLocaleString('en-IN')}/month`;
    } else {
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(1)} L`;
      } else {
        return `₹${price.toLocaleString('en-IN')}`;
      }
    }
  }

  getPriorityColor(priority: Message['priority']): string {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }

  getStatusColor(status: Message['status']): string {
    switch (status) {
      case "unread": return "bg-red-500";
      case "read": return "bg-yellow-500";
      case "responded": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }
}

export const messageService = new MessageService();
export default messageService;