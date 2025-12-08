import { io, Socket } from 'socket.io-client';
import { authService } from './authService';

// Properly construct Socket.IO URL from API URL
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  // Remove /api suffix if present
  let baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Ensure it's a valid URL
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }
  
  console.log(' Socket.IO URL:', baseUrl);
  return baseUrl;
};

const SOCKET_URL = getSocketUrl();

export interface SocketMessage {
  _id: string;
  conversationId: string;
  sender: any;
  recipient: any;
  message: string;
  content?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  attachments?: any[];
  property?: any;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface MessageReadReceipt {
  messageId: string;
  conversationId: string;
  readAt: string;
  readBy: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log(' Socket already connected');
        return resolve(this.socket);
      }

      if (this.isConnecting) {
        console.log(' Connection already in progress');
        return;
      }

      const token = authService.getToken();
      if (!token) {
        console.error(' No authentication token found');
        return reject(new Error('No authentication token'));
      }

      this.isConnecting = true;

      console.log(' Connecting to Socket.IO server:', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      this.setupEventHandlers();

      this.socket.on('connect', () => {
        console.log(' Socket connected:', this.socket?.id);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error(' Socket connection error:', error.message);
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(' Max reconnection attempts reached');
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log(' Socket disconnected:', reason);
        this.isConnecting = false;

        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      });
    });
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (data: { message: SocketMessage; conversationId: string }) => {
      console.log(' New message received:', data);
      this.emit('new_message', data);
    });

    // Message notification
    this.socket.on('message_notification', (data: any) => {
      console.log(' Message notification:', data);
      this.emit('message_notification', data);
    });

    // General notification (Push)
    this.socket.on('notification', (data: any) => {
      console.log(' Notification received:', data);
      this.emit('notification', data);
    });

    // Typing indicator
    this.socket.on('user_typing', (data: TypingIndicator) => {
      console.log(' User typing:', data);
      this.emit('user_typing', data);
    });

    // Message read receipt
    this.socket.on('message_read_receipt', (data: MessageReadReceipt) => {
      console.log(' Message read:', data);
      this.emit('message_read_receipt', data);
    });

    // Conversation read
    this.socket.on('conversation_read', (data: any) => {
      console.log(' Conversation read:', data);
      this.emit('conversation_read', data);
    });

    // User status changed
    this.socket.on('user_status_changed', (data: UserStatus) => {
      console.log(' User status changed:', data);
      this.emit('user_status_changed', data);
    });

    // User joined conversation
    this.socket.on('user_joined_conversation', (data: any) => {
      console.log(' User joined conversation:', data);
      this.emit('user_joined_conversation', data);
    });

    // User left conversation
    this.socket.on('user_left_conversation', (data: any) => {
      console.log(' User left conversation:', data);
      this.emit('user_left_conversation', data);
    });

    // Message sent confirmation
    this.socket.on('message_sent', (data: any) => {
      console.log(' Message sent:', data);
      this.emit('message_sent', data);
    });

    // Message error
    this.socket.on('message_error', (data: any) => {
      console.error(' Message error:', data);
      this.emit('message_error', data);
    });

    // Online users status
    this.socket.on('online_users_status', (data: Record<string, boolean>) => {
      console.log(' Online users status:', data);
      this.emit('online_users_status', data);
    });

    // Vendor-specific events
    this.socket.on('vendor:activities_updated', (data: any) => {
      console.log(' Vendor activities updated:', data);
      this.emit('vendor:activities_updated', data);
    });

    this.socket.on('vendor:leads_updated', (data: any) => {
      console.log(' Vendor leads updated:', data);
      this.emit('vendor:leads_updated', data);
    });

    this.socket.on('vendor:new_inquiry', (data: any) => {
      console.log(' Vendor new inquiry:', data);
      this.emit('vendor:new_inquiry', data);
    });

    this.socket.on('vendor:property_viewed', (data: any) => {
      console.log(' Vendor property viewed:', data);
      this.emit('vendor:property_viewed', data);
    });

    this.socket.on('vendor:property_updated', (data: any) => {
      console.log(' Vendor property updated:', data);
      this.emit('vendor:property_updated', data);
    });

    // Error
    this.socket.on('error', (error: any) => {
      console.error(' Socket error:', error);
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log(' Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  // Join conversation room
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected, cannot join conversation');
      return;
    }

    console.log('🚪 Joining conversation:', conversationId);
    this.socket.emit('join_conversation', conversationId);
  }

  // Leave conversation room
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) return;

    console.log('🚪 Leaving conversation:', conversationId);
    this.socket.emit('leave_conversation', conversationId);
  }

  // Send message
  sendMessage(data: {
    conversationId: string;
    recipientId: string;
    content: string;
    attachments?: any[];
    tempId?: string;
  }) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected, cannot send message');
      throw new Error('Socket not connected');
    }

    console.log('📤 Sending message:', data);
    this.socket.emit('send_message', data);
  }

  // Typing indicators
  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('typing_stop', { conversationId });
  }

  // Mark message as read
  markMessageAsRead(messageId: string, conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('message_read', { messageId, conversationId });
  }

  // Mark conversation as read
  markConversationAsRead(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('conversation_read', { conversationId });
  }

  // Update online status
  updateOnlineStatus(status: 'online' | 'offline' | 'away') {
    if (!this.socket?.connected) return;

    this.socket.emit('update_online_status', { status });
  }

  // User activity ping
  sendUserActivity() {
    if (!this.socket?.connected) return;

    this.socket.emit('user_activity', { timestamp: new Date().toISOString() });
  }

  // Get online users
  getOnlineUsers(userIds: string[]) {
    if (!this.socket?.connected) return;

    this.socket.emit('get_online_users', { userIds });
  }

  // Event subscription system
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced use cases)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
