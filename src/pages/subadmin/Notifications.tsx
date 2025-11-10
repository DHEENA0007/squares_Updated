import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Search, Eye, Plus, Users, Building, Mail, Smartphone } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

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
    sendEmail: true,
    sendInApp: true,
  });

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, searchTerm]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/notifications?status=${activeTab}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { notifications: Notification[] } }>(response);
      setNotifications(data.data.notifications || []);
    } catch (error: any) {
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

  const handleSendDraft = async (draftId: string) => {
    try {
      setSendLoading(true);
      const response = await fetchWithAuth(`/subadmin/notifications/draft/${draftId}/send`, {
        method: 'POST',
      });
      
      const result = await handleApiResponse<{ 
        data: { 
          recipientCount: number; 
          emailsSent: number; 
          inAppSent: number;
        } 
      }>(response);
      
      const { recipientCount, emailsSent, inAppSent } = result.data;
      
      toast({
        title: "Success",
        description: `Notification sent to ${recipientCount} users (${emailsSent} emails, ${inAppSent} in-app)`,
      });
      
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send draft notification",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const response = await fetchWithAuth(`/subadmin/notifications/draft/${draftId}`, {
        method: 'DELETE',
      });
      
      await handleApiResponse<{ success: boolean }>(response);
      
      toast({
        title: "Success",
        description: "Draft deleted successfully",
      });
      
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete draft",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async (saveAsDraft = false) => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!saveAsDraft && !formData.sendEmail && !formData.sendInApp) {
      toast({
        title: "Validation Error",
        description: "Please select at least one delivery method (Email or In-App)",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendLoading(true);
      const endpoint = saveAsDraft ? '/subadmin/notifications/draft' : '/subadmin/notifications/send';
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (saveAsDraft) {
        await handleApiResponse<{ success: boolean }>(response);
        toast({
          title: "Success",
          description: "Notification saved as draft",
        });
      } else {
        const result = await handleApiResponse<{ 
          data: { 
            recipientCount: number; 
            emailsSent: number; 
            inAppSent: number;
          } 
        }>(response);
        
        const { recipientCount, emailsSent, inAppSent } = result.data;
        
        toast({
          title: "Success",
          description: `Notification sent to ${recipientCount} users (${emailsSent} emails, ${inAppSent} in-app)`,
        });
      }
      
      setCreateDialogOpen(false);
      setFormData({
        title: "",
        message: "",
        type: "info",
        recipients: "all",
        sendEmail: true,
        sendInApp: true,
      });
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || (saveAsDraft ? "Failed to save draft" : "Failed to send notification"),
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
            <CardTitle className="text-sm font-medium">
              {activeTab === 'sent' ? 'Total Sent' : 'Total Drafts'}
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'sent' ? 'Notifications sent' : 'Draft notifications'}
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
            <CardTitle className="text-sm font-medium">
              {activeTab === 'sent' ? 'Read Rate' : 'Average Recipients'}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTab === 'sent' ? (
                notifications.length > 0
                  ? Math.round(
                      (notifications.reduce((sum, n) => sum + n.readCount, 0) /
                        notifications.reduce((sum, n) => sum + n.recipientCount, 0)) *
                        100
                    )
                  : 0
              ) : (
                notifications.length > 0
                  ? Math.round(
                      notifications.reduce((sum, n) => sum + n.recipientCount, 0) /
                        notifications.length
                    )
                  : 0
              )}
              {activeTab === 'sent' ? '%' : ''}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'sent' ? 'Average read rate' : 'Per notification'}
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
                    <div className="flex gap-2">
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
                      
                      {notification.status === 'draft' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSendDraft(notification._id)}
                            disabled={sendLoading}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendLoading ? 'Sending...' : 'Send Now'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDraft(notification._id)}
                          >
                            Delete Draft
                          </Button>
                        </>
                      )}
                    </div>
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
              Create and send a notification to users via email and/or in-app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., System Maintenance, New Feature, Important Update"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your notification message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use clear and concise language. This message will be sent to all selected recipients.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Notification Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="error">🔴 Error/Alert</SelectItem>
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

            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-base">Delivery Methods *</Label>
              <div className="space-y-3">
                {/* <div className="flex items-center space-x-3">
                  <Checkbox
                    id="sendInApp"
                    checked={formData.sendInApp}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, sendInApp: checked as boolean })
                    }
                  />
                  <Label 
                    htmlFor="sendInApp" 
                    className="flex items-center gap-2 font-normal cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>In-App Notification</span>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-7">
                  Real-time notification shown to users while they're active on the platform
                </p> */}

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, sendEmail: checked as boolean })
                    }
                  />
                  <Label 
                    htmlFor="sendEmail" 
                    className="flex items-center gap-2 font-normal cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Notification</span>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-7">
                  Send formatted email to users' registered email addresses
                </p>
              </div>

              {!formData.sendEmail && !formData.sendInApp && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
                  <p className="text-xs text-destructive">
                    ⚠️ Please select at least one delivery method
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📋 Common Use Cases:
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• System Maintenance: Scheduled downtime notifications</li>
                <li>• Platform Updates: New features or policy changes</li>
                <li>• Security Alerts: Important security updates</li>
                <li>• Service Announcements: General platform announcements</li>
              </ul>
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
                  sendEmail: true,
                  sendInApp: true,
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleSendNotification(true)} 
              disabled={sendLoading}
            >
              {sendLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  Save as Draft
                </>
              )}
            </Button>
            <Button 
              onClick={() => handleSendNotification(false)} 
              disabled={sendLoading || (!formData.sendEmail && !formData.sendInApp)}
            >
              {sendLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
