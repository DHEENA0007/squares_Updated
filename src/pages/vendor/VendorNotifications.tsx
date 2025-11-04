import React, { useState } from 'react';
import { Bell, Filter, MoreVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRealTimeNotifications, RealTimeNotification } from '@/hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const VendorNotifications: React.FC = () => {
  const {
    notifications,
    markAsRead,
    clearNotifications,
    isConnected
  } = useRealTimeNotifications();
  
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'lead_alert' | 'inquiry_received' | 'property_update'>('all');

  const getVendorNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      lead_alert: '👥',
      inquiry_received: '📞',
      property_update: '🏠',
      weekly_report: '📊',
      business_update: '🏢',
      new_message: '💬',
      broadcast: '📢',
      announcement: '📣',
      test: '🧪',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      lead_alert: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      inquiry_received: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      property_update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      weekly_report: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      business_update: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      new_message: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      broadcast: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      announcement: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      test: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
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
    
    // Handle vendor-specific navigation
    if (notification.data?.action) {
      switch (notification.data.action) {
        case 'view_property':
          if (notification.data.propertyId) {
            navigate(`/vendor/properties/${notification.data.propertyId}`);
          }
          break;
        case 'view_leads':
          navigate('/vendor/leads');
          break;
        case 'view_messages':
          navigate('/vendor/messages');
          break;
        case 'view_dashboard':
          navigate('/vendor/dashboard');
          break;
        case 'view_inquiries':
          navigate('/vendor/inquiries');
          break;
        default:
          break;
      }
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !(notification as any).read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !(n as any).read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your vendor activities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? '🟢 Live' : '🔴 Offline'}
          </Badge> */}
          {unreadCount > 0 && (
            <Badge variant="secondary">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter notifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="lead_alert">Lead Alerts</SelectItem>
              <SelectItem value="inquiry_received">Inquiries</SelectItem>
              <SelectItem value="property_update">Property Updates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearNotifications}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activity</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
          {filteredNotifications.length > 0 && (
            <CardDescription>
              Click on any notification to view details or take action
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-6 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-sm">
                {filter === 'all' 
                  ? "You'll see vendor updates and alerts here when they arrive"
                  : `No ${filter.replace('_', ' ')} notifications at the moment`
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {filteredNotifications.map((notification, index) => (
                  <Card 
                    key={`${notification.timestamp}-${index}`} 
                    className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                      (notification as any).read ? 'opacity-70' : 'bg-background border-l-4 border-l-primary'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-xl mt-1">
                            {getVendorNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm">
                                {notification.title}
                              </h3>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs px-2 py-0.5 ${getNotificationColor(notification.type)}`}
                              >
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatNotificationTime(notification.timestamp)}
                              </span>
                              {!(notification as any).read && (
                                <Badge variant="default" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.timestamp);
                              }}
                            >
                              {(notification as any).read ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Mark as Unread
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark as Read
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorNotifications;
