import React, { useState } from 'react';
import { Bell, Eye, Wifi, WifiOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRealTimeNotifications, RealTimeNotification } from '@/hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socketService';

interface ExtendedNotification extends RealTimeNotification {
  read?: boolean;
}

export const CustomerNotificationCenter: React.FC = () => {
  const {
    isConnected,
    notifications,
    markAsRead
  } = useRealTimeNotifications();
  
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !(n as ExtendedNotification).read).length;
  
  // Get only the 3 most recent notifications
  const recentNotifications = notifications.slice(0, 3);

  const getCustomerNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      property_alert: '🏠',
      price_alert: '💰',
      new_message: '💬',
      property_update: '📋',
      service_update: '🔧',
      news_update: '📰',
      broadcast: '📢',
      announcement: '📣',
      welcome: '👋',
      test: '🧪',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      property_alert: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      price_alert: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      new_message: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      property_update: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      service_update: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      news_update: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      broadcast: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      announcement: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      welcome: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      test: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatNotificationTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const handleNotificationClick = (notification: RealTimeNotification) => {
    markAsRead(notification.timestamp);

    // Emit socket event to track read/opened notification
    socketService.markNotificationAsRead({
      notificationTimestamp: notification.timestamp,
      notificationTitle: notification.title,
      notificationType: notification.type,
      userId: notification.userId
    });

    // Handle customer-specific navigation
    if (notification.data?.action) {
      switch (notification.data.action) {
        case 'view_property':
          if (notification.data.propertyId) {
            navigate(`/customer/property/${notification.data.propertyId}`);
          }
          break;
        case 'view_properties':
          navigate('/customer/search');
          break;
        case 'view_messages':
          navigate('/customer/messages');
          break;
        case 'view_dashboard':
          navigate('/customer/dashboard');
          break;
        case 'view_favorites':
          navigate('/customer/favorites');
          break;
        case 'view_services':
          navigate('/customer/services');
          break;
        default:
          break;
      }
    }
    
    setOpen(false);
  };

  const handleViewAllNotifications = () => {
    // Since CustomerNotifications.tsx is empty, navigate to messages or dashboard for now
    navigate('/customer/messages');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 xs:h-5 xs:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You'll see updates about properties, messages, and more here</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {recentNotifications.map((notification, index) => (
                <Card 
                  key={`${notification.timestamp}-${index}`} 
                  className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 border-0 shadow-none ${
                    (notification as ExtendedNotification).read ? 'opacity-60' : 'bg-background'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-base mt-0.5">
                        {getCustomerNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm line-clamp-1 flex-1">
                            {notification.title}
                          </p>
                          {!(notification as ExtendedNotification).read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatNotificationTime(notification.timestamp)}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs px-1.5 py-0.5 ${getNotificationColor(notification.type)}`}
                          >
                            {notification.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {recentNotifications.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-center text-xs"
              onClick={handleViewAllNotifications}
            >
              <Eye className="w-3 h-3 mr-1" />
              View All Notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
