import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Key,
  Save,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  TestTube,
  RotateCcw,
  CheckCircle,
  MapPin,
  Mail,
  BarChart
} from "lucide-react";
import { settingsService, type AdminSettings } from "@/services/settingsService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { locaService, type PincodeSuggestion } from "@/services/locaService";

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  // Track changes for each category
  const [hasChanges, setHasChanges] = useState({
    general: false,
    notifications: false,
    security: false,
    payment: false,
    system: false,
    integrations: false,
    location: false,
  });

  // Location data states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  // Email testing states
  const [testEmail, setTestEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailStats, setEmailStats] = useState<{ sent: number; failed: number } | null>(null);

  // Individual settings states for easy form handling
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "",
    siteDescription: "",
    contactEmail: "",
    supportEmail: "",
    maintenanceMode: false,
    registrationEnabled: true,
    defaultCurrency: "INR",
    defaultLanguage: "en",
    timezone: "Asia/Kolkata",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    adminAlerts: true,
    systemAlerts: true,
    userActivityAlerts: false,
    marketingEmails: true,
    weeklyReports: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    allowPasswordReset: true,
    autoLockAccount: true,
    ipWhitelisting: false,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    currency: "INR",
    taxRate: 18,
    processingFee: 2.5,
    refundPolicy: "7 days",
    autoRefund: false,
    paymentMethods: ["card", "upi", "netbanking"],
    minimumAmount: 100,
    maximumAmount: 1000000,
  });

  const [systemSettings, setSystemSettings] = useState({
    backupEnabled: true,
    backupFrequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    backupRetention: 30,
    maintenanceWindow: '02:00-04:00',
    debugMode: false,
    logLevel: 'info' as 'error' | 'warn' | 'info' | 'debug',
    performanceMode: 'balanced' as 'balanced' | 'performance' | 'memory',
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    emailProvider: 'smtp' as 'smtp' | 'sendgrid' | 'aws-ses',
    emailApiKey: '' as string | undefined,
    smsProvider: 'twilio' as 'twilio' | 'aws-sns' | 'firebase',
    smsApiKey: '' as string | undefined,
    paymentGateway: 'razorpay' as 'razorpay' | 'stripe' | 'paypal',
    paymentApiKey: '' as string | undefined,
    googleMapsApiKey: '' as string | undefined,
    cloudinaryApiKey: '' as string | undefined,
    firebaseConfig: {
      apiKey: '' as string | undefined,
      authDomain: '' as string | undefined,
      projectId: '' as string | undefined,
    } as { apiKey?: string; authDomain?: string; projectId?: string; } | undefined,
  });

  const [locationSettings, setLocationSettings] = useState({
    defaultCountry: 'India',
    defaultState: 'Karnataka',
    defaultDistrict: 'Bangalore',
    defaultCity: 'Bangalore',
    enableLocationAutodetection: true,
    locationDataSource: 'loca' as 'loca' | 'google' | 'mapbox',
    radiusUnit: 'km' as 'km' | 'miles',
    defaultRadius: 25,
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    initializeLocationService();
  }, []);

  // Initialize location service
  const initializeLocationService = async () => {
    try {
      setLocationLoading(true);
      await locaService.initialize();
      const statesList = locaService.getStates();
      setStates(statesList);
    } catch (error) {
      console.error("Error initializing location service:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Load cities when state changes
  useEffect(() => {
    if (locationSettings.defaultState && states.length > 0) {
      const districtsList = locaService.getDistricts(locationSettings.defaultState);
      setDistricts(districtsList);
    }
  }, [locationSettings.defaultState, states]);

  // Load cities when district changes
  useEffect(() => {
    if (locationSettings.defaultState && locationSettings.defaultDistrict && districts.length > 0) {
      const citiesList = locaService.getCities(locationSettings.defaultState, locationSettings.defaultDistrict);
      setCities(citiesList);
    }
  }, [locationSettings.defaultState, locationSettings.defaultDistrict, districts]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      
      if (response.success) {
        setSettings(response.data.settings);
        
        // Update individual state objects
        setGeneralSettings(response.data.settings.general);
        setNotificationSettings(response.data.settings.notifications);
        setSecuritySettings(response.data.settings.security);
        setPaymentSettings(response.data.settings.payment);
        if (response.data.settings.system) setSystemSettings(response.data.settings.system);
        if (response.data.settings.integrations) {
          setIntegrationSettings({
            ...integrationSettings,
            ...response.data.settings.integrations
          });
        }
        if (response.data.settings.location) {
          setLocationSettings(prev => ({
            ...prev,
            ...response.data.settings.location
          }));
        }
        
        // Reset change flags
        setHasChanges({
          general: false,
          notifications: false,
          security: false,
          payment: false,
          system: false,
          integrations: false,
          location: false,
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
    toast({
      title: "Settings Refreshed",
      description: "Settings have been refreshed successfully.",
    });
  };

  // Real-time sync for individual settings
  const syncSettingRealtime = async (category: keyof AdminSettings, key: string, value: any) => {
    try {
      await settingsService.syncSettingRealtime(category, key, value);
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Real-time sync failed:', error);
    }
  };

  // Generic save handler
  const handleSave = async (category: 'general' | 'notifications' | 'security' | 'payment' | 'system' | 'integrations' | 'location') => {
    const settingsMap = {
      general: generalSettings,
      notifications: notificationSettings,
      security: securitySettings,
      payment: paymentSettings,
      system: systemSettings,
      integrations: integrationSettings,
      location: locationSettings,
    };

    const validation = settingsService.validateSettings(category, settingsMap[category]);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, [category]: true }));
      
      const response = await settingsService.updateSettings({
        category,
        settings: settingsMap[category],
      });

      if (response.success) {
        // Update main settings state
        setSettings(response.data.settings);
        
        // Mark as no changes for this category
        setHasChanges(prev => ({ ...prev, [category]: false }));
        
        toast({
          title: "Success",
          description: `${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`,
        });
      }
    } catch (error) {
      console.error(`Failed to save ${category} settings:`, error);
    } finally {
      setSaving(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleSaveGeneral = () => handleSave('general');
  const handleSaveNotifications = () => handleSave('notifications');
  const handleSaveSecurity = () => handleSave('security');
  const handleSavePayment = () => handleSave('payment');
  const handleSaveSystem = () => handleSave('system');
  const handleSaveIntegrations = () => handleSave('integrations');
  const handleSaveLocation = () => handleSave('location');

  // Handle reset to defaults
  const handleReset = async (category: 'general' | 'notifications' | 'security' | 'payment' | 'system' | 'integrations' | 'location') => {
    try {
      setSaving(prev => ({ ...prev, [`${category}_reset`]: true }));
      
      const response = await settingsService.resetSettings(category);
      if (response.success) {
        // Update states with reset values
        setSettings(response.data.settings);
        
        // Handle reset for each category
        switch (category) {
          case 'general':
            setGeneralSettings(response.data.settings.general);
            break;
          case 'notifications':
            setNotificationSettings(response.data.settings.notifications);
            break;
          case 'security':
            setSecuritySettings(response.data.settings.security);
            break;
          case 'payment':
            setPaymentSettings(response.data.settings.payment);
            break;
          case 'system':
            if (response.data.settings.system) setSystemSettings(response.data.settings.system);
            break;
          case 'integrations':
            if (response.data.settings.integrations) {
              setIntegrationSettings({
                ...integrationSettings,
                ...response.data.settings.integrations
              });
            }
            break;
          case 'location':
            if (response.data.settings.location) setLocationSettings(response.data.settings.location);
            break;
        }
        
        setHasChanges(prev => ({ ...prev, [category]: false }));
      }
    } catch (error) {
      console.error(`Failed to reset ${category} settings:`, error);
    } finally {
      setSaving(prev => ({ ...prev, [`${category}_reset`]: false }));
    }
  };

  // Handle test notifications
  const handleTestNotification = async (type: 'email' | 'sms' | 'push') => {
    try {
      setTesting(prev => ({ ...prev, [type]: true }));
      await settingsService.testNotification(type);
    } catch (error) {
      console.error(`Failed to test ${type} notification:`, error);
    } finally {
      setTesting(prev => ({ ...prev, [type]: false }));
    }
  };

  // Handle test integrations
  const handleTestIntegration = async (type: 'email' | 'sms' | 'payment' | 'maps') => {
    try {
      setTesting(prev => ({ ...prev, [`${type}_integration`]: true }));
      await settingsService.testIntegration(type);
    } catch (error) {
      console.error(`Failed to test ${type} integration:`, error);
    } finally {
      setTesting(prev => ({ ...prev, [`${type}_integration`]: false }));
    }
  };

  // Handle settings export
  const handleExportSettings = async () => {
    try {
      const blob = await settingsService.exportSettings();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  };

  // Handle settings import
  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSaving(prev => ({ ...prev, import: true }));
      await settingsService.importSettings(file);
      await loadSettings(); // Reload settings after import
    } catch (error) {
      console.error('Failed to import settings:', error);
    } finally {
      setSaving(prev => ({ ...prev, import: false }));
      // Reset file input
      event.target.value = '';
    }
  };

  // Mark changes when settings are modified
  const markChanges = (category: 'general' | 'notifications' | 'security' | 'payment' | 'system' | 'integrations' | 'location') => {
    setHasChanges(prev => ({ ...prev, [category]: true }));
  };

  // Email testing functions
  const testEmailConnection = async () => {
    try {
      setTesting(prev => ({ ...prev, email_connection: true }));
      const response = await fetch('/api/admin/email/test-connection', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Email Connection Test",
          description: "Email connection successful!",
        });
      } else {
        toast({
          title: "Email Connection Failed",
          description: `Email connection failed: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Email connection test failed:', error);
      toast({
        title: "Connection Test Failed",
        description: "Failed to test email connection",
        variant: "destructive",
      });
    } finally {
      setTesting(prev => ({ ...prev, email_connection: false }));
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !selectedTemplate) {
      toast({
        title: "Missing Information",
        description: "Please enter email address and select template",
        variant: "destructive",
      });
      return;
    }

    try {
      setTesting(prev => ({ ...prev, send_test_email: true }));
      const response = await fetch('/api/admin/email/send-test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: testEmail,
          templateName: selectedTemplate
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent successfully to ${testEmail}`,
        });
      } else {
        toast({
          title: "Email Send Failed", 
          description: `Failed to send test email: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Send test email failed:', error);
      toast({
        title: "Email Send Failed",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setTesting(prev => ({ ...prev, send_test_email: false }));
    }
  };

  const getEmailStats = async () => {
    try {
      const response = await fetch('/api/admin/email/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailStats(result.stats);
        toast({
          title: "Email Statistics",
          description: "Email stats loaded successfully",
        });
      } else {
        toast({
          title: "Stats Load Failed",
          description: `Failed to get email stats: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Get email stats failed:', error);
      toast({
        title: "Stats Load Failed",
        description: "Failed to get email stats",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 relative top-[60px]">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span className="text-lg">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 relative top-[60px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshSettings} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Show unsaved changes warning */}
      {Object.values(hasChanges).some(Boolean) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your settings before leaving this page.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Settings Management Actions - Commented out for Super Admin */}
      {/* 
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Settings Management</h3>
              <p className="text-xs text-muted-foreground">
                {lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'No recent sync'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportSettings}>
                Export Settings
              </Button>
              <label htmlFor="import-settings">
                <Button variant="outline" size="sm" asChild disabled={saving.import}>
                  <span className="cursor-pointer">
                    {saving.import ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Import Settings'
                    )}
                  </span>
                </Button>
              </label>
              <input
                id="import-settings"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      */}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          {/* Commented out Payment, System, and Integration Settings for SuperAdmin
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          */}
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Manage your website's basic information and general settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => {
                      setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }));
                      markChanges('general');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={generalSettings.contactEmail}
                    onChange={(e) => {
                      setGeneralSettings(prev => ({ ...prev, contactEmail: e.target.value }));
                      markChanges('general');
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, siteDescription: e.target.value }));
                    markChanges('general');
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, supportEmail: e.target.value }));
                    markChanges('general');
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Input
                    id="defaultCurrency"
                    value="INR (₹)"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <Input
                    id="defaultLanguage"
                    value="English"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value="India (IST)"
                    disabled
                  />
                </div>
              </div>

              {/* Commented out Site Status Section for SuperAdmin
              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Site Status</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    {generalSettings.maintenanceMode && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <Switch
                    id="maintenanceMode"
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="registrationEnabled">User Registration</Label>
                    {generalSettings.registrationEnabled && (
                      <Badge variant="default">
                        <Info className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                  </div>
                  <Switch
                    id="registrationEnabled"
                    checked={generalSettings.registrationEnabled}
                    onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, registrationEnabled: checked }))}
                  />
                </div>
              </div>
              */}

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when notifications are sent to users and administrators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Notification Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <Switch
                      id="emailNotifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => {
                        setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }));
                        markChanges('notifications');
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adminAlerts">Admin Alerts</Label>
                    <Switch
                      id="adminAlerts"
                      checked={notificationSettings.adminAlerts}
                      onCheckedChange={(checked) => {
                        setNotificationSettings(prev => ({ ...prev, adminAlerts: checked }));
                        markChanges('notifications');
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="systemAlerts">System Alerts</Label>
                    <Switch
                      id="systemAlerts"
                      checked={notificationSettings.systemAlerts}
                      onCheckedChange={(checked) => {
                        setNotificationSettings(prev => ({ ...prev, systemAlerts: checked }));
                        markChanges('notifications');
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Commented out additional notification settings for Super Admin
              <div className="space-y-4">
                <h4 className="text-sm font-medium">User Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <Switch
                      id="smsNotifications"
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <Switch
                      id="pushNotifications"
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="userActivityAlerts">User Activity Alerts</Label>
                    <Switch
                      id="userActivityAlerts"
                      checked={notificationSettings.userActivityAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, userActivityAlerts: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    <Switch
                      id="marketingEmails"
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weeklyReports">Weekly Reports</Label>
                    <Switch
                      id="weeklyReports"
                      checked={notificationSettings.weeklyReports}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, weeklyReports: checked }))}
                    />
                  </div>
                </div>
              </div>
              */}

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and authentication requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="480"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }));
                      markChanges('security');
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    JWT token expiration time. Users will be logged out after this duration of inactivity.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="3"
                    max="20"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }));
                      markChanges('security');
                      syncSettingRealtime('security', 'maxLoginAttempts', parseInt(e.target.value));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum failed login attempts before account lockout.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockoutDuration">Account Lockout Duration (minutes)</Label>
                <Input
                  id="lockoutDuration"
                  type="number"
                  min="5"
                  max="1440"
                  value={securitySettings.lockoutDuration}
                  onChange={(e) => {
                    setSecuritySettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }));
                    markChanges('security');
                    syncSettingRealtime('security', 'lockoutDuration', parseInt(e.target.value));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  After {securitySettings.maxLoginAttempts} failed login attempts, users will be locked out for {securitySettings.lockoutDuration} minutes or must reset their password. This setting applies dynamically to all user types.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Authentication</h4>
                <div className="space-y-4">
                  {/* Commented out Two-Factor Authentication for Super Admin
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label htmlFor="twoFactorAuth">Two-Factor Authentication (2FA)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable 2FA for enhanced account security
                      </p>
                    </div>
                    <Switch
                      id="twoFactorAuth"
                      checked={securitySettings.twoFactorAuth}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }));
                        markChanges('security');
                      }}
                    />
                  </div>
                  */}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment processing and billing settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Input
                    id="currency"
                    value={paymentSettings.currency}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={paymentSettings.taxRate}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="processingFee">Processing Fee (%)</Label>
                  <Input
                    id="processingFee"
                    type="number"
                    step="0.1"
                    value={paymentSettings.processingFee}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, processingFee: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refundPolicy">Refund Policy</Label>
                  <Input
                    id="refundPolicy"
                    value={paymentSettings.refundPolicy}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, refundPolicy: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Automation</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefund">Automatic Refunds</Label>
                  <Switch
                    id="autoRefund"
                    checked={paymentSettings.autoRefund}
                    onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, autoRefund: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePayment} disabled={saving.payment}>
                  {saving.payment ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Payment Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system maintenance, backups, and performance settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Backup Configuration</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="backupEnabled">Enable Automatic Backups</Label>
                  <Switch
                    id="backupEnabled"
                    checked={systemSettings.backupEnabled}
                    onCheckedChange={(checked) => {
                      setSystemSettings(prev => ({ ...prev, backupEnabled: checked }));
                      markChanges('system');
                      syncSettingRealtime('system', 'backupEnabled', checked);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select 
                      value={systemSettings.backupFrequency}
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => {
                        setSystemSettings(prev => ({ ...prev, backupFrequency: value }));
                        markChanges('system');
                        syncSettingRealtime('system', 'backupFrequency', value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backupRetention">Backup Retention (days)</Label>
                    <Input
                      id="backupRetention"
                      type="number"
                      min="1"
                      max="365"
                      value={systemSettings.backupRetention}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setSystemSettings(prev => ({ ...prev, backupRetention: value }));
                        markChanges('system');
                      }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">System Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="performanceMode">Performance Mode</Label>
                    <Select 
                      value={systemSettings.performanceMode}
                      onValueChange={(value: 'balanced' | 'performance' | 'memory') => {
                        setSystemSettings(prev => ({ ...prev, performanceMode: value }));
                        markChanges('system');
                        syncSettingRealtime('system', 'performanceMode', value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="performance">High Performance</SelectItem>
                        <SelectItem value="memory">Memory Optimized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select 
                      value={systemSettings.logLevel}
                      onValueChange={(value: 'error' | 'warn' | 'info' | 'debug') => {
                        setSystemSettings(prev => ({ ...prev, logLevel: value }));
                        markChanges('system');
                        syncSettingRealtime('system', 'logLevel', value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error Only</SelectItem>
                        <SelectItem value="warn">Warnings</SelectItem>
                        <SelectItem value="info">Information</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceWindow">Maintenance Window</Label>
                  <Input
                    id="maintenanceWindow"
                    value={systemSettings.maintenanceWindow}
                    onChange={(e) => {
                      setSystemSettings(prev => ({ ...prev, maintenanceWindow: e.target.value }));
                      markChanges('system');
                    }}
                    placeholder="e.g., 02:00-04:00"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="debugMode">Debug Mode</Label>
                  <Switch
                    id="debugMode"
                    checked={systemSettings.debugMode}
                    onCheckedChange={(checked) => {
                      setSystemSettings(prev => ({ ...prev, debugMode: checked }));
                      markChanges('system');
                      syncSettingRealtime('system', 'debugMode', checked);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleReset('system')} 
                  disabled={saving.system_reset}
                >
                  {saving.system_reset ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Reset to Defaults
                </Button>
                <Button onClick={handleSaveSystem} disabled={saving.system}>
                  {saving.system ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure third-party service integrations and API keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Service</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailProvider">Email Provider</Label>
                    <Select 
                      value={integrationSettings.emailProvider}
                      onValueChange={(value: 'smtp' | 'sendgrid' | 'aws-ses') => {
                        setIntegrationSettings(prev => ({ ...prev, emailProvider: value }));
                        markChanges('integrations');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="aws-ses">AWS SES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailApiKey">Email API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="emailApiKey"
                        type="password"
                        value={integrationSettings.emailApiKey}
                        onChange={(e) => {
                          setIntegrationSettings(prev => ({ ...prev, emailApiKey: e.target.value }));
                          markChanges('integrations');
                        }}
                        placeholder="Enter API key..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestIntegration('email')}
                        disabled={testing.email_integration}
                      >
                        {testing.email_integration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Testing Section */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h5 className="text-sm font-medium mb-4 text-gray-700">Email Testing & Management</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="testEmail">Test Email Address</Label>
                      <Input
                        id="testEmail"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="Enter email to test"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailTemplate">Email Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Welcome Email</SelectItem>
                          <SelectItem value="password-reset">Password Reset</SelectItem>
                          <SelectItem value="vendor-welcome">Vendor Welcome</SelectItem>
                          <SelectItem value="customer-booking-confirmation">Booking Confirmation</SelectItem>
                          <SelectItem value="service-status-update">Service Update</SelectItem>
                          <SelectItem value="weekly-report">Weekly Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Actions</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={testEmailConnection}
                          disabled={testing.email_connection}
                        >
                          {testing.email_connection ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={sendTestEmail}
                          disabled={testing.send_test_email || !testEmail || !selectedTemplate}
                        >
                          {testing.send_test_email ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={getEmailStats}
                        >
                          <BarChart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {emailStats && (
                    <div className="mt-4 p-3 bg-white rounded-md border">
                      <h6 className="text-xs font-medium text-gray-600 mb-2">Email Statistics</h6>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Sent: <strong>{emailStats.sent}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Failed: <strong>{emailStats.failed}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">SMS Service</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smsProvider">SMS Provider</Label>
                    <Select 
                      value={integrationSettings.smsProvider}
                      onValueChange={(value: 'twilio' | 'aws-sns' | 'firebase') => {
                        setIntegrationSettings(prev => ({ ...prev, smsProvider: value }));
                        markChanges('integrations');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="aws-sns">AWS SNS</SelectItem>
                        <SelectItem value="firebase">Firebase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smsApiKey">SMS API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="smsApiKey"
                        type="password"
                        value={integrationSettings.smsApiKey}
                        onChange={(e) => {
                          setIntegrationSettings(prev => ({ ...prev, smsApiKey: e.target.value }));
                          markChanges('integrations');
                        }}
                        placeholder="Enter API key..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestIntegration('sms')}
                        disabled={testing.sms_integration}
                      >
                        {testing.sms_integration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Payment Gateway</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentGateway">Payment Provider</Label>
                    <Select 
                      value={integrationSettings.paymentGateway}
                      onValueChange={(value: 'razorpay' | 'stripe' | 'paypal') => {
                        setIntegrationSettings(prev => ({ ...prev, paymentGateway: value }));
                        markChanges('integrations');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentApiKey">Payment API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="paymentApiKey"
                        type="password"
                        value={integrationSettings.paymentApiKey}
                        onChange={(e) => {
                          setIntegrationSettings(prev => ({ ...prev, paymentApiKey: e.target.value }));
                          markChanges('integrations');
                        }}
                        placeholder="Enter API key..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestIntegration('payment')}
                        disabled={testing.payment_integration}
                      >
                        {testing.payment_integration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Other Integrations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="googleMapsApiKey">Google Maps API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="googleMapsApiKey"
                        type="password"
                        value={integrationSettings.googleMapsApiKey}
                        onChange={(e) => {
                          setIntegrationSettings(prev => ({ ...prev, googleMapsApiKey: e.target.value }));
                          markChanges('integrations');
                        }}
                        placeholder="Enter Google Maps API key..."
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestIntegration('maps')}
                        disabled={testing.maps_integration}
                      >
                        {testing.maps_integration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cloudinaryApiKey">Cloudinary API Key</Label>
                    <Input
                      id="cloudinaryApiKey"
                      type="password"
                      value={integrationSettings.cloudinaryApiKey}
                      onChange={(e) => {
                        setIntegrationSettings(prev => ({ ...prev, cloudinaryApiKey: e.target.value }));
                        markChanges('integrations');
                      }}
                      placeholder="Enter Cloudinary API key..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveIntegrations} disabled={saving.integrations}>
                  {saving.integrations ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Integration Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Settings */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Settings
              </CardTitle>
              <CardDescription>
                Configure default location settings and location data sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Default Location</h4>
                <p className="text-xs text-muted-foreground">
                  Set default location for the platform using the integrated location service (loca.json).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCountry">Default Country</Label>
                    <Input
                      id="defaultCountry"
                      value="India"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Powered by loca.json service
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultState">Default State</Label>
                    <Select 
                      value={locationSettings.defaultState}
                      onValueChange={(value) => {
                        setLocationSettings(prev => ({ ...prev, defaultState: value, defaultDistrict: '', defaultCity: '' }));
                        markChanges('location');
                        syncSettingRealtime('location', 'defaultState', value);
                      }}
                      disabled={locationLoading || states.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={locationLoading ? "Loading states..." : "Select state"} />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Powered by loca.json service
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultDistrict">Default District</Label>
                    <Select 
                      value={locationSettings.defaultDistrict}
                      onValueChange={(value) => {
                        setLocationSettings(prev => ({ ...prev, defaultDistrict: value, defaultCity: '' }));
                        markChanges('location');
                        syncSettingRealtime('location', 'defaultDistrict', value);
                      }}
                      disabled={!locationSettings.defaultState || districts.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!locationSettings.defaultState ? "Select state first" : "Select district"} />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Powered by loca.json service
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCity">Default City</Label>
                    <Select 
                      value={locationSettings.defaultCity}
                      onValueChange={(value) => {
                        setLocationSettings(prev => ({ ...prev, defaultCity: value }));
                        markChanges('location');
                        syncSettingRealtime('location', 'defaultCity', value);
                      }}
                      disabled={!locationSettings.defaultDistrict || cities.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!locationSettings.defaultDistrict ? "Select district first" : "Select city"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Powered by loca.json service
                    </p>
                  </div>
                </div>
              </div>

              {/* Commented out Location Services Section for SuperAdmin
              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Location Services</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableLocationAutodetection">Enable Location Autodetection</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically detect user location from IP address
                      </p>
                    </div>
                    <Switch
                      id="enableLocationAutodetection"
                      checked={locationSettings.enableLocationAutodetection}
                      onCheckedChange={(checked) => {
                        setLocationSettings(prev => ({ ...prev, enableLocationAutodetection: checked }));
                        markChanges('location');
                        syncSettingRealtime('location', 'enableLocationAutodetection', checked);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locationDataSource">Location Data Source</Label>
                      <Select 
                        value={locationSettings.locationDataSource}
                        onValueChange={(value: 'loca' | 'google' | 'mapbox') => {
                          setLocationSettings(prev => ({ ...prev, locationDataSource: value }));
                          markChanges('location');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="loca">Local Data (loca.json)</SelectItem>
                          <SelectItem value="google">Google Places API</SelectItem>
                          <SelectItem value="mapbox">Mapbox API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radiusUnit">Distance Unit</Label>
                      <Select 
                        value={locationSettings.radiusUnit}
                        onValueChange={(value: 'km' | 'miles') => {
                          setLocationSettings(prev => ({ ...prev, radiusUnit: value }));
                          markChanges('location');
                          syncSettingRealtime('location', 'radiusUnit', value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="km">Kilometers</SelectItem>
                          <SelectItem value="miles">Miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultRadius">Default Search Radius</Label>
                      <Input
                        id="defaultRadius"
                        type="number"
                        min="1"
                        max="500"
                        value={locationSettings.defaultRadius}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setLocationSettings(prev => ({ ...prev, defaultRadius: value }));
                          markChanges('location');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              */}

              <div className="flex justify-end">
                <Button onClick={handleSaveLocation} disabled={saving.location}>
                  {saving.location ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Location Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;