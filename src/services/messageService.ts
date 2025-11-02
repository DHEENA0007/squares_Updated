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
  type?: 'inquiry' | 'lead' | 'property_inquiry' | 'contact' | 'general';
  status?: 'unread' | 'read' | 'responded';
  priority?: 'low' | 'medium' | 'high';
  read: boolean;
  property?: {
    _id: string;
    title: string;
    price: number;
    listingType?: 'sale' | 'rent';
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
  id: string; // This is the conversationId
  _id?: string; // Alias for id
  property?: {
    _id: string;
    title: string;
    price: number;
    address: string;
    city: string;
    state: string;
    images?: string[];
  };
  otherUser: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  lastMessage: {
    _id: string;
    message: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
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

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50, markAsRead: boolean = true): Promise<{
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
      queryParams.append('markAsRead', markAsRead.toString());

      const endpoint = `/messages/conversation/${conversationId}?${queryParams.toString()}`;
      
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

  async sendMessage(conversationId: string, content: string, recipientId?: string, attachments?: Array<{type: 'image' | 'document'; url: string; name: string; size?: number}>): Promise<Message> {
    try {
      // If recipientId is not provided, we need to extract it from the conversationId
      let recipient = recipientId;
      
      if (!recipient) {
        // Extract the other user ID from conversationId (format: userId1_userId2)
        const userIds = conversationId.split('_');
        const currentUserId = localStorage.getItem('userId'); // Assuming userId is stored
        
        recipient = userIds.find(id => id !== currentUserId);
        
        if (!recipient) {
          throw new Error('Unable to determine recipient');
        }
      }

      const response = await this.makeRequest<{
        success: boolean;
        data: { message: Message };
      }>(`/messages`, {
        method: "POST",
        body: JSON.stringify({ 
          conversationId,
          recipientId: recipient,
          content,
          attachments: attachments || []
        }),
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

  async uploadAttachment(file: File): Promise<{type: 'image' | 'document'; url: string; name: string; size: number}> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    
    try {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error("File size must be less than 10MB");
      }

      // Validate file type
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const isImage = imageTypes.includes(file.type);
      const isDocument = documentTypes.includes(file.type);
      
      if (!isImage && !isDocument) {
        throw new Error("File type not supported. Please upload images (jpg, png, gif) or documents (pdf, doc, docx)");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'messages');

      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/upload/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to upload file');
      }

      return {
        type: isImage ? 'image' : 'document',
        url: result.data.url,
        name: file.name,
        size: file.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Send a property inquiry message (creates conversation if needed)
  static async sendPropertyInquiry(propertyId: string, subject: string, message: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Error',
          description: 'Please login to send messages',
          variant: 'destructive'
        });
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/messages/property-inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propertyId,
          subject,
          content: message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      toast({
        title: 'Success',
        description: 'Message sent successfully'
      });
      return data.data;
    } catch (error: any) {
      console.error('Error sending property inquiry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
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
      }>(`/messages/conversation/${conversationId}/read`, {
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

  async markSingleMessageAsRead(messageId: string): Promise<{ messageId: string; read: boolean; readAt: string } | undefined> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: {
          messageId: string;
          read: boolean;
          readAt: string;
        };
      }>(`/messages/${messageId}/read`, {
        method: "PATCH",
      });

      if (!response.success) {
        throw new Error("Failed to mark message as read");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      // Don't show toast for this - it should be silent
    }
  }

  async updateActiveStatus(conversationId: string, status: 'typing' | 'online' | 'offline'): Promise<void> {
    try {
      // Skip active status updates if conversationId is missing or empty
      if (!conversationId) {
        console.log("Skipping active status update: No conversation ID provided");
        return;
      }

      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: {
          userId: string;
          conversationId: string;
          status: string;
          timestamp: string;
        };
      }>(`/messages/active-status`, {
        method: "POST",
        body: JSON.stringify({ conversationId, status }),
      });

      if (!response.success) {
        throw new Error("Failed to update active status");
      }
    } catch (error) {
      // Check if the error is about admin conversations (different architecture)
      if (error.message?.includes('Conversation ID and status are required') || 
          error.message?.includes('not part of this conversation')) {
        console.log("Skipping active status update for admin conversation");
        return;
      }
      
      console.error("Failed to update active status:", error);
      // Don't show toast for this - it should be silent
    }
  }

  async getActiveStatus(conversationId: string): Promise<Record<string, { status: string; lastSeen: string }>> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          statuses: Record<string, { status: string; lastSeen: string }>;
        };
      }>(`/messages/active-status/${conversationId}`);

      if (response.success) {
        return response.data.statuses;
      }

      return {};
    } catch (error) {
      console.error("Failed to get active status:", error);
      return {};
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
export { MessageService };
export default messageService;