import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  Mail,
  Volume2,
  Globe,
  Palette,
  CreditCard,
  Shield,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  propertyAlerts: boolean;
  priceDrops: boolean;
  newMessages: boolean;
  newsUpdates: boolean;
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onChange: (key: keyof NotificationPreferences, value: boolean) => void;
  onTestPushNotification?: () => void;
  onTestEmail?: () => void;
  showTestButtons?: boolean;
  supportEmail?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onChange,
  onTestPushNotification,
  onTestEmail,
  showTestButtons = false,
  supportEmail = "support@buildhomemartsquares.com"
}) => {
  const notificationOptions = [
    {
      key: 'email' as keyof NotificationPreferences,
      icon: Mail,
      color: 'text-blue-500',
      title: 'Email Notifications',
      description: 'Receive updates and alerts via email',
      isCore: true
    },
    {
      key: 'push' as keyof NotificationPreferences,
      icon: Bell,
      color: 'text-purple-500',
      title: 'Push Notifications',
      description: 'Browser notifications for instant updates',
      isCore: true
    },
    {
      key: 'propertyAlerts' as keyof NotificationPreferences,
      icon: Volume2,
      color: 'text-orange-500',
      title: 'Property Alerts',
      description: 'New properties matching your criteria',
      requiresEmail: true
    },
    {
      key: 'priceDrops' as keyof NotificationPreferences,
      icon: CreditCard,
      color: 'text-red-500',
      title: 'Price Drop Alerts',
      description: 'Notifications when saved properties drop in price',
      requiresEmail: true
    },
    {
      key: 'newMessages' as keyof NotificationPreferences,
      icon: Bell,
      color: 'text-indigo-500',
      title: 'New Message Alerts',
      description: 'Get notified when you receive new messages',
      requiresEmail: true
    },
    {
      key: 'newsUpdates' as keyof NotificationPreferences,
      icon: Globe,
      color: 'text-teal-500',
      title: 'News & Updates',
      description: 'Real estate market news and platform updates',
      requiresEmail: true
    }
  ];

  const isOptionDisabled = (option: typeof notificationOptions[0]): boolean => {
    return option.requiresEmail && !preferences.email;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {notificationOptions.map((option, index) => (
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
                {index < notificationOptions.length - 1 && <Separator />}
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

export default NotificationSettings;
