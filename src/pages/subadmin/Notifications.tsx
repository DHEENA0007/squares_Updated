import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Search, Eye, Plus, Users, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  recipients: 'all' | 'vendors' | 'customers' | 'specific';
  recipientCount: number;
  sentBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  status: 'draft' | 'sent';
  readCount: number;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("sent");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as 'info' | 'warning' | 'success' | 'error',
    recipients: "all" as 'all' | 'vendors' | 'customers' | 'specific',
  });

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, searchTerm]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/subadmin/notifications?status=${activeTab}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { notifications: Notification[] } }>(response);
      setNotifications(data.data.notifications || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching notifications",
        variant: "destructive",
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendLoading(true);
      const response = await fetch(`/api/subadmin/notifications/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Notification sent successfully",
        });
        setCreateDialogOpen(false);
        setFormData({
          title: "",
          message: "",
          type: "info",
          recipients: "all",
        });
        fetchNotifications();
      } else {
        toast({
          title: "Error",
          description: "Failed to send notification",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
    }
  };

  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case 'info':
        return { label: 'Info', class: 'bg-blue-600' };
      case 'warning':
        return { label: 'Warning', class: 'bg-yellow-600' };
      case 'success':
        return { label: 'Success', class: 'bg-green-600' };
      case 'error':
        return { label: 'Error', class: 'bg-red-600' };
      default:
        return { label: type, class: 'bg-gray-600' };
    }
  };

  const getRecipientIcon = (recipients: string) => {
    switch (recipients) {
      case 'vendors':
        return <Building className="h-4 w-4" />;
      case 'customers':
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage and send system notifications
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage and send system notifications
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => n.status === 'sent').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Notifications sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.reduce((sum, n) => sum + n.recipientCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Users notified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.length > 0
                ? Math.round(
                    (notifications.reduce((sum, n) => sum + n.readCount, 0) /
                      notifications.reduce((sum, n) => sum + n.recipientCount, 0)) *
                      100
                  )
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Average read rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notifications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Notifications Found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'sent' 
                    ? 'No notifications have been sent yet'
                    : 'No draft notifications available'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const typeBadge = getNotificationTypeBadge(notification.type);
              return (
                <Card key={notification._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          <Badge className={typeBadge.class}>
                            {typeBadge.label}
                          </Badge>
                        </div>
                        <CardDescription>
                          <p className="line-clamp-2">{notification.message}</p>
                        </CardDescription>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getRecipientIcon(notification.recipients)}
                            Recipients: {notification.recipients === 'all' ? 'All Users' : notification.recipients.charAt(0).toUpperCase() + notification.recipients.slice(1)}
                          </span>
                          <span>• {notification.recipientCount} users</span>
                          {notification.status === 'sent' && (
                            <span>• {notification.readCount} read ({Math.round((notification.readCount / notification.recipientCount) * 100)}%)</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          By: {notification.sentBy.name}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNotification(notification);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* View Notification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Detailed information about the notification
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Title</h4>
                <p>{selectedNotification.title}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Message</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedNotification.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Type</h4>
                  <Badge className={getNotificationTypeBadge(selectedNotification.type).class}>
                    {getNotificationTypeBadge(selectedNotification.type).label}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge>{selectedNotification.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Recipients</h4>
                  <p className="text-sm flex items-center gap-2">
                    {getRecipientIcon(selectedNotification.recipients)}
                    {selectedNotification.recipients === 'all' 
                      ? 'All Users' 
                      : selectedNotification.recipients.charAt(0).toUpperCase() + selectedNotification.recipients.slice(1)
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recipient Count</h4>
                  <p className="text-sm">{selectedNotification.recipientCount} users</p>
                </div>
              </div>

              {selectedNotification.status === 'sent' && (
                <div>
                  <h4 className="font-semibold mb-2">Engagement</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedNotification.readCount}</p>
                      <p className="text-xs text-muted-foreground">Read</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {Math.round((selectedNotification.readCount / selectedNotification.recipientCount) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Read Rate</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Sent By</h4>
                <p className="text-sm">{selectedNotification.sentBy.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Notification Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send New Notification</DialogTitle>
            <DialogDescription>
              Create and send a notification to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter notification message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recipients">Recipients</Label>
                <Select
                  value={formData.recipients}
                  onValueChange={(value: any) => setFormData({ ...formData, recipients: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="vendors">Vendors Only</SelectItem>
                    <SelectItem value="customers">Customers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setFormData({
                  title: "",
                  message: "",
                  type: "info",
                  recipients: "all",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={sendLoading}>
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
