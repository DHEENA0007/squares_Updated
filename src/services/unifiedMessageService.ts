import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface MessageUser {
  _id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'subadmin' | 'vendor' | 'customer';
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    phone?: string;
  };
}

export interface MessageProperty {
  _id: string;
  title: string;
  price: number;
  listingType: 'sale' | 'rent' | 'lease';
  address: {
    city: string;
    state: string;
    street?: string;
  };
  images: string[];
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  sender: MessageUser;
  receiver: MessageUser;
  content: string;
  type: 'text' | 'property_inquiry' | 'auto_response' | 'system';
  property?: MessageProperty;
  attachments: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
    size?: number;
  }>;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface Conversation {
  _id: string;
  id: string;
  participants: MessageUser[];
  property?: MessageProperty;
  lastMessage: {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  isTyping: boolean;
}

export interface ConversationFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'unread' | 'archived' | 'pinned';
  userId?: string;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

class UnifiedMessageService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem("token");

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // === CONVERSATION MANAGEMENT ===
  
  async getConversations(filters: ConversationFilters = {}): Promise<{
    conversations: Conversation[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/messages/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<{ success: boolean; data: any }>(endpoint);

      if (response.success) {
        return response.data;
      }

      throw new Error("Failed to fetch conversations");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversations";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { conversation: Conversation } }>(
        `/messages/conversations/${conversationId}`
      );

      if (response.success) {
        return response.data.conversation;
      }

      throw new Error("Failed to fetch conversation");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async createConversation(recipientId: string, propertyId?: string, initialMessage?: string): Promise<Conversation> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { conversation: Conversation } }>(
        `/messages/conversations`,
        {
          method: "POST",
          body: JSON.stringify({ recipientId, propertyId, initialMessage }),
        }
      );

      if (response.success) {
        return response.data.conversation;
      }

      throw new Error("Failed to create conversation");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  // === MESSAGE MANAGEMENT ===

  async getMessages(conversationId: string, filters: MessageFilters = {}): Promise<{
    messages: ChatMessage[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/messages/conversations/${conversationId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<{ success: boolean; data: any }>(endpoint);

      if (response.success) {
        return response.data;
      }

      throw new Error("Failed to fetch messages");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch messages";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    attachments: Array<{ type: 'image' | 'document'; url: string; name: string; size?: number }> = []
  ): Promise<ChatMessage> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { message: ChatMessage } }>(
        `/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content, attachments }),
        }
      );

      if (response.success) {
        return response.data.message;
      }

      throw new Error("Failed to send message");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async sendPropertyInquiry(propertyId: string, message: string, recipientId?: string): Promise<{
    conversation: Conversation;
    message: ChatMessage;
  }> {
    try {
      const response = await this.makeRequest<{ 
        success: boolean; 
        data: { conversation: Conversation; message: ChatMessage } 
      }>(
        `/messages/property-inquiry`,
        {
          method: "POST",
          body: JSON.stringify({ propertyId, message, recipientId }),
        }
      );

      if (response.success) {
        toast({ title: "Success", description: "Message sent successfully" });
        return response.data;
      }

      throw new Error("Failed to send property inquiry");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send property inquiry";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  // === READ RECEIPTS ===

  async markAsRead(conversationId: string, messageIds?: string[]): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/read`,
        {
          method: "PATCH",
          body: JSON.stringify({ messageIds }),
        }
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  // === TYPING INDICATORS ===

  async setTypingStatus(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/typing`,
        {
          method: "POST",
          body: JSON.stringify({ isTyping }),
        }
      );
    } catch (error) {
      console.error("Failed to set typing status:", error);
    }
  }

  // === PRESENCE ===

  async getUserPresence(userId: string): Promise<UserPresence> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { presence: UserPresence } }>(
        `/messages/presence/${userId}`
      );

      if (response.success) {
        return response.data.presence;
      }

      return {
        userId,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        isTyping: false,
      };
    } catch (error) {
      return {
        userId,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        isTyping: false,
      };
    }
  }

  async updatePresence(status: 'online' | 'offline' | 'away'): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/presence`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        }
      );
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }

  // === FILE UPLOAD ===

  async uploadAttachment(file: File): Promise<{ type: 'image' | 'document'; url: string; name: string; size: number }> {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    try {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size must be less than 10MB");
      }

      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

      const isImage = imageTypes.includes(file.type);
      const isDocument = documentTypes.includes(file.type);

      if (!isImage && !isDocument) {
        throw new Error("File type not supported");
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'messages');

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/upload/single`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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
      toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  // === CONVERSATION ACTIONS ===

  async pinConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/pin`,
        { method: "PATCH" }
      );
      toast({ title: "Success", description: "Conversation pinned" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to pin conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async unpinConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/unpin`,
        { method: "PATCH" }
      );
      toast({ title: "Success", description: "Conversation unpinned" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unpin conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async archiveConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/archive`,
        { method: "PATCH" }
      );
      toast({ title: "Success", description: "Conversation archived" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to archive conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async unarchiveConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}/unarchive`,
        { method: "PATCH" }
      );
      toast({ title: "Success", description: "Conversation unarchived" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unarchive conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.makeRequest(
        `/messages/conversations/${conversationId}`,
        { method: "DELETE" }
      );
      toast({ title: "Success", description: "Conversation deleted" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete conversation";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw error;
    }
  }

  // === SEARCH ===

  async searchUsers(query: string, role?: string): Promise<MessageUser[]> {
    try {
      const queryParams = new URLSearchParams({ q: query });
      if (role) queryParams.append('role', role);

      const response = await this.makeRequest<{ success: boolean; data: { users: MessageUser[] } }>(
        `/messages/search/users?${queryParams.toString()}`
      );

      if (response.success) {
        return response.data.users;
      }

      return [];
    } catch (error) {
      console.error("Failed to search users:", error);
      return [];
    }
  }

  async searchMessages(conversationId: string, query: string): Promise<ChatMessage[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; data: { messages: ChatMessage[] } }>(
        `/messages/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`
      );

      if (response.success) {
        return response.data.messages;
      }

      return [];
    } catch (error) {
      console.error("Failed to search messages:", error);
      return [];
    }
  }

  // === UTILITY METHODS ===

  getOtherUser(conversation: Conversation, currentUserId: string): MessageUser | null {
    return conversation.participants.find(p => p._id !== currentUserId) || null;
  }

  formatUserName(user: MessageUser): string {
    return `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.email;
  }

  formatTime(dateString: string): string {
    if (!dateString) return 'Just now';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Just now';

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();

      if (diffInMs < 0) return 'Just now';

      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Just now';
    }
  }

  formatPrice(price: number, listingType: 'sale' | 'rent' | 'lease'): string {
    const suffix = listingType === 'rent' ? '/month' : listingType === 'lease' ? '/year' : '';
    
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr${suffix}`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L${suffix}`;
    } else {
      return `₹${price.toLocaleString('en-IN')}${suffix}`;
    }
  }

  getUserInitials(user: MessageUser): string {
    const firstName = user.profile.firstName || '';
    const lastName = user.profile.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    } else if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    
    return 'U';
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'subadmin':
        return 'bg-orange-100 text-orange-800';
      case 'vendor':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

export const unifiedMessageService = new UnifiedMessageService();
export default unifiedMessageService;
