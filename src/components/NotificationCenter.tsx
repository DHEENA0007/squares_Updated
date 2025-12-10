import React, { useState } from 'react';
import { Bell, X, Eye, Trash2, Settings, Wifi, WifiOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealTimeNotifications, RealTimeNotification } from '@/hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { socketService } from '@/services/socketService';

export const NotificationCenter: React.FC = () => {
  const {
    isConnected,
    notifications,
    stats,
    sendTestNotification,
    clearNotifications,
    markAsRead,
    requestNotificationPermission,
    connect,
    disconnect
  } = useRealTimeNotifications();

  const [open, setOpen] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(
    Notification.permission === 'granted'
  );

  const unreadCount = notifications.filter(n => !(n as any).read).length;

  const handleToggleBrowserNotifications = async () => {
    if (!browserNotifications) {
      const granted = await requestNotificationPermission();
      setBrowserNotifications(granted);
    } else {
      setBrowserNotifications(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      property_alert: '🏠',
      price_alert: '💰',
      new_message: '💬',
      service_update: '🔧',
      property_update: '📋',
      lead_alert: '👥',
      inquiry_received: '📞',
      weekly_report: '📊',
      business_update: '🏢',
      broadcast: '📢',
      announcement: '📣',
      test: '🧪',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      property_alert: 'bg-blue-100 text-blue-800',
      price_alert: 'bg-green-100 text-green-800',
      new_message: 'bg-purple-100 text-purple-800',
      service_update: 'bg-orange-100 text-orange-800',
      property_update: 'bg-gray-100 text-gray-800',
      lead_alert: 'bg-indigo-100 text-indigo-800',
      inquiry_received: 'bg-cyan-100 text-cyan-800',
      weekly_report: 'bg-emerald-100 text-emerald-800',
      business_update: 'bg-amber-100 text-amber-800',
      broadcast: 'bg-red-100 text-red-800',
      announcement: 'bg-yellow-100 text-yellow-800',
      test: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

    // Handle navigation based on action
    if (notification.data?.action) {
      switch (notification.data.action) {
        case 'view_property':
          if (notification.data.propertyId) {
            window.location.href = `/property/${notification.data.propertyId}`;
          }
          break;
        case 'new_message':
          window.location.href = '/dashboard/messages';
          break;
        case 'property_update':
          window.location.href = '/dashboard';
          break;
        case 'service_update':
          window.location.href = '/dashboard/services';
          break;
        default:
          break;
      }
    }

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="notifications" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notifications" className="m-0">
            <div className="p-2">
              {unreadCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="h-6 px-2 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-1 p-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <Card 
                      key={`${notification.timestamp}-${index}`} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        (notification as any).read ? 'opacity-60' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">
                                {notification.title}
                              </p>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getNotificationColor(notification.type)}`}
                              >
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatNotificationTime(notification.timestamp)}
                              </span>
                              {!(notification as any).read && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="m-0 p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Real-time Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get instant notifications as they happen
                  </p>
                </div>
                <Switch
                  checked={isConnected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      connect();
                    } else {
                      disconnect();
                    }
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Browser Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Show notifications even when tab is not active
                  </p>
                </div>
                <Switch
                  checked={browserNotifications}
                  onCheckedChange={handleToggleBrowserNotifications}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="font-medium text-sm">Statistics</p>
                {stats && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted p-2 rounded">
                      <p className="font-medium">{stats.connectedUsers}</p>
                      <p className="text-muted-foreground">Connected Users</p>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <p className="font-medium">{stats.totalConnections}</p>
                      <p className="text-muted-foreground">Total Connections</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <Button 
                variant="outline" 
                size="sm" 
                onClick={sendTestNotification}
                className="w-full"
              >
                Send Test Notification
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
