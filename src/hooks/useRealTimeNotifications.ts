// Real-time notifications hook using Server-Sent Events
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';

export interface RealTimeNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  userId: string;
}

export interface NotificationStats {
  connectedUsers: number;
  totalConnections: number;
  queuedNotifications: number;
}

export const useRealTimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { user } = useAuth();

  // Connect to notification stream
  const connect = () => {
    const token = authService.getToken();
    if (!user || !token || eventSourceRef.current) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const url = `${baseUrl}/api/notifications/stream`;

    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log('Connected to real-time notifications');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: RealTimeNotification = JSON.parse(event.data);
        
        // Handle different notification types
        handleNotification(notification);
        
        // Add to notifications list
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
        
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Notification stream error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSource.close();
          eventSourceRef.current = null;
          connect();
        }
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  };

  // Disconnect from notification stream
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  // Handle different types of notifications
  const handleNotification = (notification: RealTimeNotification) => {
    // Skip connection messages
    if (notification.type === 'connection') {
      return;
    }

    // Show toast notification based on type
    const notificationConfig = getNotificationConfig(notification);
    
    if (notificationConfig.showToast) {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notificationConfig.variant,
        duration: notificationConfig.duration,
      });
    }

    // Play notification sound (optional)
    if (notificationConfig.playSound) {
      playNotificationSound();
    }

    // Handle browser notifications (if permission granted)
    if (notificationConfig.showBrowserNotification && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.type,
      });
    }
  };

  // Get notification configuration based on type
  const getNotificationConfig = (notification: RealTimeNotification) => {
    const configs: Record<string, any> = {
      property_alert: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: true,
        showBrowserNotification: true,
      },
      price_alert: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      new_message: {
        showToast: true,
        variant: 'default',
        duration: 4000,
        playSound: true,
        showBrowserNotification: true,
      },
      service_update: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: false,
        showBrowserNotification: true,
      },
      property_update: {
        showToast: true,
        variant: 'default',
        duration: 4000,
        playSound: false,
        showBrowserNotification: false,
      },
      broadcast: {
        showToast: true,
        variant: 'default',
        duration: 8000,
        playSound: false,
        showBrowserNotification: true,
      },
      announcement: {
        showToast: true,
        variant: 'default',
        duration: 8000,
        playSound: false,
        showBrowserNotification: true,
      },
      lead_alert: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      inquiry_received: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: true,
        showBrowserNotification: true,
      },
      weekly_report: {
        showToast: true,
        variant: 'default',
        duration: 4000,
        playSound: false,
        showBrowserNotification: true,
      },
      business_update: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: false,
        showBrowserNotification: true,
      },
      default: {
        showToast: true,
        variant: 'default',
        duration: 4000,
        playSound: false,
        showBrowserNotification: false,
      }
    };

    return configs[notification.type] || configs.default;
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3'); // Add this file to public folder
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Notification sound not available:', error);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Send test notification
  const sendTestNotification = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'test',
          message: 'This is a test notification from the real-time system!'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      const data = await response.json();
      console.log('Test notification sent:', data);
      
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  // Get notification statistics
  const getNotificationStats = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/notifications/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification stats');
      }

      const data = await response.json();
      setStats(data.data);
      return data.data;
      
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return null;
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Mark notification as read (if you want to implement read status)
  const markAsRead = (timestamp: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.timestamp === timestamp 
          ? { ...notification, read: true } as any
          : notification
      )
    );
  };

  // Auto-connect when user is authenticated
  useEffect(() => {
    const token = authService.getToken();
    if (user && token && !eventSourceRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    notifications,
    stats,
    connect,
    disconnect,
    sendTestNotification,
    getNotificationStats,
    clearNotifications,
    markAsRead,
    requestNotificationPermission,
  };
};
