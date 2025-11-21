import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '@/services/notificationService';
import { socketService, SocketMessage, TypingIndicator, UserStatus, MessageReadReceipt } from '@/services/socketService';

interface RealtimeEvent {
  type: 'favorite_added' | 'favorite_removed' | 'message_received' | 'property_updated' | 
        'new_message' | 'message_read' | 'message_updated' | 'message_deleted' |
        'typing_indicator' | 'conversation_updated' | 'user_online' | 'user_offline' |
        'property_viewed' | 'property_favorited' | 'property_inquiry' |
        'review_created' | 'review_updated' | 'review_deleted' | 'review_replied' |
        'service_booking_created' | 'service_booking_updated' |
        'property_alert' | 'price_alert' | 'property_update' | 'service_update' |
        'lead_alert' | 'inquiry_received' | 'weekly_report' | 'business_update' |
        'connection' | 'broadcast' | 'announcement' | 'test' |
        'property_approved' | 'property_rejected' | 'property_reactivated' |
        'support_ticket_created' | 'support_ticket_updated' | 'property_created' |
        'user_typing' | 'user_status_changed' | 'message_notification' | 'conversation_read';
  data: any;
  timestamp: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  emit: (event: RealtimeEvent) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  // Socket-specific methods
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: { conversationId: string; recipientId: string; content: string; attachments?: any[]; tempId?: string }) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markMessageAsRead: (messageId: string, conversationId: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  updateOnlineStatus: (status: 'online' | 'offline' | 'away') => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [eventListeners, setEventListeners] = useState<Map<string, ((data: any) => void)[]>>(new Map());

  // Connect to services
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      socketService.disconnect();
      return;
    }

    // Connect to Socket.IO for real-time messaging and notifications
    let socketConnected = false;
    socketService.connect()
      .then(() => {
        console.log('✅ Socket.IO connected successfully');
        socketConnected = true;
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('❌ Failed to connect to Socket.IO:', error);
      });

    // Subscribe to socket events
    const unsubscribeNewMessage = socketService.on('new_message', (data: { message: SocketMessage; conversationId: string }) => {
      handleEvent({
        type: 'new_message',
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    const unsubscribeMessageNotification = socketService.on('message_notification', (data: any) => {
      handleEvent({
        type: 'message_notification',
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    const unsubscribeTyping = socketService.on('user_typing', (data: TypingIndicator) => {
      handleEvent({
        type: 'user_typing',
        data: data,
        timestamp: data.timestamp
      });
    });

    const unsubscribeReadReceipt = socketService.on('message_read_receipt', (data: MessageReadReceipt) => {
      handleEvent({
        type: 'message_read',
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    const unsubscribeConversationRead = socketService.on('conversation_read', (data: any) => {
      handleEvent({
        type: 'conversation_read',
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    const unsubscribeUserStatus = socketService.on('user_status_changed', (data: UserStatus) => {
      handleEvent({
        type: data.isOnline ? 'user_online' : 'user_offline',
        data: data,
        timestamp: data.lastSeen
      });
    });

    // Check connection status periodically
    const checkConnection = setInterval(() => {
      const notificationConnected = notificationService.isConnected();
      const socketConnectedNow = socketService.isConnected();
      setIsConnected(notificationConnected || socketConnectedNow);
    }, 3000);

    // Send periodic activity ping
    const activityPing = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.sendUserActivity();
      }
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageNotification();
      unsubscribeTyping();
      unsubscribeReadReceipt();
      unsubscribeConversationRead();
      unsubscribeUserStatus();
      clearInterval(checkConnection);
      clearInterval(activityPing);
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    setLastEvent(event);
    
    // Notify all listeners for this event type
    const listeners = eventListeners.get(event.type) || [];
    listeners.forEach(callback => {
      try {
        callback(event.data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });

    // Also notify 'all' listeners
    const allListeners = eventListeners.get('all') || [];
    allListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }, [eventListeners]);

  const emit = useCallback((event: RealtimeEvent) => {
    handleEvent(event);
  }, [handleEvent]);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    setEventListeners(prev => {
      const newMap = new Map(prev);
      const existingListeners = newMap.get(eventType) || [];
      newMap.set(eventType, [...existingListeners, callback]);
      return newMap;
    });

    // Return unsubscribe function
    return () => {
      setEventListeners(prev => {
        const newMap = new Map(prev);
        const existingListeners = newMap.get(eventType) || [];
        const filteredListeners = existingListeners.filter(cb => cb !== callback);
        
        if (filteredListeners.length === 0) {
          newMap.delete(eventType);
        } else {
          newMap.set(eventType, filteredListeners);
        }
        
        return newMap;
      });
    };
  }, []);

  // Socket.IO methods
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketService.leaveConversation(conversationId);
  }, []);

  const sendMessage = useCallback((data: { conversationId: string; recipientId: string; content: string; attachments?: any[]; tempId?: string }) => {
    socketService.sendMessage(data);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketService.stopTyping(conversationId);
  }, []);

  const markMessageAsRead = useCallback((messageId: string, conversationId: string) => {
    socketService.markMessageAsRead(messageId, conversationId);
  }, []);

  const markConversationAsRead = useCallback((conversationId: string) => {
    socketService.markConversationAsRead(conversationId);
  }, []);

  const updateOnlineStatus = useCallback((status: 'online' | 'offline' | 'away') => {
    socketService.updateOnlineStatus(status);
  }, []);

  return (
    <RealtimeContext.Provider 
      value={{ 
        isConnected, 
        lastEvent, 
        emit, 
        subscribe,
        joinConversation,
        leaveConversation,
        sendMessage,
        startTyping,
        stopTyping,
        markMessageAsRead,
        markConversationAsRead,
        updateOnlineStatus
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

// Hook for listening to specific events
export const useRealtimeEvent = (eventType: string, callback: (data: any) => void) => {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
};

// Hook for property-specific real-time events
export const usePropertyRealtime = (refreshCallbacks: {
  refreshProperties?: () => void;
  refreshStats?: () => void;
  refreshAnalytics?: () => void;
}) => {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribePropertyViewed = subscribe('property_viewed', () => {
      refreshCallbacks.refreshProperties?.();
      refreshCallbacks.refreshStats?.();
      refreshCallbacks.refreshAnalytics?.();
    });

    const unsubscribePropertyInquiry = subscribe('property_inquiry', () => {
      refreshCallbacks.refreshProperties?.();
      refreshCallbacks.refreshStats?.();
      refreshCallbacks.refreshAnalytics?.();
    });

    const unsubscribePropertyFavorited = subscribe('property_favorited', () => {
      refreshCallbacks.refreshProperties?.();
      refreshCallbacks.refreshStats?.();
    });

    const unsubscribePropertyUpdated = subscribe('property_updated', () => {
      refreshCallbacks.refreshProperties?.();
      refreshCallbacks.refreshStats?.();
    });

    const unsubscribePropertyStatusChanged = subscribe('property_status_changed', () => {
      refreshCallbacks.refreshProperties?.();
      refreshCallbacks.refreshStats?.();
    });

    return () => {
      unsubscribePropertyViewed();
      unsubscribePropertyInquiry();
      unsubscribePropertyFavorited();
      unsubscribePropertyUpdated();
      unsubscribePropertyStatusChanged();
    };
  }, [refreshCallbacks]);
};

// Hook for messaging-specific events
export const useMessagingRealtime = (refreshCallbacks: {
  refreshConversations?: () => void;
  refreshMessages?: () => void;
  onNewMessage?: (message: any) => void;
  onTypingIndicator?: (data: any) => void;
  onMessageRead?: (data: any) => void;
  onUserStatusChange?: (data: any) => void;
  onConversationRead?: (data: any) => void;
}) => {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribeNewMessage = subscribe('new_message', (data) => {
      console.log('📨 New message event:', data);
      refreshCallbacks.refreshConversations?.();
      refreshCallbacks.onNewMessage?.(data);
    });

    const unsubscribeMessageReceived = subscribe('message_received', (data) => {
      console.log('📬 Message received event:', data);
      refreshCallbacks.refreshConversations?.();
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeMessageNotification = subscribe('message_notification', (data) => {
      console.log('🔔 Message notification:', data);
      refreshCallbacks.refreshConversations?.();
    });

    const unsubscribeMessageRead = subscribe('message_read', (data) => {
      console.log('✅ Message read event:', data);
      refreshCallbacks.onMessageRead?.(data);
    });

    const unsubscribeConversationRead = subscribe('conversation_read', (data) => {
      console.log('✅ Conversation read event:', data);
      refreshCallbacks.onConversationRead?.(data);
    });

    const unsubscribeMessageUpdated = subscribe('message_updated', (data) => {
      console.log('✏️ Message updated:', data);
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeMessageDeleted = subscribe('message_deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeTyping = subscribe('user_typing', (data) => {
      console.log('✍️ Typing indicator:', data);
      refreshCallbacks.onTypingIndicator?.(data);
    });

    const unsubscribeConversationUpdated = subscribe('conversation_updated', (data) => {
      console.log('🔄 Conversation updated:', data);
      refreshCallbacks.refreshConversations?.();
    });

    const unsubscribeUserOnline = subscribe('user_online', (data) => {
      console.log('👤 User online:', data);
      refreshCallbacks.onUserStatusChange?.(data);
    });

    const unsubscribeUserOffline = subscribe('user_offline', (data) => {
      console.log('👤 User offline:', data);
      refreshCallbacks.onUserStatusChange?.(data);
    });

    const unsubscribeUserStatus = subscribe('user_status_changed', (data) => {
      console.log('👤 User status changed:', data);
      refreshCallbacks.onUserStatusChange?.(data);
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageReceived();
      unsubscribeMessageNotification();
      unsubscribeMessageRead();
      unsubscribeConversationRead();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      unsubscribeTyping();
      unsubscribeConversationUpdated();
      unsubscribeUserOnline();
      unsubscribeUserOffline();
      unsubscribeUserStatus();
    };
  }, [subscribe, refreshCallbacks]);
};