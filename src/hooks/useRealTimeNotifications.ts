// Real-time notifications hook using Socket.IO
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/socketService';
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
  const notificationIdsRef = useRef<Set<string>>(new Set());
  const { user } = useAuth();

  // Handle incoming notifications from Socket.IO
  const handleNotification = useCallback((notification: RealTimeNotification) => {
    const notificationId = `${notification.type}-${notification.timestamp}-${notification.userId}`;

    if (notificationIdsRef.current.has(notificationId)) {
      return;
    }

    notificationIdsRef.current.add(notificationId);

    if (notificationIdsRef.current.size > 100) {
      const firstId = Array.from(notificationIdsRef.current)[0];
      notificationIdsRef.current.delete(firstId);
    }

    processNotification(notification);

    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.slice(0, 20);
    });
  }, [user]);

  // Connect to Socket.IO and listen for notifications
  const connect = useCallback(async () => {
    if (!user) return;

    try {
      const socket = await socketService.connect();
      setIsConnected(true);

      // Listen for notification events
      socketService.on('notification', handleNotification);

    } catch (error) {
      console.error('Failed to connect to notification service:', error);
      setIsConnected(false);
    }
  }, [user, handleNotification]);

  // Disconnect from Socket.IO
  const disconnect = useCallback(() => {
    socketService.off('notification', handleNotification);
    setIsConnected(false);
  }, [handleNotification]);

  // Handle different types of notifications
  const processNotification = (notification: RealTimeNotification) => {
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

    // Play notification sound (if enabled and user has sound preference on)
    if (notificationConfig.playSound) {
      // Check user's sound preference
      const soundEnabled = user?.profile?.preferences?.notifications?.sound !== false;
      if (soundEnabled) {
        playNotificationSound();
      }
    }

    // Handle browser notifications (if permission granted)
    if (notificationConfig.showBrowserNotification && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.png',
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
      admin_broadcast: {
        showToast: true,
        variant: 'default',
        duration: 10000, // Longer duration for admin broadcasts
        playSound: true,   // specific sound
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
      // New notification types for push notifications
      property_submission: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      property_approval: {
        showToast: true,
        variant: 'default',
        duration: 8000,
        playSound: true,
        showBrowserNotification: true,
      },
      support_ticket_message: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      new_support_ticket: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      vendor_approval: {
        showToast: true,
        variant: 'default',
        duration: 10000, // Longer for important vendor approval
        playSound: true,
        showBrowserNotification: true,
      },
      new_vendor_application: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      ticket_status_change: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: false,
        showBrowserNotification: true,
      },
      // Review notification types
      new_review: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      review_reply: {
        showToast: true,
        variant: 'default',
        duration: 5000,
        playSound: true,
        showBrowserNotification: true,
      },
      review_reported: {
        showToast: true,
        variant: 'default',
        duration: 6000,
        playSound: true,
        showBrowserNotification: true,
      },
      // User account notification types
      role_change: {
        showToast: true,
        variant: 'default',
        duration: 8000,
        playSound: true,
        showBrowserNotification: true,
      },
      account_status_change: {
        showToast: true,
        variant: 'default',
        duration: 8000,
        playSound: true,
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
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.6;

      audio.play().catch((error) => {
        console.warn('Could not play audio file, attempting fallback...', error.name);


        // Fallback to beep sound using Web Audio API
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(context.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.3, context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

          oscillator.start(context.currentTime);
          oscillator.stop(context.currentTime + 0.5);
        } catch (fallbackError) {
          console.warn('Failed to play fallback sound:', fallbackError);
        }
      });
    } catch (error) {
      console.error('Error initializing notification sound:', error);
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
    return false;
  };

  // Send test notification
  const sendTestNotification = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';
      const response = await fetch(`${apiUrl}/notifications/test`, {
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

    } catch (error) {
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
      const apiUrl = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';
      const response = await fetch(`${apiUrl}/notifications/stats`, {
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
      return null;
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    notificationIdsRef.current.clear();
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
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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
