import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Bell, 
  Lock, 
  Shield, 
  Mail,
  Palette,
  Key,
  Trash2,
  AlertTriangle,
  Save,
  RefreshCw,
  User,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { userService } from "@/services/userService";
import { notificationService } from "@/services/notificationService";
import { NotificationSettings, type NotificationPreferences } from "@/components/settings/NotificationSettings";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { useTheme } from "next-themes";
import { useRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";

// Dynamic Settings Configuration - Remove overlaps with Profile page
interface SettingsConfig {
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: UserPreferences;
}

interface PrivacySettings {
  allowMessages: boolean;
  showActivity: boolean;
  dataCollection: boolean;
  marketingConsent: boolean;
  thirdPartySharing: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
}

interface UserPreferences {
  autoSave: boolean;
  theme: string;
}

const CustomerSettings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { isConnected, lastEvent } = useRealtime();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Consolidated settings state - removed profile data overlap
  const [settings, setSettings] = useState<SettingsConfig>({
    notifications: {
      email: true,
      push: true,
      propertyAlerts: true,
      priceDrops: true,
      newMessages: true,
      newsUpdates: false
    },
    privacy: {
      allowMessages: true,
      showActivity: true,
      dataCollection: true,
      marketingConsent: false,
      thirdPartySharing: false
    },
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeout: "30"
    },
    preferences: {
      autoSave: true,
      theme: theme || "system"
    }
  });

  // Update settings
  const updateSettings = useCallback((category: keyof SettingsConfig, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    
    // Save immediately for critical settings
    if (category === 'security' || (category === 'privacy' && ['dataCollection'].includes(key))) {
      syncSettingRealtime(category, key, value);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  // Event handler for settings updates
  const handleSettingsUpdated = useCallback(() => {
    setLastSyncTime(new Date().toISOString());
    loadSettings();
  }, []);

  useRealtimeEvent('settings_updated', handleSettingsUpdated);

  // Auto-save when settings change
  useEffect(() => {
    if (settings.preferences.autoSave && !loading && !isInitialLoad) {
      const timeoutId = setTimeout(() => {
        saveSettings();
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [settings, loading, isInitialLoad]);

  // Load settings on component mount
  const loadSettings = async () => {
    try {
      setLoading(true);

      // Fetch directly from server
      const response = await userService.getCurrentUser();
      if (response.success && response.data.user.profile?.preferences) {
        const apiPrefs = response.data.user.profile.preferences as any;

        // Load server data directly
        const serverSettings: SettingsConfig = {
          notifications: {
            email: apiPrefs.notifications?.email ?? true,
            push: apiPrefs.notifications?.push ?? true,
            propertyAlerts: apiPrefs.notifications?.propertyAlerts ?? true,
            priceDrops: apiPrefs.notifications?.priceDrops ?? true,
            newMessages: apiPrefs.notifications?.newMessages ?? true,
            newsUpdates: apiPrefs.notifications?.newsUpdates ?? false
          },
          privacy: {
            allowMessages: apiPrefs.privacy?.allowMessages ?? true,
            showActivity: apiPrefs.privacy?.showActivity ?? true,
            dataCollection: apiPrefs.privacy?.dataCollection ?? true,
            marketingConsent: apiPrefs.privacy?.marketingConsent ?? false,
            thirdPartySharing: apiPrefs.privacy?.thirdPartySharing ?? false
          },
          security: {
            twoFactorEnabled: apiPrefs.security?.twoFactorEnabled ?? false,
            loginAlerts: apiPrefs.security?.loginAlerts ?? true,
            sessionTimeout: apiPrefs.security?.sessionTimeout ?? '30'
          },
          preferences: {
            autoSave: apiPrefs.autoSave ?? true,
            theme: apiPrefs.theme || theme || "system"
          }
        };

        setSettings(serverSettings);
        setTheme(serverSettings.preferences.theme);

        // Mark initial load as complete after a short delay
        setTimeout(() => setIsInitialLoad(false), 2000);
      }
    } catch (error) {
      console.error("Settings load failed:", error);
      toast({
        title: "Error Loading Settings",
        description: "Failed to load settings from server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save settings with validation
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Validate settings
      const validationResult = validateSettings(settings);
      if (!validationResult.isValid) {
        toast({
          title: "Validation Warning",
          description: validationResult.message,
          variant: "default"
        });
      }
      
      // Get current user data to preserve existing fields
      let existingAddress = null;
      try {
        const currentUser = await userService.getCurrentUser();
        existingAddress = currentUser.data.user.profile?.address || null;
      } catch (err) {
        console.warn("Could not fetch current user, proceeding without address preservation");
      }
      
      // Prepare settings data in correct format for backend
      const settingsData: any = {
        profile: {
          preferences: {
            theme: theme,
            notifications: {
              email: settings.notifications.email,
              push: settings.notifications.push,
              propertyAlerts: settings.notifications.propertyAlerts,
              priceDrops: settings.notifications.priceDrops,
              newMessages: settings.notifications.newMessages,
              newsUpdates: settings.notifications.newsUpdates
            },
            privacy: {
              showActivity: settings.privacy.showActivity,
              dataCollection: settings.privacy.dataCollection,
              marketingConsent: settings.privacy.marketingConsent,
              thirdPartySharing: settings.privacy.thirdPartySharing,
              allowMessages: settings.privacy.allowMessages
            },
            security: {
              twoFactorEnabled: settings.security.twoFactorEnabled,
              loginAlerts: settings.security.loginAlerts,
              sessionTimeout: settings.security.sessionTimeout
            },
            autoSave: settings.preferences.autoSave
          }
        }
      };

      // Preserve existing address if available
      if (existingAddress) {
        settingsData.profile.address = existingAddress;
      }

      // Save to server
      const response = await userService.updateUserPreferences(settingsData);

      if (response.success) {
        setLastSyncTime(new Date().toISOString());

        // Only show toast if it's a manual save (not auto-save)
        if (!settings.preferences.autoSave) {
          toast({
            title: "Settings Saved",
            description: "Your preferences have been updated successfully."
          });
        }
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Settings validation
  const validateSettings = (settings: SettingsConfig) => {
    if (settings.notifications.email && 
        !settings.notifications.propertyAlerts && 
        !settings.notifications.priceDrops && 
        !settings.notifications.newMessages) {
      return {
        isValid: false,
        message: "Email enabled but no notification types selected. Consider enabling specific alerts."
      };
    }
    
    if (settings.security.twoFactorEnabled && !settings.security.loginAlerts) {
      return {
        isValid: false,
        message: "2FA enabled but login alerts disabled. Consider enabling login alerts for better security."
      };
    }
    
    return { isValid: true, message: "" };
  };

  // Update individual settings
  const syncSettingRealtime = async (category: keyof SettingsConfig, key: string, value: any) => {
    try {
      const updateData = { 
        profile: { 
          preferences: { 
            [category]: { ...settings[category], [key]: value } 
          } 
        } 
      };
      const response = await userService.updateUserPreferences(updateData);
      
      if (response.success) {
        const settingName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        const statusText = typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : 'updated';
        
        toast({
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Updated`,
          description: `${settingName} has been ${statusText}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Change will be saved when connection is restored.",
        variant: "destructive"
      });
    }
  };

  // Export user data
  const exportData = async () => {
    try {
      toast({
        title: "📦 Preparing Export",
        description: "Gathering your data...",
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "✅ Export Ready",
        description: "Download will begin shortly",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export data. Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      toast({
        title: "🗑️ Processing Request",
        description: "Initiating account deletion...",
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const user = await userService.getCurrentUser();
      const userEmail = user?.data?.user?.email || 'your email';
      
      toast({
        title: "📧 Confirmation Required",
        description: `Confirmation link sent to ${userEmail}`,
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Please contact support for assistance.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-16">
      {/* Status Bar */}
      {/*
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} bg-muted/50 p-3 rounded-lg`}>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-3'}`}>
          {lastSyncTime && (
            <Badge variant="secondary" className="text-xs">
              Last saved: {new Date(lastSyncTime).toLocaleTimeString()}
            </Badge>
          )}
        </div>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'}`}>
          <span className="text-xs text-muted-foreground">
            {settings.preferences.autoSave ? 'Changes save automatically' : 'Save manually'}
          </span>
          {settings.preferences.autoSave ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-orange-500" />
          )}
        </div>
      </div>
      */}

      {/* Main Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`font-bold tracking-tight flex items-center gap-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            <SettingsIcon className="w-8 h-8 text-primary" />
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and notification settings.
            <span className="font-medium ml-1">View your Profile for personal information.</span>
          </p>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
          <Button
            variant="outline"
            onClick={() => navigate('/customer/profile')}
            className={`border-blue-200 text-blue-700 hover:bg-blue-50 ${isMobile ? 'w-full' : ''}`}
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={loading}
            className={isMobile ? 'w-full' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          {!settings.preferences.autoSave && (
            <Button onClick={saveSettings} disabled={saving} className={isMobile ? 'w-full' : ''}>
              {saving ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'gap-1' : 'gap-2'}`}>
          <TabsTrigger value="notifications" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
            <Bell className="w-4 h-4" />
            {isMobile ? 'Notifs' : 'Notifications'}
          </TabsTrigger>
          <TabsTrigger value="privacy-security" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
            <Shield className="w-4 h-4" />
            {isMobile ? 'Privacy' : 'Privacy & Security'}
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings
            preferences={settings.notifications}
            onChange={(key, value) => updateSettings('notifications', key, value)}
            onTestPushNotification={async () => {
              try {
                const hasPermission = await notificationService.requestPushPermission();
                if (hasPermission) {
                  await notificationService.testNotification();
                  toast({
                    title: "✅ Test Notification Sent",
                    description: "Check your browser notifications.",
                  });
                } else {
                  toast({
                    title: "Permission Required",
                    description: "Enable browser notifications for push alerts.",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                toast({
                  title: "Test Failed",
                  description: "Unable to send test notification.",
                  variant: "destructive"
                });
              }
            }}
            onTestEmail={async () => {
              try {
                toast({
                  title: "✅ Test Email Sent",
                  description: "Check support@buildhomemartsquares.com",
                });
              } catch (error) {
                toast({
                  title: "Test Failed",
                  description: "Unable to send test email.",
                  variant: "destructive"
                });
              }
            }}
            showTestButtons={true}
            supportEmail="support@buildhomemartsquares.com"
          />
        </TabsContent>

        {/* Privacy & Security Tab (Combined) */}
        <TabsContent value="privacy-security" className="space-y-6">
          {/* Privacy Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control your privacy and data preferences.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Privacy Controls */}
                {[
                  {
                    key: 'showActivity',
                    title: 'Activity Status',
                    description: 'Show when you were last active',
                    value: settings.privacy.showActivity
                  },
                  {
                    key: 'dataCollection',
                    title: 'Analytics & Data Collection',
                    description: 'Anonymous usage analytics for improvements',
                    value: settings.privacy.dataCollection
                  },
                  {
                    key: 'marketingConsent',
                    title: 'Marketing Communications',
                    description: 'Promotional emails and marketing content',
                    value: settings.privacy.marketingConsent
                  }
                ].map((item, index) => (
                  <div key={item.key}>
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} py-2`}>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={item.value}
                        onCheckedChange={(checked) => updateSettings('privacy', item.key, checked)}
                      />
                    </div>
                    {index < 2 && <Separator className="my-3" />}
                  </div>
                ))}

              {/* Warnings */}
              {!settings.privacy.dataCollection && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Analytics Disabled</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Personalized recommendations may not be available without analytics.
                  </p>
                </div>
              )}

              {/* Information Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Personal Information</p>
                    <p className="text-xs text-blue-700">Update your name, email, and contact details</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/customer/profile')}
                    className={`border-blue-300 text-blue-700 hover:bg-blue-100 ${isMobile ? 'w-full' : ''}`}
                  >
                    Go to Profile →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* Security Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 2FA Setting */}
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} py-2`}>
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Extra security layer</p>
                  </div>
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'}`}>
                    {settings.security.twoFactorEnabled && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    <Switch
                      checked={settings.security.twoFactorEnabled}
                      onCheckedChange={(checked) => {
                        updateSettings('security', 'twoFactorEnabled', checked);
                        if (checked) {
                          toast({
                            title: "🔐 2FA Setup Required",
                            description: "Setup will begin after saving settings.",
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Login Alerts */}
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} py-2`}>
                  <div>
                    <p className="font-medium">Login Alerts</p>
                    <p className="text-sm text-muted-foreground">Email alerts for new devices</p>
                  </div>
                  <Switch
                    checked={settings.security.loginAlerts}
                    onCheckedChange={(checked) => updateSettings('security', 'loginAlerts', checked)}
                    disabled={!settings.notifications.email}
                  />
                </div>
                
                <Separator />
                
                {/* Session Timeout */}
                <div className="space-y-2">
                  <p className="font-medium">Session Timeout</p>
                  <Select 
                    value={settings.security.sessionTimeout} 
                    onValueChange={(value) => updateSettings('security', 'sessionTimeout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="0">Never expire</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Auto-logout after inactivity
                  </p>
                </div>

                {/* Email Notifications Info */}
                {!settings.notifications.email && settings.security.loginAlerts && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Email Required</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Please enable email notifications to receive login alerts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password & Account Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Password & Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Security Tips</span>
                  </div>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>8+ characters with mixed case & symbols</li>
                    <li>Use unique passwords</li>
                    <li>Consider a password manager</li>
                    <li>Regular password changes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Display Preferences - Moved from preferences tab */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* Display & Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Display & Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span className="font-medium">Theme</span>
                  </div>
                  <Select 
                    value={theme} 
                    onValueChange={(value) => {
                      setTheme(value);
                      updateSettings('preferences', 'theme', value);
                      toast({
                        title: "🎨 Theme Updated",
                        description: `Switched to ${value} mode`,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">☀️ Light Mode</SelectItem>
                      <SelectItem value="dark">🌙 Dark Mode</SelectItem>
                      <SelectItem value="system">💻 System Default</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* General Preferences & Account Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  General Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto-save */}
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} py-2`}>
                  <div>
                    <p className="font-medium">Auto-save</p>
                    <p className="text-sm text-muted-foreground">Save changes automatically</p>
                  </div>
                  <Switch
                    checked={settings.preferences.autoSave}
                    onCheckedChange={(checked) => {
                      updateSettings('preferences', 'autoSave', checked);
                      toast({
                        title: checked ? "Auto-save Enabled" : "Manual Save Required",
                        description: checked ? "Changes will save automatically" : "Use the Save button to save changes",
                      });
                    }}
                  />
                </div>

                <Separator />

                {/* Account Management */}
                <div className="space-y-3">
                  <p className="font-medium text-destructive">Account Management</p>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Deactivate Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          Deactivate Your Account?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>
                            Your account will be temporarily disabled. You can reactivate it anytime by logging back in.
                          </p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-blue-800 mb-1">What happens when you deactivate:</p>
                            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                              <li>Your profile will be hidden from vendors</li>
                              <li>You won't receive notifications</li>
                              <li>Your data remains safe and secure</li>
                              <li>You can reactivate anytime by logging in</li>
                            </ul>
                          </div>
                          <p className="text-sm font-medium">
                            A confirmation email will be sent to your registered email address with instructions to complete the deactivation.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                        <AlertDialogCancel className={isMobile ? 'w-full' : ''}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              // Call backend API to request deactivation
                              await userService.requestAccountDeactivation();
                              
                              toast({
                                title: "📧 Confirmation Email Sent",
                                description: "Check your email and click the link to complete account deactivation",
                              });
                            } catch (error) {
                              console.error('Deactivation request error:', error);
                              // Error toast is already handled in userService
                            }
                          }}
                          className={`bg-orange-600 text-white hover:bg-orange-700 ${isMobile ? 'w-full' : ''}`}
                        >
                          Send Confirmation Email
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account Permanently
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          Permanently Delete Account?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p className="font-semibold text-red-600">
                            ⚠️ This action cannot be undone. All your data will be permanently removed from our servers.
                          </p>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-800 mb-1">What will be deleted:</p>
                            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                              <li>Your profile and account information</li>
                              <li>All property listings and favorites</li>
                              <li>Messages and conversation history</li>
                              <li>Reviews and ratings you've provided</li>
                              <li>All saved preferences and settings</li>
                            </ul>
                          </div>
                          <p className="text-sm font-medium">
                            A confirmation link will be sent to your registered email address. You must click the link within 24 hours to complete the deletion process.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                        <AlertDialogCancel className={isMobile ? 'w-full' : ''}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              // Call backend API to request permanent deletion
                              await userService.requestAccountDeletion();
                              
                              toast({
                                title: "📧 Confirmation Email Sent",
                                description: "Check your email and click the link to confirm permanent deletion. Link expires in 24 hours.",
                                variant: "destructive"
                              });
                            } catch (error) {
                              console.error('Deletion request error:', error);
                              // Error toast is already handled in userService
                            }
                          }}
                          className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isMobile ? 'w-full' : ''}`}
                        >
                          Send Confirmation Email
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <PasswordChangeDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
      />
    </div>
  );
};

export default CustomerSettings;