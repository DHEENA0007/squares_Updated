import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  messageService,
  Message,
  Conversation,
  MessageFilters
} from '@/services/messageService';
import { useRealtime, useRealtimeEvent } from '@/contexts/RealtimeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalConversations: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalConversations: number;
    unreadConversations: number;
    archivedConversations: number;
    totalUnreadMessages: number;
  };
  filters: MessageFilters;
  setFilters: (filters: MessageFilters) => void;
  refreshConversations: () => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string, archived?: boolean) => Promise<void>;
  pinConversation: (conversationId: string, pinned?: boolean) => Promise<void>;
  muteConversation: (conversationId: string, muted?: boolean) => Promise<void>;
  isConnected: boolean;
  lastUpdated: Date | null;
}

export const useConversations = (
  initialFilters: MessageFilters = {},
  autoRefresh: boolean = true
): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalConversations: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [stats, setStats] = useState({
    totalConversations: 0,
    unreadConversations: 0,
    archivedConversations: 0,
    totalUnreadMessages: 0,
  });
  const [filters, setFilters] = useState<MessageFilters>(initialFilters);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isConnected } = useRealtime();
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConversations = useCallback(async (showLoading = true) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await messageService.getConversations(filters);
      
      // The service returns data directly, not wrapped in success/data
      setConversations(response.conversations);
      setPagination(response.pagination);
      // Create mock stats since they're not provided by the service
      setStats({
        totalConversations: response.pagination.totalConversations,
        unreadConversations: response.conversations.filter(c => c.unreadCount > 0).length,
        archivedConversations: 0, // Not implemented in service
        totalUnreadMessages: response.conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Failed to fetch conversations';
        setError(errorMessage);
        console.error('Error fetching conversations:', err);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [filters]);

  const refreshConversations = useCallback(async () => {
    await fetchConversations(false);
  }, [fetchConversations]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      await messageService.markConversationAsRead(conversationId);
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalUnreadMessages: Math.max(0, prev.totalUnreadMessages - (conversations.find(c => c._id === conversationId)?.unreadCount || 0)),
        unreadConversations: Math.max(0, prev.unreadConversations - 1)
      }));
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to mark conversation as read:', err);
    }
  }, [conversations]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await messageService.deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalConversations: Math.max(0, prev.totalConversations - 1)
      }));
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, []);

  const archiveConversation = useCallback(async (conversationId: string, archived: boolean = true) => {
    try {
      // Since archiveConversation doesn't exist in messageService, we'll simulate it
      console.warn('Archive conversation not implemented in messageService');
      
      // Update local state optimistically
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, isArchived: archived } as Conversation & { isArchived: boolean }
            : conv
        )
      );
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to archive conversation:', err);
    }
  }, []);

  const pinConversation = useCallback(async (conversationId: string, pinned: boolean = true) => {
    try {
      // Since pinConversation doesn't exist in messageService, we'll simulate it
      console.warn('Pin conversation not implemented in messageService');
      
      // Update local state optimistically
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, isPinned: pinned } as Conversation & { isPinned: boolean }
            : conv
        )
      );
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to pin conversation:', err);
    }
  }, []);

  const muteConversation = useCallback(async (conversationId: string, muted: boolean = true) => {
    try {
      // Since muteConversation doesn't exist in messageService, we'll simulate it
      console.warn('Mute conversation not implemented in messageService');
      
      // Update local state optimistically
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, isMuted: muted } as Conversation & { isMuted: boolean }
            : conv
        )
      );
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to mute conversation:', err);
    }
  }, []);

  // Auto-refresh conversations
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshConversations();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time event handlers
  useRealtimeEvent('new_message', useCallback((data: any) => {
    if (data.conversationId) {
      // Update the conversation with new message
      setConversations(prev => 
        prev.map(conv => 
          conv._id === data.conversationId
            ? {
                ...conv,
                lastMessage: data.message,
                unreadCount: conv.unreadCount + (data.message.sender._id !== user?.id ? 1 : 0),
                lastActivity: data.message.createdAt
              }
            : conv
        )
      );
      
      // Update stats if message is not from current user
      if (data.message.sender._id !== user?.id) {
        setStats(prev => ({
          ...prev,
          totalUnreadMessages: prev.totalUnreadMessages + 1
        }));
      }
      
      setLastUpdated(new Date());
    }
  }, [user]));

  useRealtimeEvent('message_read', useCallback((data: any) => {
    if (data.conversationId) {
      setConversations(prev => 
        prev.map(conv => 
          conv._id === data.conversationId
            ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - 1) }
            : conv
        )
      );
      
      setStats(prev => ({
        ...prev,
        totalUnreadMessages: Math.max(0, prev.totalUnreadMessages - 1)
      }));
      
      setLastUpdated(new Date());
    }
  }, []));

  useRealtimeEvent('conversation_updated', useCallback((data: any) => {
    if (data.conversation) {
      setConversations(prev => 
        prev.map(conv => 
          conv._id === data.conversation._id
            ? { ...conv, ...data.conversation }
            : conv
        )
      );
      
      setLastUpdated(new Date());
    }
  }, []));

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    conversations,
    loading,
    error,
    pagination,
    stats,
    filters,
    setFilters,
    refreshConversations,
    markConversationAsRead,
    deleteConversation,
    archiveConversation,
    pinConversation,
    muteConversation,
    isConnected,
    lastUpdated,
  };
};

interface UseConversationMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  sendMessage: (message: string, type?: Message['type'], replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, newMessage: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendingMessage: boolean;
  typingUsers: string[];
  isConnected: boolean;
  lastUpdated: Date | null;
}

export const useConversationMessages = (
  conversationId: string | null,
  autoRefresh: boolean = true
): UseConversationMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalMessages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isConnected } = useRealtime();
  const { user } = useAuth();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async (showLoading = true, page = 1) => {
    if (!conversationId) return;
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await messageService.getConversationMessages(conversationId, page);
      
      // The service returns data directly, not wrapped in success/data
      if (page === 1) {
        setMessages(response.messages);
      } else {
        // Prepend older messages
        setMessages(prev => [...response.messages, ...prev]);
      }
      setPagination(response.pagination);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Failed to fetch messages';
        setError(errorMessage);
        console.error('Error fetching messages:', err);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  const refreshMessages = useCallback(async () => {
    await fetchMessages(false, 1);
  }, [fetchMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!pagination.hasNextPage || loading) return;
    await fetchMessages(false, pagination.currentPage + 1);
  }, [fetchMessages, pagination.hasNextPage, pagination.currentPage, loading]);

  const sendMessage = useCallback(async (
    message: string, 
    type: Message['type'] = 'general',
    replyTo?: string
  ) => {
    if (!conversationId || !message.trim()) return;

    // Create optimistic message
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      conversationId,
      sender: {
        _id: user?.id || '',
        email: user?.email || '',
        profile: {
          firstName: user?.profile?.firstName || '',
          lastName: user?.profile?.lastName || '',
        }
      },
      recipient: messages[0]?.recipient || {} as any,
      message,
      type,
      status: 'unread', // Using 'unread' instead of 'sending' as it's not in the enum
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setSendingMessage(true);
      
      // Add optimistic message to UI
      setMessages(prev => [...prev, tempMessage]);

      // The service only takes conversationId, message, and type (no replyTo)
      const response = await messageService.sendMessage(conversationId, message, type);
      
      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessage._id ? response : msg
        )
      );
      
      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
    } catch (err) {
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, user, messages, toast]);

  const editMessage = useCallback(async (messageId: string, newMessage: string) => {
    try {
      // Since editMessage doesn't exist in messageService, we'll simulate it
      console.warn('Edit message not implemented in messageService');
      
      // Update local state optimistically
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId ? { ...msg, message: newMessage, updatedAt: new Date().toISOString() } : msg
        )
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messageService.markMessageAsRead(messageId);
      
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId ? { ...msg, status: 'read' as Message['status'] } : msg
        )
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, []);

  // Auto-refresh messages
  useEffect(() => {
    if (!autoRefresh || !conversationId) return;

    const interval = setInterval(() => {
      refreshMessages();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, conversationId, refreshMessages]);

  // Initial fetch when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      fetchMessages(true, 1);
    }
  }, [conversationId, fetchMessages]);

  // Real-time event handlers
  useRealtimeEvent('new_message', useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(msg => msg._id === data.message._id)) {
          return prev;
        }
        return [...prev, data.message];
      });
      setLastUpdated(new Date());
    }
  }, [conversationId]));

  useRealtimeEvent('message_updated', useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.message._id ? data.message : msg
        )
      );
      setLastUpdated(new Date());
    }
  }, [conversationId]));

  useRealtimeEvent('message_deleted', useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      setLastUpdated(new Date());
    }
  }, [conversationId]));

  useRealtimeEvent('typing_indicator', useCallback((data: any) => {
    if (data.conversationId === conversationId && data.userId !== user?.id) {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    }
  }, [conversationId, user?.id]));

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    pagination,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    refreshMessages,
    loadMoreMessages,
    sendingMessage,
    typingUsers,
    isConnected,
    lastUpdated,
  };
};

// Hook for typing indicators
export const useTypingIndicator = (conversationId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (!conversationId) return;
    
    setIsTyping(typing);
    // Since sendTypingIndicator doesn't exist in messageService, we'll simulate it
    console.warn('Send typing indicator not implemented in messageService');
    
    if (typing) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        console.warn('Send typing indicator (stop) not implemented in messageService');
      }, 3000);
    }
  }, [conversationId]);

  const handleKeyDown = useCallback(() => {
    if (!isTyping) {
      sendTypingIndicator(true);
    }
  }, [isTyping, sendTypingIndicator]);

  const handleKeyUp = useCallback(() => {
    // Reset the timeout on keyup
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (conversationId) {
        console.warn('Send typing indicator (stop) not implemented in messageService');
      }
    }, 1000);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    handleKeyDown,
    handleKeyUp,
    sendTypingIndicator,
  };
};

export default useConversations;