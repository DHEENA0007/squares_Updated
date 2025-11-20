import { toast } from "@/hooks/use-toast";
import { uploadService } from "@/services/uploadService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

export interface Message {
  _id: string;
  sender: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  receiver: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  content: string;
  message?: string;
  type?: 'auto_response' | 'inquiry' | 'lead' | 'property_inquiry' | 'general';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'unread' | 'read' | 'responded' | 'archived';
  property?: {
    _id: string;
    title: string;
  };
  timestamp: string;
  createdAt?: string;
  read: boolean;
  isRead?: boolean; // Alias for read
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    name: string;
    size?: number;
  }>;
}

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  isTyping?: boolean;
}

export interface TypingStatus {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}export interface Conversation {
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
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      
      if (!content?.trim() && (!attachments || attachments.length === 0)) {
        throw new Error('Message content or attachments are required');
      }

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
          content: content.trim(),
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
    try {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error("File size must be less than 10MB");
      }

      // Validate file type
      const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const isImage = imageTypes.includes(file.type);
      const isDocument = documentTypes.includes(file.type);
      
      if (!isImage && !isDocument) {
        throw new Error("File type not supported. Please upload images (jpg, png, gif, webp) or documents (pdf, doc, docx)");
      }

      // Use uploadService for file upload
      const result = await uploadService.uploadSingle(file, 'messages');

      return {
        type: isImage ? 'image' : 'document',
        url: result.data.url,
        name: file.name,
        size: file.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      console.error(`Failed to upload ${file.name}:`, errorMessage);
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

    async updateTypingStatus(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      if (!conversationId) {
        console.warn('Cannot update typing status: conversationId is missing');
        return;
      }

      await this.makeRequest<{
        success: boolean;
        data: { userId: string; conversationId: string; isTyping: boolean };
      }>(`/messages/typing-status`, {
        method: "POST",
        body: JSON.stringify({ conversationId, isTyping }),
      });
    } catch (error) {
      console.error("Failed to update typing status:", error);
    }
  }

  async getTypingStatus(conversationId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { isTyping: boolean; userId: string };
      }>(`/messages/typing-status/${conversationId}`);

      return response.data.isTyping;
    } catch (error) {
      console.error("Failed to get typing status:", error);
      return false;
    }
  }

  async updateOnlineStatus(status: 'online' | 'offline'): Promise<void> {
    try {
      await this.makeRequest<{
        success: boolean;
        data: { userId: string; isOnline: boolean; lastSeen: string };
      }>(`/messages/online-status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error("Failed to update online status:", error);
    }
  }

  async getUserOnlineStatus(userId: string): Promise<{ isOnline: boolean; lastSeen: Date | null }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { userId: string; isOnline: boolean; lastSeen: string | null };
      }>(`/messages/online-status/${userId}`);

      return {
        isOnline: response.data.isOnline || false,
        lastSeen: response.data.lastSeen ? new Date(response.data.lastSeen) : null
      };
    } catch (error) {
      console.error("Failed to get online status:", error);
      return { isOnline: false, lastSeen: null };
    }
  }

  async getNotificationPreferences(): Promise<{
    email: boolean;
    sms: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
    typing: boolean;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          notifications: {
            email: boolean;
            sms: boolean;
            push: boolean;
            desktop: boolean;
            sound: boolean;
            typing: boolean;
          };
        };
      }>(`/messages/notification-preferences`);

      return response.data.notifications;
    } catch (error) {
      console.error("Failed to get notification preferences:", error);
      return { email: true, sms: false, push: true, desktop: true, sound: true, typing: true };
    }
  }

  async updateNotificationPreferences(preferences: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    desktop?: boolean;
    sound?: boolean;
    typing?: boolean;
  }): Promise<void> {
    try {
      await this.makeRequest<{
        success: boolean;
        data: { notifications: any };
      }>(`/messages/notification-preferences`, {
        method: "PUT",
        body: JSON.stringify(preferences),
      });
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { unreadCount: number };
      }>(`/messages/unread-count`);

      return response.data.unreadCount;
    } catch (error) {
      console.error("Failed to get unread count:", error);
      return 0;
    }
  }

  async updateActiveStatus(conversationId: string, status: 'typing' | 'online' | 'offline'): Promise<void> {
    try {
      // Skip active status updates if conversationId is missing or empty
      if (!conversationId) {
        console.warn('Cannot update active status: conversationId is missing');
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
        console.error("Failed to update active status:", response.message);
      }
    } catch (error) {
      // Check if the error is about admin conversations (different architecture)
      if (error instanceof Error && error.message.includes('admin')) {
        console.warn('Active status not available for admin conversations');
      } else {
        console.error("Failed to update active status:", error);
      }
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

  async markAsRead(conversationId: string, messageIds?: string[]): Promise<void> {
    try {
      await this.markConversationAsRead(conversationId);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async getUserStatus(userId: string): Promise<UserStatus> {
    try {
      const onlineStatus = await this.getUserOnlineStatus(userId);
      
      return {
        userId,
        isOnline: onlineStatus.isOnline,
        lastSeen: onlineStatus.lastSeen ? onlineStatus.lastSeen.toISOString() : new Date().toISOString(),
        isTyping: false
      };
    } catch (error) {
      console.error("Failed to get user status:", error);
      return {
        userId,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        isTyping: false
      };
    }
  }

  async setTypingStatus(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      await this.updateTypingStatus(conversationId, isTyping);
    } catch (error) {
      console.error("Failed to set typing status:", error);
    }
  }

  async updateUserActivity(status: 'online' | 'offline' | 'idle' = 'online'): Promise<void> {
    try {
      const apiStatus = status === 'online' ? 'online' : 'offline';
      await this.updateOnlineStatus(apiStatus);
    } catch (error) {
      console.error("Failed to update user activity:", error);
    }
  }

  formatTime(dateString: string): string {
    if (!dateString) return 'recently';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'recently';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      
      // Handle future dates (clock skew)
      if (diffInMs < 0) return 'Just now';
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hr ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      
      // Format as date for older timestamps
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting time:', error, dateString);
      return 'recently';
    }
  }

  formatPrice(price: number, listingType: 'sale' | 'rent'): string {
    if (listingType === 'rent') return `₹${price.toLocaleString('en-IN')}/month`;
    
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString('en-IN')}`;
  }

  getPriorityColor(priority?: 'low' | 'medium' | 'high' | 'urgent'): string {
    switch (priority) {
      case "high":
      case "urgent":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  }

  getStatusColor(status?: 'unread' | 'read' | 'responded' | 'archived'): string {
    switch (status) {
      case "unread":
        return "bg-red-500";
      case "read":
        return "bg-yellow-500";
      case "responded":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  }

  // Send auto-response message
  async sendAutoResponse(conversationId: string, recipientId: string, autoResponseMessage: string): Promise<Message | null> {
    try {
      const autoResponseText = `🤖 ${autoResponseMessage}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: { message: Message };
      }>(`/messages`, {
        method: "POST",
        body: JSON.stringify({ 
          conversationId,
          recipientId,
          content: autoResponseText,
          type: 'auto_response',
          attachments: []
        }),
      });

      if (response.success && response.data) {
        console.log("Auto-response sent successfully:", response.data.message._id);
        return response.data.message;
      }

      throw new Error("Failed to send auto-response");
    } catch (error) {
      console.error("Failed to send auto-response:", error);
      return null;
    }
  }

  // Check if a message is an auto-response
  isAutoResponse(message: Message): boolean {
    return message.type === 'auto_response' || 
           ((message.message || message.content) && 
            ((message.message || message.content).startsWith('🤖') ||
             (message.message || message.content).toLowerCase().includes('auto-response') ||
             (message.message || message.content).toLowerCase().includes('automatic response') ||
             (message.message || message.content).toLowerCase().includes('i\'ll get back to you')));
  }

  // Get auto-response indicator
  getAutoResponseIndicator(): string {
    return "🤖"; // Robot emoji to indicate auto-response
  }
}

export const messageService = new MessageService();
export { MessageService };
export default messageService;