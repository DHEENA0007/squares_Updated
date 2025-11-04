import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Send, Users, Mail, Smartphone, Eye, Calendar, CheckCircle } from "lucide-react";

interface NotificationTemplate {
  _id: string;
  name: string;
  subject: string;
  content: string;
  type: 'promotional' | 'informational' | 'alert';
  channels: string[];
}

const SendNotifications = () => {
  const [notificationType, setNotificationType] = useState('push');
  const [targetAudience, setTargetAudience] = useState('all_users');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['push']);
  const [previewMode, setPreviewMode] = useState(false);
  const [sending, setSending] = useState(false);

  const audienceOptions = [
    { value: 'all_users', label: 'All Users', count: 15420 },
    { value: 'customers', label: 'Customers Only', count: 12850 },
    { value: 'vendors', label: 'Vendors/Builders', count: 1240 },
    { value: 'active_users', label: 'Active Users (Last 30 days)', count: 8650 },
    { value: 'premium_users', label: 'Premium Subscribers', count: 890 },
    { value: 'city_specific', label: 'City Specific', count: 0 },
    { value: 'custom', label: 'Custom Audience', count: 0 }
  ];

  const notificationChannels = [
    { id: 'push', label: 'Push Notifications', icon: Bell, description: 'Mobile and web push notifications' },
    { id: 'email', label: 'Email', icon: Mail, description: 'Email notifications' },
    { id: 'sms', label: 'SMS', icon: Smartphone, description: 'Text message notifications' }
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
      channels: ['push', 'email', 'sms']
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
    setSelectedChannels(template.channels);
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
        scheduledDate: isScheduled ? `${scheduledDate}T${scheduledTime}` : null
      };

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Notification sent successfully!');
        // Reset form
        setSubject('');
        setMessage('');
        setSelectedChannels(['push']);
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');
      } else {
        alert('Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const getAudienceInfo = () => {
    const selected = audienceOptions.find(opt => opt.value === targetAudience);
    return selected || audienceOptions[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Send Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Send push notifications and emails for marketing campaigns
          </p>
        </div>
      </div>

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
                      {template.channels.map(channel => {
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
                        {option.count > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {option.count.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">Estimated Reach</span>
                </div>
                <div className="text-lg font-bold text-blue-600">
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
                          <div className="p-3 border rounded-lg bg-gray-50 max-w-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Bell className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm">NinetyNine Acres</span>
                            </div>
                            <div className="font-medium text-sm mb-1">{subject || 'Subject'}</div>
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

                <div className="text-xs text-muted-foreground">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SendNotifications;
