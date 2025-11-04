import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  Mail,
  Users,
  TrendingUp,
  MessageSquare,
  Globe,
  AlertCircle,
  Smartphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface VendorNotificationPreferences {
  email: boolean;
  push: boolean;
  newMessages: boolean;
  newsUpdates: boolean;
  marketing: boolean;
}

export interface VendorBusinessPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  leadAlerts: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
}

interface VendorNotificationSettingsProps {
  preferences: VendorNotificationPreferences;
  businessPreferences: VendorBusinessPreferences;
  onChange: (key: keyof VendorNotificationPreferences, value: boolean) => void;
  onBusinessChange: (key: keyof VendorBusinessPreferences, value: boolean) => void;
  onTestPushNotification?: () => void;
  onTestEmail?: () => void;
  showTestButtons?: boolean;
  supportEmail?: string;
}

export const VendorNotificationSettings: React.FC<VendorNotificationSettingsProps> = ({
  preferences,
  businessPreferences,
  onChange,
  onBusinessChange,
  onTestPushNotification,
  onTestEmail,
  showTestButtons = false,
  supportEmail = "support@buildhomemartsquares.com"
}) => {
  // Core notification options for vendors
  const coreNotificationOptions = [
    {
      key: 'email' as keyof VendorNotificationPreferences,
      icon: Mail,
      color: 'text-blue-500',
      title: 'Email Notifications',
      description: 'Receive updates and alerts via email',
      isCore: true
    },
    {
      key: 'push' as keyof VendorNotificationPreferences,
      icon: Bell,
      color: 'text-purple-500',
      title: 'Push Notifications',
      description: 'Browser notifications for instant updates',
      isCore: true
    },
    {
      key: 'newMessages' as keyof VendorNotificationPreferences,
      icon: MessageSquare,
      color: 'text-indigo-500',
      title: 'New Message Alerts',
      description: 'Get notified when you receive new messages from customers',
      requiresEmail: true
    },
    {
      key: 'newsUpdates' as keyof VendorNotificationPreferences,
      icon: Globe,
      color: 'text-teal-500',
      title: 'News & Updates',
      description: 'Real estate market news and platform updates',
      requiresEmail: true
    },
    {
      key: 'marketing' as keyof VendorNotificationPreferences,
      icon: TrendingUp,
      color: 'text-green-500',
      title: 'Marketing Communications',
      description: 'Platform announcements and promotional content',
      requiresEmail: true
    }
  ];

  // Business-specific notification options for vendors
  const businessNotificationOptions = [
    {
      key: 'emailNotifications' as keyof VendorBusinessPreferences,
      icon: Mail,
      color: 'text-blue-600',
      title: 'Business Email Notifications',
      description: 'General business communications and updates',
      isCore: true
    },
    {
      key: 'smsNotifications' as keyof VendorBusinessPreferences,
      icon: Smartphone,
      color: 'text-green-600',
      title: 'SMS Notifications',
      description: 'Urgent alerts and time-sensitive notifications via SMS',
      isCore: true
    },
    {
      key: 'leadAlerts' as keyof VendorBusinessPreferences,
      icon: Users,
      color: 'text-orange-600',
      title: 'Lead Alerts',
      description: 'Instant notifications when you receive new property inquiries',
      requiresBusiness: true
    },
    {
      key: 'weeklyReports' as keyof VendorBusinessPreferences,
      icon: TrendingUp,
      color: 'text-purple-600',
      title: 'Weekly Reports',
      description: 'Weekly performance reports and analytics',
      requiresBusiness: true
    },
    {
      key: 'marketingEmails' as keyof VendorBusinessPreferences,
      icon: TrendingUp,
      color: 'text-pink-600',
      title: 'Marketing Emails',
      description: 'Business growth tips and marketing opportunities',
      requiresBusiness: true
    }
  ];

  const isOptionDisabled = (option: typeof coreNotificationOptions[0]): boolean => {
    return option.requiresEmail && !preferences.email;
  };

  const isBusinessOptionDisabled = (option: typeof businessNotificationOptions[0]): boolean => {
    return option.requiresBusiness && !businessPreferences.emailNotifications;
  };

  return (
    <div className="space-y-6">
      {/* Core Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            General Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {coreNotificationOptions.map((option, index) => (
              <React.Fragment key={option.key}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <option.icon className={`w-5 h-5 ${option.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{option.title}</p>
                        {option.isCore && (
                          <Badge variant="outline" className="text-xs">
                            Core
                          </Badge>
                        )}
                        {isOptionDisabled(option) && (
                          <Badge variant="secondary" className="text-xs">
                            Requires Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      {isOptionDisabled(option) && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            Enable email notifications first
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={preferences[option.key]}
                    onCheckedChange={(checked) => onChange(option.key, checked)}
                    disabled={isOptionDisabled(option)}
                  />
                </div>
                {index < coreNotificationOptions.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Business Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {businessNotificationOptions.map((option, index) => (
              <React.Fragment key={option.key}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <option.icon className={`w-5 h-5 ${option.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{option.title}</p>
                        {option.isCore && (
                          <Badge variant="outline" className="text-xs">
                            Core
                          </Badge>
                        )}
                        {isBusinessOptionDisabled(option) && (
                          <Badge variant="secondary" className="text-xs">
                            Requires Business Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      {isBusinessOptionDisabled(option) && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            Enable business email notifications first
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={businessPreferences[option.key]}
                    onCheckedChange={(checked) => onBusinessChange(option.key, checked)}
                    disabled={isBusinessOptionDisabled(option)}
                  />
                </div>
                {index < businessNotificationOptions.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons Section */}
      {showTestButtons && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Test Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {onTestPushNotification && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onTestPushNotification}
                  disabled={!preferences.push}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Test Push Notification
                </Button>
              )}
              
              {onTestEmail && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onTestEmail}
                  disabled={!preferences.email}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Test Email
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorNotificationSettings;
