import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import { format } from 'date-fns';
import {
    Bell,
    Check,
    Trash2,
    MessageSquare,
    Home,
    Tag,
    Info,
    Phone,
    User,
    Clock
} from 'lucide-react';

const VendorNotifications = () => {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 1
    });

    useEffect(() => {
        fetchNotifications();
    }, [pagination.page]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationService.fetchNotifications(pagination.page, pagination.limit);
            setNotifications(response.notifications || []);
            setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast({
                title: 'Error',
                description: 'Failed to load notifications',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead([id]);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, read: true } : n)
            );
            toast({
                title: 'Marked as read',
                description: 'Notification marked as read',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update notification',
                variant: 'destructive',
            });
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast({
                title: 'Success',
                description: 'All notifications marked as read',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update notifications',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast({
                title: 'Deleted',
                description: 'Notification deleted',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete notification',
                variant: 'destructive',
            });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'property_alert':
            case 'lead_alert':
                return <Home className="h-5 w-5 text-blue-500" />;
            case 'price_alert':
                return <Tag className="h-5 w-5 text-green-500" />;
            case 'new_message':
            case 'inquiry_received':
                return <MessageSquare className="h-5 w-5 text-purple-500" />;
            default:
                return <Info className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        Manage your alerts and updates
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleMarkAllAsRead}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Recent Notifications
                    </CardTitle>
                    <CardDescription>
                        You have {notifications.filter(n => !n.read).length} unread notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No notifications found
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`flex gap-4 p-4 rounded-lg border ${notification.read ? 'bg-background' : 'bg-muted/50'
                                            }`}
                                    >
                                        <div className="mt-1">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-semibold ${!notification.read && 'text-primary'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {notification.message}
                                            </p>

                                            {/* Interest Notification Specific Data */}
                                            {notification.type === 'lead_alert' && notification.data && (
                                                <div className="mt-3 p-3 bg-background rounded-md border text-sm space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">Customer:</span>
                                                        <span>{notification.data.customerName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">Phone:</span>
                                                        <a href={`tel:${notification.data.customerPhone}`} className="text-primary hover:underline">
                                                            {notification.data.customerPhone}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Home className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">Property:</span>
                                                        <span>{notification.data.propertyTitle}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-2">
                                                {!notification.read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs"
                                                        onClick={() => handleMarkAsRead(notification._id)}
                                                    >
                                                        Mark as read
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(notification._id)}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default VendorNotifications;
