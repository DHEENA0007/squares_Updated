import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface RealtimeEvent {
  type: 'favorite_added' | 'favorite_removed' | 'message_received' | 'property_updated' | 
        'new_message' | 'message_read' | 'message_updated' | 'message_deleted' |
        'typing_indicator' | 'conversation_updated' | 'user_online' | 'user_offline' |
        'property_viewed' | 'property_favorited' | 'property_inquiry' |
        'review_created' | 'review_updated' | 'review_deleted' | 'review_replied' |
        'service_booking_created' | 'service_booking_updated';
  data: any;
  timestamp: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  emit: (event: RealtimeEvent) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
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

  // Simulate WebSocket connection (in a real app, this would be actual WebSocket)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      return;
    }

    // Simulate connection
    setIsConnected(true);

    // Simulate periodic events for demo purposes
    const eventInterval = setInterval(() => {
      // Randomly emit events to simulate real-time activity
      const eventTypes = [
        'favorite_added', 
        'message_received', 
        'property_updated', 
        'property_viewed', 
        'property_inquiry', 
        'property_favorited'
      ];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)] as RealtimeEvent['type'];
      
      const mockEvent: RealtimeEvent = {
        type: randomType,
        data: {
          id: Math.random().toString(36).substr(2, 9),
          propertyId: Math.random().toString(36).substr(2, 9),
          message: `Mock ${randomType} event`,
          action: randomType.includes('favorited') ? (Math.random() > 0.5 ? 'add' : 'remove') : undefined
        },
        timestamp: new Date().toISOString()
      };

      // Only emit occasionally to not overwhelm
      if (Math.random() > 0.85) {
        handleEvent(mockEvent);
      }
    }, 8000); // Every 8 seconds

    return () => {
      clearInterval(eventInterval);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const handleEvent = (event: RealtimeEvent) => {
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
  };

  const emit = (event: RealtimeEvent) => {
    handleEvent(event);
  };

  const subscribe = (eventType: string, callback: (data: any) => void) => {
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
  };

  return (
    <RealtimeContext.Provider 
      value={{ 
        isConnected, 
        lastEvent, 
        emit, 
        subscribe 
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
}) => {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribeNewMessage = subscribe('new_message', (data) => {
      refreshCallbacks.refreshConversations?.();
      refreshCallbacks.onNewMessage?.(data);
    });

    const unsubscribeMessageReceived = subscribe('message_received', (data) => {
      refreshCallbacks.refreshConversations?.();
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeMessageRead = subscribe('message_read', (data) => {
      refreshCallbacks.onMessageRead?.(data);
    });

    const unsubscribeMessageUpdated = subscribe('message_updated', (data) => {
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeMessageDeleted = subscribe('message_deleted', (data) => {
      refreshCallbacks.refreshMessages?.();
    });

    const unsubscribeTyping = subscribe('typing_indicator', (data) => {
      refreshCallbacks.onTypingIndicator?.(data);
    });

    const unsubscribeConversationUpdated = subscribe('conversation_updated', (data) => {
      refreshCallbacks.refreshConversations?.();
    });

    const unsubscribeUserOnline = subscribe('user_online', (data) => {
      refreshCallbacks.onUserStatusChange?.(data);
    });

    const unsubscribeUserOffline = subscribe('user_offline', (data) => {
      refreshCallbacks.onUserStatusChange?.(data);
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageReceived();
      unsubscribeMessageRead();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      unsubscribeTyping();
      unsubscribeConversationUpdated();
      unsubscribeUserOnline();
      unsubscribeUserOffline();
    };
  }, [refreshCallbacks]);
};