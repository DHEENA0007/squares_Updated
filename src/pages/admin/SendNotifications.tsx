import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Users, Mail, Eye, RotateCcw, Calendar, CheckCircle, XCircle, Clock, MessageSquare, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import roleService, { Role } from "@/services/roleService";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationTemplate {
  _id: string;
  name: string;
  subject: string;
  content: string;
  type: 'promotional' | 'informational' | 'alert';
  channels: string[];
}

interface NotificationHistoryItem {
  _id: string;
  subject: string;
  message: string;
  type: string;
  targetAudience: string;
  channels: string[];
  status: string;
  createdAt: string;
  sentAt?: string;
  isScheduled?: boolean;
  scheduledDate?: string;
  statistics?: {
    totalRecipients: number;
    delivered: number;
    opened?: number;
    openRate?: number;
  };
}

const SendNotifications = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('compose');
  const [targetAudience, setTargetAudience] = useState('all_users');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['push']);
  const [sending, setSending] = useState(false);
  const [currentNotificationId, setCurrentNotificationId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const [audienceCounts, setAudienceCounts] = useState({
    all_users: 0,
    customers: 0,
    vendors: 0,
    active_users: 0,
    premium_users: 0
  });

  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Fetch audience counts
    const fetchCounts = async () => {
      try {
        const response = await fetch('/api/admin/notifications/audience-counts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAudienceCounts(data.counts);
          }
        }
      } catch (error) {
        console.error('Failed to fetch audience counts:', error);
      }
    };

    fetchCounts();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getRoles({ limit: 100, isActive: true });
        if (response.success) {
          setRoles(response.data.roles.filter(role => role.name.toLowerCase() !== 'superadmin'));
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/admin/notifications/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistory(data.notifications);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };



  const audienceOptions = [
    { value: 'all_users', label: 'All Users', count: audienceCounts.all_users },

    ...roles.map(role => ({
      value: role.name, // Assuming backend handles role name
      label: role.name.charAt(0).toUpperCase() + role.name.slice(1), // Capitalize
      count: role.userCount || 0
    }))
  ];

  const notificationChannels = [
    { id: 'push', label: 'Push Notifications', icon: Bell, description: 'Mobile and web push notifications' },
    { id: 'email', label: 'Email', icon: Mail, description: 'Email notifications' }
  ];

  const templates = [
    {
      _id: '1',
      name: 'New Properties Alert',
      subject: 'New Properties in Your Area!',
      content: 'Discover amazing new properties that match your preferences. Check them out now!',
      type: 'promotional' as const,
      channels: ['push', 'email']
    },
    {
      _id: '2',
      name: 'Price Drop Alert',
      subject: 'Price Drop Alert - Save Big!',
      content: 'Great news! Properties you\'re watching have reduced their prices. Don\'t miss out!',
      type: 'alert' as const,
      channels: ['push', 'email']
    },
    {
      _id: '3',
      name: 'System Maintenance',
      subject: 'Scheduled Maintenance Notice',
      content: 'We\'ll be performing system maintenance on [DATE]. The platform will be unavailable for 2 hours.',
      type: 'informational' as const,
      channels: ['email', 'push']
    }
  ];

  const handleChannelChange = (channelId: string, checked: boolean) => {
    if (checked) {
      setSelectedChannels([...selectedChannels, channelId]);
    } else {
      setSelectedChannels(selectedChannels.filter(id => id !== channelId));
    }
  };

  const handleTemplateSelect = (template: NotificationTemplate) => {
    setSubject(template.subject);
    setMessage(template.content);
    // Filter out channels that don't exist anymore (like sms)
    const validChannels = template.channels.filter(c => c !== 'sms');
    setSelectedChannels(validChannels.length > 0 ? validChannels : ['push']);
    setCurrentNotificationId(null); // Clear ID when selecting a new template
  };

  const handleEditDraft = (item: NotificationHistoryItem) => {
    setSubject(item.subject);
    setMessage(item.message);
    setTargetAudience(item.targetAudience);
    setSelectedChannels(item.channels);
    setCurrentNotificationId(item._id);

    if (item.isScheduled && item.scheduledDate) {
      setIsScheduled(true);
      const dateObj = new Date(item.scheduledDate);
      setScheduledDate(dateObj.toISOString().split('T')[0]);
      setScheduledTime(dateObj.toTimeString().slice(0, 5));
    } else {
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
    }

    setActiveTab('compose');
  };

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject to save as draft');
      return;
    }

    setSending(true);
    try {
      const payload = {
        subject,
        message,
        targetAudience,
        channels: selectedChannels,
        isScheduled,
        scheduledDate: isScheduled ? `${scheduledDate}T${scheduledTime}` : null,
        saveAsDraft: true,
        notificationId: currentNotificationId
      };

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Draft saved successfully');
        if (data.notification) {
          setCurrentNotificationId(data.notification._id);
        }
      } else {
        alert(data.message || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('Failed to save draft');
    } finally {
      setSending(false);
    }
  };

  const handleSendNotification = async () => {
    if (!subject.trim() || !message.trim() || selectedChannels.length === 0) {
      alert('Please fill in all required fields and select at least one channel');
      return;
    }

    setSending(true);
    try {
      const payload = {
        subject,
        message,
        targetAudience,
        channels: selectedChannels,
        isScheduled,
        scheduledDate: isScheduled ? `${scheduledDate}T${scheduledTime}` : null,
        notificationId: currentNotificationId
      };

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let msg = 'Notification processed successfully!';
        if (data.detailedStatus) {
          msg += ` (Email: ${data.detailedStatus.email?.sent || 0} sent, Push: ${data.detailedStatus.push?.sent || 0} sent)`;
        }
        alert(msg);
        // Reset form
        setSubject('');
        setMessage('');
        setSelectedChannels(['push']);
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');
        setCurrentNotificationId(null);

        // Refresh history if on that tab, or just invalidate cache
        if (activeTab === 'history') fetchHistory();
      } else {
        console.error('Notification send failed:', data);
        alert(data.message || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      alert(`Failed to send notification: ${error?.message || 'Network error'}`);
    } finally {
      setSending(false);
    }
  };

  const getAudienceInfo = () => {
    const selected = audienceOptions.find(opt => opt.value === targetAudience);
    return selected || audienceOptions[0];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'sending':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><RotateCcw className="w-3 h-3 mr-1 animate-spin" /> Sending</Badge>;
      case 'scheduled':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Edit className="w-3 h-3 mr-1" /> Draft</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification record?')) return;

    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Notification deleted successfully');
          fetchHistory();
        } else {
          alert(data.message || 'Failed to delete notification');
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Send Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track marketing campaigns
          </p>
        </div>
      </div>

      <Tabs defaultValue="compose" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose">Compose Notification</TabsTrigger>
          <TabsTrigger value="history">Notification History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {templates.map((template) => (
                      <div
                        key={template._id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.subject}</p>
                        <div className="flex gap-1 mt-2">
                          {template.channels.filter(c => c !== 'sms').map(channel => {
                            const channelInfo = notificationChannels.find(c => c.id === channel);
                            const Icon = channelInfo?.icon || Bell;
                            return (
                              <Icon key={channel} className="w-3 h-3 text-muted-foreground" />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notification Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Subject/Title *</label>
                    <Input
                      placeholder="Enter notification subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message Content *</label>
                    <Textarea
                      placeholder="Enter your notification message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Channels *</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationChannels.map((channel) => {
                      const Icon = channel.icon;
                      return (
                        <div key={channel.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={channel.id}
                            checked={selectedChannels.includes(channel.id)}
                            onCheckedChange={(checked) => handleChannelChange(channel.id, checked as boolean)}
                          />
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <label htmlFor={channel.id} className="text-sm font-medium cursor-pointer">
                              {channel.label}
                            </label>
                          </div>
                          <span className="text-xs text-muted-foreground">{channel.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling */}
              <Card>
                <CardHeader>
                  <CardTitle>Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schedule"
                      checked={isScheduled}
                      onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
                    />
                    <label htmlFor="schedule" className="text-sm font-medium cursor-pointer">
                      Schedule for later
                    </label>
                  </div>

                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Time</label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Target Audience */}
              <Card>
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {audienceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex justify-between items-center w-full">
                            <span>{option.label}</span>
                            {option.count >= 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {option.count.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-sm text-foreground">Estimated Reach</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {getAudienceInfo().count.toLocaleString()} users
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Notification
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Notification Preview</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Push Notification Preview */}
                          {selectedChannels.includes('push') && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Push Notification</h4>
                              <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 max-w-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="font-medium text-sm text-foreground">BuildHomeMartSquares</span>
                                </div>
                                <div className="font-medium text-sm mb-1 text-foreground">{subject || 'Subject'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {message || 'Message content will appear here...'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Email Preview */}
                          {selectedChannels.includes('email') && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Email</h4>
                              <div className="p-4 border rounded-lg">
                                <div className="border-b pb-2 mb-3">
                                  <div className="font-medium">{subject || 'Subject'}</div>
                                  <div className="text-sm text-muted-foreground">from: noreply@ninetyniineacres.com</div>
                                </div>
                                <div className="text-sm whitespace-pre-wrap">
                                  {message || 'Message content will appear here...'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="text-xs text-muted-foreground space-y-2">
                      <div className="flex justify-between">
                        <span>Channels:</span>
                        <span>{selectedChannels.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recipients:</span>
                        <span>{getAudienceInfo().count.toLocaleString()}</span>
                      </div>
                      {isScheduled && (
                        <div className="flex justify-between">
                          <span>Scheduled:</span>
                          <span>{scheduledDate} {scheduledTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Send Action */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleSendNotification}
                      disabled={sending || !subject.trim() || !message.trim() || selectedChannels.length === 0}
                      className="w-full"
                    >
                      {sending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          {isScheduled ? 'Schedule Notification' : 'Send Now'}
                        </div>
                      )}
                    </Button>

                    <Button
                      onClick={handleSaveDraft}
                      disabled={sending || !subject.trim()}
                      variant="outline"
                      className="w-full"
                    >
                      Save as Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notifications sent yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.subject}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{item.message}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.targetAudience.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.channels.includes('push') && <Bell className="w-4 h-4 text-blue-500" />}
                            {item.channels.includes('email') && <Mail className="w-4 h-4 text-purple-500" />}
                            {item.channels.includes('sms') && <MessageSquare className="w-4 h-4 text-green-500" />}
                          </div>
                        </TableCell>
                        <TableCell>{item.statistics?.totalRecipients || 0}</TableCell>
                        <TableCell>
                          {item.status === 'sent' && item.statistics ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {item.statistics.delivered || 0}/{item.statistics.totalRecipients || 0}
                                </span>
                                <span className="text-xs text-muted-foreground">delivered</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          {item.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditDraft(item)}
                              title="Edit Draft"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteNotification(item._id)}
                              title="Delete Notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SendNotifications;
