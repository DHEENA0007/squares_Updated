import { emailService } from './emailService';
import { userService } from './userService';
import { authService } from './authService';

export interface NotificationData {
  type: 'property_alert' | 'price_drop' | 'new_message' | 'news_update' | 'welcome' | 'password_reset' | 'email_verification';
  userId: string;
  data: Record<string, any>;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private pushSupported = 'Notification' in window && 'serviceWorker' in navigator;
  private pushPermission: NotificationPermission = 'default';
  private eventSource: EventSource | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, ((notification: RealtimeNotification) => void)[]> = new Map();

  constructor() {
    if (this.pushSupported) {
      this.pushPermission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Connect to SSE notification stream
  connectToStream(): void {
    const token = authService.getToken();
    if (!token || this.eventSource) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const streamUrl = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
      
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        // Connection successful - silent
      };

      this.eventSource.onmessage = (event) => {
        try {
          const notification: RealtimeNotification = JSON.parse(event.data);
          this.handleNotification(notification);
        } catch (error) {
          // Silent error handling
        }
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;

        // Reconnect after 5 seconds
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
          this.connectToStream();
        }, 5000);
      };
    } catch (error) {
      // Silent error handling
    }
  }

  // Disconnect from SSE stream
  disconnectFromStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Handle incoming notification
  private handleNotification(notification: RealtimeNotification): void {
    // Notify all listeners
    const typeListeners = this.listeners.get(notification.type) || [];
    const allListeners = this.listeners.get('all') || [];
    
    [...typeListeners, ...allListeners].forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        // Silent error handling
      }
    });

    // Show browser push notification if enabled
    if (this.pushPermission === 'granted' && notification.title && notification.message) {
      this.showPushNotification({
        title: notification.title,
        body: notification.message,
        data: notification.data
      });
    }
  }

  // Subscribe to notifications
  subscribe(type: string, callback: (notification: RealtimeNotification) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        const index = typeListeners.indexOf(callback);
        if (index > -1) {
          typeListeners.splice(index, 1);
        }
        if (typeListeners.length === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  async requestPushPermission(): Promise<boolean> {
    if (!this.pushSupported) {
      return false;
    }

    if (this.pushPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.pushPermission = permission;
      return permission === 'granted';
    } catch (error) {
      return false;
    }
  }

  async showPushNotification(options: PushNotificationOptions): Promise<void> {
    if (!this.pushSupported || this.pushPermission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        data: options.data || {},
        requireInteraction: true,
        tag: `notification-${Date.now()}`
      });
    } catch (error) {
      // Silent error handling
    }
  }

  async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Get user data and preferences
      const userResponse = await userService.getUser(notificationData.userId);
      if (!userResponse.success) {
        throw new Error('Failed to get user data');
      }

      const user = userResponse.data.user;
      const preferences = (user as any).preferences?.notifications;
      const userName = userService.getFullName(user);

      // Send email notification if enabled
      if (preferences?.email) {
        await this.sendEmailNotification(notificationData.type, user.email, userName, notificationData.data);
      }

      // Send push notification if enabled and permission granted
      if (preferences?.push && this.pushPermission === 'granted') {
        await this.sendPushNotification(notificationData.type, notificationData.data);
      }
    } catch (error) {
      // Silent error handling
    }
  }

  private async sendEmailNotification(type: string, userEmail: string, userName: string, data: Record<string, any>): Promise<void> {
    switch (type) {
      case 'property_alert':
        await emailService.sendPropertyAlert(userEmail, userName, data.properties);
        break;
      case 'price_drop':
        await emailService.sendPriceDropAlert(userEmail, userName, data.property, data.oldPrice, data.newPrice);
        break;
      case 'new_message':
        await emailService.sendNewMessageNotification(userEmail, userName, data.senderName, data.messagePreview);
        break;
      case 'news_update':
        await emailService.sendNewsUpdate(userEmail, userName, data.newsContent);
        break;
      case 'welcome':
        await emailService.sendWelcomeEmail(userEmail, userName);
        break;
      case 'password_reset':
        await emailService.sendPasswordResetEmail(userEmail, userName, data.resetToken);
        break;
      case 'email_verification':
        await emailService.sendVerificationEmail(userEmail, userName, data.verificationToken);
        break;
    }
  }

  private async sendPushNotification(type: string, data: Record<string, any>): Promise<void> {
    let pushOptions: PushNotificationOptions;

    switch (type) {
      case 'property_alert':
        pushOptions = {
          title: '🏠 New Properties Available',
          body: `Found ${data.properties?.length || 0} new properties matching your criteria`,
          data: { url: '/customer/dashboard', type: 'property_alert' }
        };
        break;
      case 'price_drop':
        pushOptions = {
          title: '📉 Price Drop Alert',
          body: `${data.property?.title} price reduced to ${data.newPrice}`,
          data: { url: `/property/${data.property?._id}`, type: 'price_drop' }
        };
        break;
      case 'new_message':
        pushOptions = {
          title: '💬 New Message',
          body: `New message from ${data.senderName}: ${data.messagePreview?.substring(0, 50)}${data.messagePreview?.length > 50 ? '...' : ''}`,
          data: { url: '/customer/messages', type: 'new_message' }
        };
        break;
      case 'news_update':
        pushOptions = {
          title: '📰 Real Estate News',
          body: 'Latest updates in the real estate market',
          data: { url: '/', type: 'news_update' }
        };
        break;
      default:
        return;
    }

    await this.showPushNotification(pushOptions);
  }

  // Batch notification methods
  async sendPropertyAlerts(userIds: string[], properties: any[]): Promise<void> {
    const notifications = userIds.map(userId => ({
      type: 'property_alert' as const,
      userId,
      data: { properties }
    }));

    await Promise.allSettled(notifications.map(notification => this.sendNotification(notification)));
  }

  async sendPriceDropAlerts(alerts: Array<{ userId: string; property: any; oldPrice: string; newPrice: string }>): Promise<void> {
    const notifications = alerts.map(alert => ({
      type: 'price_drop' as const,
      userId: alert.userId,
      data: {
        property: alert.property,
        oldPrice: alert.oldPrice,
        newPrice: alert.newPrice
      }
    }));

    await Promise.allSettled(notifications.map(notification => this.sendNotification(notification)));
  }

  async sendNewMessageNotifications(recipients: Array<{ userId: string; senderName: string; messagePreview: string }>): Promise<void> {
    const notifications = recipients.map(recipient => ({
      type: 'new_message' as const,
      userId: recipient.userId,
      data: {
        senderName: recipient.senderName,
        messagePreview: recipient.messagePreview
      }
    }));

    await Promise.allSettled(notifications.map(notification => this.sendNotification(notification)));
  }

  async sendNewsUpdates(userIds: string[], newsContent: string): Promise<void> {
    const notifications = userIds.map(userId => ({
      type: 'news_update' as const,
      userId,
      data: { newsContent }
    }));

    await Promise.allSettled(notifications.map(notification => this.sendNotification(notification)));
  }

  // Utility methods
  isPushSupported(): boolean {
    return this.pushSupported;
  }

  getPushPermission(): NotificationPermission {
    return this.pushPermission;
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  async testNotification(): Promise<void> {
    if (!this.pushSupported) {
      return;
    }

    const granted = await this.requestPushPermission();
    if (!granted) {
      return;
    }

    await this.showPushNotification({
      title: 'Test Notification',
      body: 'This is a test notification from BuildHomeMart Squares',
      data: { test: true }
    });
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
