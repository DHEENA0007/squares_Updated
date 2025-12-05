import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface AdminMessage {
  _id: string;
  sender: {
    _id: string;
    email: string;
    role: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  recipient: {
    _id: string;
    email: string;
    role: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  subject?: string;
  content: string;
  type: 'inquiry' | 'lead' | 'property_inquiry' | 'general' | 'support' | 'complaint';
  status: 'unread' | 'read' | 'replied' | 'archived' | 'flagged';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  propertyId?: string;
  property?: {
    _id: string;
    title: string;
  };
  parentMessage?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  repliedAt?: string;
}

export interface MessageStats {
  totalMessages: number;
  unreadMessages: number;
  repliedMessages: number;
  flaggedMessages: number;
  todayMessages: number;
  weeklyMessages: number;
  monthlyMessages: number;
  responseRate: number;
  avgResponseTime: string;
  messagesByType: Array<{
    _id: string;
    count: number;
  }>;
  messagesByPriority: Array<{
    _id: string;
    count: number;
  }>;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  search?: string;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: AdminMessage[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMessages: number;
      hasNext: boolean;
      hasPrev: boolean;
      limit: number;
    };
  };
}

class AdminMessageService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getMessages(filters: MessageFilters = {}): Promise<MessagesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const queryString = queryParams.toString();
      const endpoint = `/admin/messages${queryString ? `?${queryString}` : ''}`;
      
      return await this.makeRequest<MessagesResponse>(endpoint);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch messages";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getMessageStats(): Promise<MessageStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: MessageStats;
      }>("/admin/messages/stats");

      if (response.success) {
        return response.data;
      }

      throw new Error("Failed to fetch message statistics");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch message statistics";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateMessageStatus(messageId: string, status: string): Promise<AdminMessage> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { message: AdminMessage };
        message: string;
      }>(`/admin/messages/${messageId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        return response.data.message;
      }

      throw new Error("Failed to update message status");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update message status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/admin/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        return;
      }

      throw new Error("Failed to delete message");
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

  async sendReply(messageId: string, content: string, subject?: string): Promise<AdminMessage> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { reply: AdminMessage };
        message: string;
      }>(`/admin/messages/${messageId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content, subject }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        return response.data.reply;
      }

      throw new Error("Failed to send reply");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reply";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Utility methods
  getSenderName(message: AdminMessage): string {
    const profile = message.sender.profile;
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    return message.sender.email;
  }

  getRecipientName(message: AdminMessage): string {
    const profile = message.recipient.profile;
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    return message.recipient.email;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  getStatusColor(status: string): string {
    const colors = {
      unread: 'bg-blue-100 text-blue-800',
      read: 'bg-green-100 text-green-800',
      replied: 'bg-purple-100 text-purple-800',
      flagged: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }

  getPriorityColor(priority: string): string {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-green-500 text-white',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500 text-white';
  }

  getTypeDisplayName(type: string): string {
    const displayNames = {
      inquiry: 'General Inquiry',
      lead: 'Lead',
      property_inquiry: 'Property Inquiry',
      general: 'General',
      support: 'Support',
      complaint: 'Complaint',
    };
    return displayNames[type as keyof typeof displayNames] || type;
  }
}

export const adminMessageService = new AdminMessageService();
export default adminMessageService;