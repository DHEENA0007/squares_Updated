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
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      title: 'Email Notifications',
      description: 'Receive updates and alerts via email',
      isCore: true
    },
    {
      key: 'push' as keyof VendorNotificationPreferences,
      icon: Bell,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      title: 'Push Notifications',
      description: 'Browser notifications for instant updates',
      isCore: true
    },
    {
      key: 'newMessages' as keyof VendorNotificationPreferences,
      icon: MessageSquare,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      title: 'New Message Alerts',
      description: 'Get notified when you receive new messages from customers',
      requiresEmail: true
    },
    {
      key: 'newsUpdates' as keyof VendorNotificationPreferences,
      icon: Globe,
      color: 'text-teal-500',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      title: 'News & Updates',
      description: 'Real estate market news and platform updates',
      requiresEmail: true
    },
    {
      key: 'marketing' as keyof VendorNotificationPreferences,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
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
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      title: 'Business Email Notifications',
      description: 'General business communications and updates',
      isCore: true
    },
    /*
    {
      key: 'smsNotifications' as keyof VendorBusinessPreferences,
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      title: 'SMS Notifications',
      description: 'Urgent alerts and time-sensitive notifications via SMS',
      isCore: true
    },
    {
      key: 'leadAlerts' as keyof VendorBusinessPreferences,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      title: 'Lead Alerts',
      description: 'Instant notifications when you receive new property inquiries',
      requiresBusiness: true
    },
    */
    {
      key: 'weeklyReports' as keyof VendorBusinessPreferences,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      title: 'Weekly Reports',
      description: 'Weekly performance reports and analytics',
      requiresBusiness: true
    },
    {
      key: 'marketingEmails' as keyof VendorBusinessPreferences,
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
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
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-primary" />
            General Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            {coreNotificationOptions.map((option, index) => (
              <React.Fragment key={option.key}>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${option.bgColor} transition-colors group-hover:scale-105 duration-200`}>
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{option.title}</p>
                        {option.isCore && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground">
                            Core
                          </Badge>
                        )}
                        {isOptionDisabled(option) && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                            Requires Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                      {isOptionDisabled(option) && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-1.5 rounded-lg w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Enable email notifications first</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={preferences[option.key]}
                    onCheckedChange={(checked) => onChange(option.key, checked)}
                    disabled={isOptionDisabled(option)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                {index < coreNotificationOptions.length - 1 && <Separator className="bg-border/50" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Notifications */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Business Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            {businessNotificationOptions.map((option, index) => (
              <React.Fragment key={option.key}>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${option.bgColor} transition-colors group-hover:scale-105 duration-200`}>
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{option.title}</p>
                        {option.isCore && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground">
                            Core
                          </Badge>
                        )}
                        {isBusinessOptionDisabled(option) && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30">
                            Requires Business Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                      {isBusinessOptionDisabled(option) && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-1.5 rounded-lg w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Enable business email notifications first</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={businessPreferences[option.key]}
                    onCheckedChange={(checked) => onBusinessChange(option.key, checked)}
                    disabled={isBusinessOptionDisabled(option)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                {index < businessNotificationOptions.length - 1 && <Separator className="bg-border/50" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorNotificationSettings;
