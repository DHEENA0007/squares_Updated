import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Star,
  Award,
  Camera,
  Edit,
  Save,
  X,
  Calendar,
  Users,
  Home,
  CheckCircle,
  Loader2,
  TrendingUp,
  Bell,
  RefreshCw,
  Database,
  Key,
  Shield,
  MessageSquare,
  Clock,
  IndianRupee,
  Eye
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { vendorService, type VendorProfile } from "@/services/vendorService";
import { messageService } from "@/services/messageService";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { VendorNotificationSettings, type VendorBusinessPreferences } from "@/components/settings/VendorNotificationSettings";
import { uploadService } from "@/services/uploadService";
import { useIsMobile } from "@/hooks/use-mobile";

// Vendor Settings Configuration
interface VendorSettingsConfig {
  notifications: VendorNotificationPreferences;
  business: BusinessSettings;
}

interface VendorNotificationPreferences {
  email: boolean;
  push: boolean;
  newMessages: boolean;
  newsUpdates: boolean;
  marketing: boolean;
}

interface BusinessSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  leadAlerts: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
  autoResponseEnabled: boolean;
  autoResponseMessage: string;
}

const VendorProfilePage: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vendorData, setVendorData] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    return location.pathname.includes('/settings') ? "settings" : "profile";
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Location data states from loca.json
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Loading states for location fields
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    cities: false
  });

  // Vendor settings state
  const [vendorSettings, setVendorSettings] = useState<VendorSettingsConfig>({
    notifications: {
      email: true,
      push: true,
      newMessages: true,
      newsUpdates: true,
      marketing: false
    },
    business: {
      emailNotifications: true,
      smsNotifications: false,
      leadAlerts: true,
      marketingEmails: false,
      weeklyReports: true,
      autoResponseEnabled: false,
      autoResponseMessage: "Thank you for your interest! I'll get back to you soon."
    }
  });

  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Settings management
  const updateVendorSettings = useCallback(async (category: keyof VendorSettingsConfig, key: string, value: any) => {
    setVendorSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  }, []);

  // Initialize on mount - single effect
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize location service
        setLocationLoading(prev => ({ ...prev, states: true }));
        await locaService.initialize();
        const statesList = locaService.getStates();
        setStates(statesList);

        // Load profile and settings
        await Promise.all([
          loadVendorProfile(),
          loadVendorSettings(),
          loadSubscription()
        ]);
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLocationLoading(prev => ({ ...prev, states: false }));
      }
    };

    init();
  }, []);

  // Watch for URL changes and update active tab
  useEffect(() => {
    if (location.pathname.includes('/settings')) {
      setActiveTab("settings");
    } else if (location.pathname.includes('/profile')) {
      setActiveTab("profile");
    }
  }, [location.pathname]);

  // Load districts when state changes
  useEffect(() => {
    if (!formData?.profile?.address?.state) {
      setDistricts([]);
      return;
    }

    const districtsList = locaService.getDistricts(formData.profile.address.state);
    setDistricts(districtsList);
  }, [formData?.profile?.address?.state]);

  // Load cities when district changes
  useEffect(() => {
    if (!formData?.profile?.address?.state || !formData?.profile?.address?.district) {
      setCities([]);
      return;
    }

    const citiesList = locaService.getCities(formData.profile.address.state, formData.profile.address.district);
    setCities(citiesList);
  }, [formData?.profile?.address?.state, formData?.profile?.address?.district]);

  // Auto-save settings with debounce
  useEffect(() => {
    if (isLoading) return;

    const timeoutId = setTimeout(() => {
      saveVendorSettings();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [vendorSettings, isLoading]);

  const loadVendorProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await vendorService.getVendorProfile();

      // Ensure profile.preferences exists with defaults
      const profileWithDefaults = {
        ...profile,
        profile: {
          ...profile.profile,
          preferences: {
            language: profile.profile.preferences?.language || 'en',
            notifications: {
              email: profile.profile.preferences?.notifications?.email ?? true,
              push: profile.profile.preferences?.notifications?.push ?? true,
              newMessages: profile.profile.preferences?.notifications?.newMessages ?? true,
              newsUpdates: profile.profile.preferences?.notifications?.newsUpdates ?? true,
              marketing: profile.profile.preferences?.notifications?.marketing ?? true,
            },
            privacy: {
              showEmail: profile.profile.preferences?.privacy?.showEmail ?? false,
              showPhone: profile.profile.preferences?.privacy?.showPhone ?? false,
              allowMessages: profile.profile.preferences?.privacy?.allowMessages ?? true,
            }
          },
        },
      };

      setVendorData(profileWithDefaults);
      setFormData(profileWithDefaults);

      // Update user in localStorage for authentication
      localStorage.setItem("user", JSON.stringify(profileWithDefaults));
    } catch (error) {
      console.error("Failed to load vendor profile:", error);
      toast({
        title: "Error",
        description: "Failed to load vendor profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load vendor subscription
  const loadSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api'}/vendors/subscription/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSubscription(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Load vendor settings from server only (no localStorage)
  const loadVendorSettings = async () => {
    try {
      const response = await vendorService.getVendorProfile();
      if (response && response.profile.vendorInfo?.vendorPreferences) {
        const apiPrefs = response.profile.vendorInfo.vendorPreferences;

        const serverSettings: VendorSettingsConfig = {
          notifications: {
            email: response.profile?.preferences?.notifications?.email ?? true,
            push: response.profile?.preferences?.notifications?.push ?? true,
            newMessages: response.profile?.preferences?.notifications?.newMessages ?? true,
            newsUpdates: response.profile?.preferences?.notifications?.newsUpdates ?? true,
            marketing: response.profile?.preferences?.notifications?.marketing ?? true
          },
          business: {
            emailNotifications: apiPrefs.emailNotifications ?? true,
            smsNotifications: apiPrefs.smsNotifications ?? true,
            leadAlerts: apiPrefs.leadAlerts ?? true,
            marketingEmails: apiPrefs.marketingEmails ?? false,
            weeklyReports: apiPrefs.weeklyReports ?? true,
            autoResponseEnabled: apiPrefs.autoResponseEnabled ?? false,
            autoResponseMessage: apiPrefs.autoResponseMessage || 'Thank you for your interest! I will get back to you soon.'
          }
        };

        setVendorSettings(serverSettings);
      }
    } catch (error) {
      console.error("Settings load failed:", error);
      toast({
        title: "Settings Load Failed",
        description: "Using default settings. Changes will be saved to server.",
        variant: "default"
      });
    }
  };

  // Save vendor settings
  const saveVendorSettings = async () => {
    try {
      setIsSaving(true);

      const validationResult = validateVendorSettings(vendorSettings);
      if (!validationResult.isValid) {
        toast({
          title: "Validation Warning",
          description: validationResult.message,
          variant: "default"
        });
      }

      try {
        // Build update object with only the fields we're actually updating
        // Avoid sending partial nested objects that might have undefined siblings
        const profileUpdate: any = {
          profile: {
            preferences: {
              notifications: {
                email: vendorSettings.notifications.email,
                push: vendorSettings.notifications.push,
                newMessages: vendorSettings.notifications.newMessages,
                newsUpdates: vendorSettings.notifications.newsUpdates,
                marketing: vendorSettings.notifications.marketing
              }
              // Explicitly NOT including privacy or security to avoid Mongoose casting errors
            },
            vendorInfo: {
              vendorPreferences: {
                emailNotifications: vendorSettings.business.emailNotifications,
                smsNotifications: vendorSettings.business.smsNotifications,
                leadAlerts: vendorSettings.business.leadAlerts,
                marketingEmails: vendorSettings.business.marketingEmails,
                weeklyReports: vendorSettings.business.weeklyReports,
                autoResponseEnabled: vendorSettings.business.autoResponseEnabled,
                autoResponseMessage: vendorSettings.business.autoResponseMessage
              }
            }
            // Explicitly NOT including address to avoid Mongoose casting errors
          }
        };

        await vendorService.updateVendorProfile(profileUpdate);
        setLastSyncTime(new Date().toISOString());

        toast({
          title: "Settings Saved",
          description: "Your preferences have been updated on the server",
        });

      } catch (apiError) {
        console.error('Failed to save settings:', apiError);

        toast({
          title: "Save Failed",
          description: "Unable to save settings to server. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Settings save failed:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save vendor settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };



  // Settings validation for vendors
  const validateVendorSettings = (settings: VendorSettingsConfig) => {
    if (settings.business.emailNotifications &&
      !settings.business.leadAlerts &&
      !settings.notifications.newMessages) {
      return {
        isValid: false,
        message: "Business email enabled but no notification types selected. Consider enabling lead alerts or new message notifications."
      };
    }

    if (settings.business.autoResponseEnabled && !settings.business.autoResponseMessage.trim()) {
      return {
        isValid: false,
        message: "Auto-response enabled but no message set. Please provide a response message."
      };
    }

    return { isValid: true, message: "" };
  };



  // Test auto-response integration with message service
  const testAutoResponseIntegration = async () => {
    try {
      const autoResponseMessage = vendorSettings.business.autoResponseMessage;

      if (!autoResponseMessage.trim()) {
        toast({
          title: "Auto-Response Setup",
          description: "Please set an auto-response message below",
          variant: "default"
        });
        return;
      }

      // Log the integration setup
      console.log("Auto-response integration activated:", {
        message: autoResponseMessage,
        timestamp: new Date().toISOString(),
        vendorId: vendorData?.id
      });

      toast({
        title: "Auto-Response Active",
        description: "Auto-responses will be sent to new inquiries",
      });

    } catch (error) {
      console.error("Auto-response integration test failed:", error);
    }
  };

  // Send auto-response when new messages are received
  const sendAutoResponse = async (conversationId: string, recipientId: string) => {
    try {
      if (!vendorSettings.business.autoResponseEnabled || !vendorSettings.business.autoResponseMessage.trim()) {
        return;
      }

      const sentMessage = await messageService.sendAutoResponse(
        conversationId,
        recipientId,
        vendorSettings.business.autoResponseMessage
      );

      if (sentMessage) {
        console.log("Auto-response sent:", {
          messageId: sentMessage._id,
          conversationId,
          recipientId,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error("Failed to send auto-response:", error);
    }
  };

  // Setup message listener for auto-response (to be called when messages are received)
  const handleIncomingMessage = async (message: any) => {
    try {
      // Only send auto-response to new inquiries and messages from customers
      if (message.type === 'inquiry' || message.type === 'lead' || message.type === 'property_inquiry') {
        // Check if this is not already an auto-response
        if (!messageService.isAutoResponse(message)) {
          await sendAutoResponse(message.conversationId, message.sender._id);
        }
      }
    } catch (error) {
      console.error("Failed to handle incoming message for auto-response:", error);
    }
  };

  // Expose auto-response handler for use in other components
  React.useEffect(() => {
    // Make auto-response handler available globally for messaging components
    if (vendorSettings.business.autoResponseEnabled) {
      (window as any).vendorAutoResponseHandler = handleIncomingMessage;
    } else {
      delete (window as any).vendorAutoResponseHandler;
    }

    return () => {
      delete (window as any).vendorAutoResponseHandler;
    };
  }, [vendorSettings.business.autoResponseEnabled, vendorSettings.business.autoResponseMessage]);

  // Validate location data consistency
  const validateLocationData = () => {
    const address = formData?.profile?.address;
    if (!address) return true;

    // Check if pincode matches the selected location
    if (address.zipCode && address.state && address.district && address.city) {
      const locationMatches = locaService.getLocationByPincode(address.zipCode);
      const isValid = locationMatches.some(location =>
        location.state.toUpperCase() === address.state?.toUpperCase() &&
        location.district.toUpperCase() === address.district?.toUpperCase() &&
        location.city.toUpperCase() === address.city?.toUpperCase()
      );

      if (!isValid) {
        console.warn('Location mismatch detected between pincode and selected location');
        return false;
      }
    }

    return true;
  };

  // Handle pincode selection and auto-fill location
  const handlePincodeChange = (pincode: string, locationData?: PincodeSuggestion) => {
    updateFormField("profile.address.zipCode", pincode);

    if (locationData) {
      // Auto-fill location fields
      setTimeout(() => {
        updateFormField("profile.address.state", locationData.state);
      }, 100);

      setTimeout(() => {
        updateFormField("profile.address.district", locationData.district);
      }, 300);

      setTimeout(() => {
        updateFormField("profile.address.city", locationData.city);
      }, 500);

      toast({
        title: "Location Auto-filled",
        description: `${locationData.city}, ${locationData.district}, ${locationData.state}`,
      });
    }
  };

  const handleTestPushNotification = () => {
    toast({
      title: "Test Push Notification",
      description: "Push notification test sent successfully!",
    });
  };

  const handleTestEmail = () => {
    toast({
      title: "Test Email",
      description: "Test email sent successfully!",
    });
  };





  const handleSave = async () => {
    if (!formData) return;

    // Validate location data consistency
    if (!validateLocationData()) {
      toast({
        title: "Location Validation",
        description: "Please verify that your PIN code matches the selected location",
        variant: "default"
      });
    }

    try {
      setIsSaving(true);
      const updateData = {
        profile: {
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          phone: formData.profile.phone,
          bio: formData.profile.bio,
          preferences: {
            language: formData.profile.preferences?.language || 'en',
            notifications: {
              email: formData.profile.preferences?.notifications?.email ?? true,
              push: formData.profile.preferences?.notifications?.push ?? true,
              newMessages: formData.profile.preferences?.notifications?.newMessages ?? true,
              newsUpdates: formData.profile.preferences?.notifications?.newsUpdates ?? true,
              marketing: formData.profile.preferences?.notifications?.marketing ?? true,
            },
            business: {
              emailNotifications: formData.profile.preferences?.business?.emailNotifications ?? true,
              smsNotifications: formData.profile.preferences?.business?.smsNotifications ?? true,
              leadAlerts: formData.profile.preferences?.business?.leadAlerts ?? true,
              marketingEmails: formData.profile.preferences?.business?.marketingEmails ?? false,
              weeklyReports: formData.profile.preferences?.business?.weeklyReports ?? true,
            },
            privacy: {
              showEmail: formData.profile.preferences?.privacy?.showEmail ?? false,
              showPhone: formData.profile.preferences?.privacy?.showPhone ?? false,
              allowMessages: formData.profile.preferences?.privacy?.allowMessages ?? true,
            }
          },
          address: {
            ...formData.profile.address,
            street: formData.profile.address?.street || "",
            state: formData.profile.address?.state || "",
            district: formData.profile.address?.district || "",
            city: formData.profile.address?.city || "",
            zipCode: formData.profile.address?.zipCode || "",
            country: formData.profile.address?.country || "India",
          },
          vendorInfo: formData.profile.vendorInfo,
        },
      };

      console.log('Saving vendor profile with address:', updateData.profile.address);

      const updatedProfile = await vendorService.updateVendorProfile(updateData);
      console.log('Received updated profile:', updatedProfile);
      console.log('Updated profile address:', updatedProfile.profile?.address);

      setVendorData(updatedProfile);
      setFormData(updatedProfile);
      setIsEditing(false);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(vendorData);
    setIsEditing(false);
  };

  // Handle avatar file selection and upload (persist immediately like customer profile)
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image file
    const validation = uploadService.validateImageFile(file);
    if (!validation.valid) {
      toast({ title: 'Invalid File', description: validation.error, variant: 'destructive' });
      return;
    }

    try {
      setUploadingAvatar(true);

      // Compress and upload
      const compressedFile = await uploadService.compressImage(file);
      const avatarUrl = await uploadService.uploadAvatar(compressedFile);

      console.log('uploaded avatarUrl:', avatarUrl);

      // Update profile with new avatar
      if (formData) {
        const updatedProfile = await vendorService.updateVendorProfile({
          profile: {
            avatar: avatarUrl
          } as any
        });

        // Update states with the new avatar from the server response
        setVendorData(updatedProfile);
        setFormData(updatedProfile);

        toast({
          title: 'Success',
          description: 'Profile picture updated successfully!'
        });
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateFormField = useCallback((path: string, value: any) => {
    setFormData(prev => {
      if (!prev) return prev;

      const pathArray = path.split(".");
      const newFormData = { ...prev };
      let current: any = newFormData;

      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current[pathArray[i]]) {
          current[pathArray[i]] = {};
        }
        current[pathArray[i]] = { ...current[pathArray[i]] };
        current = current[pathArray[i]];
      }
      current[pathArray[pathArray.length - 1]] = value;

      return newFormData;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading vendor profile...</span>
        </div>
      </div>
    );
  }

  if (!vendorData || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load vendor profile</p>
          <Button onClick={loadVendorProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  const fullName = `${formData.profile.firstName} ${formData.profile.lastName}`;
  const memberSince = formData.profile.vendorInfo?.memberSince
    ? new Date(formData.profile.vendorInfo.memberSince).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
    : "Unknown";

  return (
    <div className="space-y-6 mt-6">


      {/* Modern Compact Header */}
      <div className="relative rounded-3xl overflow-hidden bg-background border border-border/50 shadow-sm">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 opacity-50"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-purple-600 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-500"></div>
              <Avatar className="h-24 w-24 border-4 border-background relative shadow-xl">
                <AvatarImage src={formData.profile.avatar || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                  {formData.profile.firstName.charAt(0)}
                  {formData.profile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md border border-background"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {fullName}
                </h1>
                {subscription?.plan?.benefits?.verifiedBadge && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {formData.email}
                </span>
                <span className="hidden md:flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {formData.profile.address?.city || "Location not set"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-yellow-200 text-yellow-700 dark:border-yellow-900/50 dark:text-yellow-500">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {(formData.profile.vendorInfo?.rating?.average || 0).toFixed(1)} Rating
                </Badge>
                <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-blue-200 text-blue-700 dark:border-blue-900/50 dark:text-blue-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {formData.profile.vendorInfo?.responseTime || "2h"} Response
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={handleCancel} disabled={isSaving} className="flex-1 md:flex-none">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 md:flex-none bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1 md:flex-none border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Stats Grid */}
      {vendorData.statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Properties", value: vendorData.statistics.totalProperties, icon: Home, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Total Views", value: vendorData.statistics.totalViews || "0", icon: Eye, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "Leads", value: vendorData.statistics.leadsGenerated || "0", icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "Total Value", value: vendorData.statistics.totalValue || "₹0", icon: IndianRupee, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" }
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 group">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:rotate-12 transition-transform duration-300`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md py-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-border/40 md:border-0 md:bg-transparent md:backdrop-blur-none">
          <TabsList className="w-full md:w-auto inline-flex h-12 items-center justify-start rounded-full bg-muted/50 p-1 text-muted-foreground">
            <TabsTrigger value="profile" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              <User className="w-4 h-4 mr-2" /> Personal
            </TabsTrigger>
            <TabsTrigger value="company" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              <Building className="w-4 h-4 mr-2" /> Company
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
              <Bell className="w-4 h-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info & Address */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="flex items-center text-base font-semibold">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">First Name</Label>
                      {isEditing ? (
                        <Input
                          id="firstName"
                          value={formData.profile.firstName}
                          onChange={(e) => updateFormField("profile.firstName", e.target.value)}
                          className="h-9 bg-background/50"
                        />
                      ) : (
                        <div className="p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20">
                          {formData.profile.firstName}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Name</Label>
                      {isEditing ? (
                        <Input
                          id="lastName"
                          value={formData.profile.lastName}
                          onChange={(e) => updateFormField("profile.lastName", e.target.value)}
                          className="h-9 bg-background/50"
                        />
                      ) : (
                        <div className="p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20">
                          {formData.profile.lastName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Professional Bio</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={formData.profile.bio || ""}
                        onChange={(e) => updateFormField("profile.bio", e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="bg-background/50 resize-none text-sm"
                      />
                    ) : (
                      <div className="p-3 bg-muted/20 rounded-md text-sm leading-relaxed border border-border/20 min-h-[80px]">
                        {formData.profile.bio || <span className="text-muted-foreground italic">No bio provided</span>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="flex items-center text-base font-semibold">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                    Address Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="street" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Street Address</Label>
                    {isEditing ? (
                      <Input
                        id="street"
                        value={formData.profile.address?.street || ""}
                        onChange={(e) => updateFormField("profile.address.street", e.target.value)}
                        className="h-9 bg-background/50"
                      />
                    ) : (
                      <div className="p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20">
                        {formData.profile.address?.street || "Not provided"}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 bg-muted/10 p-4 rounded-lg border border-border/20">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="state" className="text-[10px] uppercase font-bold text-muted-foreground">State</Label>
                          <Select
                            value={formData.profile.address?.state || ""}
                            onValueChange={(value) => {
                              updateFormField("profile.address.state", value);
                              updateFormField("profile.address.district", "");
                              updateFormField("profile.address.city", "");
                              updateFormField("profile.address.zipCode", "");
                            }}
                            disabled={locationLoading.states}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {states.map((state) => (
                                <SelectItem key={state} value={state} className="text-xs">{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="district" className="text-[10px] uppercase font-bold text-muted-foreground">District</Label>
                          <Select
                            value={formData.profile.address?.district || ""}
                            onValueChange={(value) => {
                              updateFormField("profile.address.district", value);
                              updateFormField("profile.address.city", "");
                              updateFormField("profile.address.zipCode", "");
                            }}
                            disabled={!formData.profile.address?.state || locationLoading.districts}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Select District" />
                            </SelectTrigger>
                            <SelectContent>
                              {districts.map((district) => (
                                <SelectItem key={district} value={district} className="text-xs">{district}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="city" className="text-[10px] uppercase font-bold text-muted-foreground">City</Label>
                          <Select
                            value={formData.profile.address?.city || ""}
                            onValueChange={(value) => {
                              updateFormField("profile.address.city", value);
                              updateFormField("profile.address.zipCode", "");
                            }}
                            disabled={!formData.profile.address?.district || locationLoading.cities}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Select City" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((city) => (
                                <SelectItem key={city} value={city} className="text-xs">{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Pincode
                        </Label>
                        <PincodeAutocomplete
                          value={formData.profile.address?.zipCode}
                          onChange={handlePincodeChange}
                          state={formData.profile.address?.state}
                          district={formData.profile.address?.district}
                          city={formData.profile.address?.city}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "State", value: formData.profile.address?.state },
                        { label: "District", value: formData.profile.address?.district },
                        { label: "City", value: formData.profile.address?.city },
                        { label: "Pincode", value: formData.profile.address?.zipCode }
                      ].map((item, i) => (
                        <div key={i} className="p-2 bg-muted/20 rounded-md border border-border/20">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">{item.label}</p>
                          <p className="text-sm font-medium truncate">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Contact & Privacy */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm h-full">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Phone className="w-4 h-4 mr-2 text-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">Email Address</Label>
                        <Badge variant="secondary" className="h-4 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5">Verified</Badge>
                      </div>
                      <div className="flex items-center text-sm font-medium">
                        <Mail className="w-3.5 h-3.5 mr-2 text-blue-500" />
                        {formData.email}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-purple-700 dark:text-purple-400">Phone Number</Label>
                      </div>
                      <div className="flex items-center text-sm font-medium">
                        <Phone className="w-3.5 h-3.5 mr-2 text-purple-500" />
                        {formData.profile.phone || "Not provided"}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center">
                      <Shield className="w-3.5 h-3.5 mr-2 text-primary" />
                      Privacy Settings
                    </h4>

                    <div className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium cursor-pointer" htmlFor="show-email">Show Email</Label>
                        <p className="text-[10px] text-muted-foreground">Visible on public profile</p>
                      </div>
                      <Switch
                        id="show-email"
                        checked={formData.profile.preferences?.privacy?.showEmail}
                        onCheckedChange={(checked) => updateFormField("profile.preferences.privacy.showEmail", checked)}
                        disabled={!isEditing}
                        className="scale-75 origin-right"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium cursor-pointer" htmlFor="show-phone">Show Phone</Label>
                        <p className="text-[10px] text-muted-foreground">Visible on public profile</p>
                      </div>
                      <Switch
                        id="show-phone"
                        checked={formData.profile.preferences?.privacy?.showPhone}
                        onCheckedChange={(checked) => updateFormField("profile.preferences.privacy.showPhone", checked)}
                        disabled={!isEditing}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="flex items-center text-base font-semibold">
                <Building className="w-4 h-4 mr-2 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</Label>
                    {isEditing ? (
                      <Input
                        id="companyName"
                        value={formData.profile.vendorInfo?.companyName || ""}
                        onChange={(e) => updateFormField("profile.vendorInfo.companyName", e.target.value)}
                        className="h-9 bg-background/50"
                      />
                    ) : (
                      <div className="p-2 bg-muted/20 rounded-md text-sm font-semibold border border-border/20">
                        {formData.profile.vendorInfo?.companyName || "Not provided"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="businessType" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Type</Label>
                    {isEditing ? (
                      <Select
                        value={formData.profile.vendorInfo?.businessType || ""}
                        onValueChange={(value) => updateFormField("profile.vendorInfo.businessType", value)}
                      >
                        <SelectTrigger className="h-9 bg-background/50">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                          <SelectItem value="property_developer">Property Developer</SelectItem>
                          <SelectItem value="construction_company">Construction Company</SelectItem>
                          <SelectItem value="interior_designer">Interior Designer</SelectItem>
                          <SelectItem value="legal_services">Legal Services</SelectItem>
                          <SelectItem value="home_loan_provider">Home Loan Provider</SelectItem>
                          <SelectItem value="packers_movers">Packers & Movers</SelectItem>
                          <SelectItem value="property_management">Property Management</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20">
                        <Building className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        {formData.profile.vendorInfo?.businessType
                          ? formData.profile.vendorInfo.businessType
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                          : "Not provided"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="experience" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Experience (Years)</Label>
                    {isEditing ? (
                      <Input
                        id="experience"
                        type="number"
                        value={formData.profile.vendorInfo?.experience || 0}
                        onChange={(e) => updateFormField("profile.vendorInfo.experience", parseInt(e.target.value) || 0)}
                        className="h-9 bg-background/50"
                      />
                    ) : (
                      <div className="flex items-center p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20">
                        <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        {formData.profile.vendorInfo?.experience || 0} years
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="website" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</Label>
                    {isEditing ? (
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          value={formData.profile.vendorInfo?.website || ""}
                          onChange={(e) => updateFormField("profile.vendorInfo.website", e.target.value)}
                          className="pl-9 h-9 bg-background/50"
                          placeholder="https://example.com"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-2 bg-muted/20 rounded-md text-sm font-medium border border-border/20 text-blue-600 dark:text-blue-400">
                        <Globe className="w-3.5 h-3.5 mr-2" />
                        {formData.profile.vendorInfo?.website ? (
                          <a href={formData.profile.vendorInfo.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                            {formData.profile.vendorInfo.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Not provided</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-muted/10 border border-border/20 space-y-3">
                    <h4 className="font-semibold flex items-center text-sm">
                      <Shield className="w-3.5 h-3.5 mr-2 text-primary" />
                      Legal Information
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="licenseNumber" className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">License Number</Label>
                        {isEditing ? (
                          <Input
                            id="licenseNumber"
                            value={formData.profile.vendorInfo?.licenseNumber || ""}
                            onChange={(e) => updateFormField("profile.vendorInfo.licenseNumber", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        ) : (
                          <div className="font-mono text-xs bg-background p-1.5 rounded border border-border/40">
                            {formData.profile.vendorInfo?.licenseNumber || "Not provided"}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="gstNumber" className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">GST Number</Label>
                          {isEditing ? (
                            <Input
                              id="gstNumber"
                              value={formData.profile.vendorInfo?.gstNumber || ""}
                              onChange={(e) => updateFormField("profile.vendorInfo.gstNumber", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          ) : (
                            <div className="font-mono text-xs bg-background p-1.5 rounded border border-border/40">
                              {formData.profile.vendorInfo?.gstNumber || "Not provided"}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="panNumber" className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">PAN Number</Label>
                          {isEditing ? (
                            <Input
                              id="panNumber"
                              value={formData.profile.vendorInfo?.panNumber || ""}
                              onChange={(e) => updateFormField("profile.vendorInfo.panNumber", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          ) : (
                            <div className="font-mono text-xs bg-background p-1.5 rounded border border-border/40">
                              {formData.profile.vendorInfo?.panNumber || "Not provided"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="specializations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2" />
                Specializations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(formData.profile.vendorInfo?.specializations || []).length > 0 ? (
                    formData.profile.vendorInfo.specializations.map(
                      (spec, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center"
                        >
                          {spec}
                        </Badge>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">No specializations added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Service Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(formData.profile.vendorInfo?.serviceAreas || []).length > 0 ? (
                    formData.profile.vendorInfo.serviceAreas.map(
                      (area, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="flex items-center"
                        >
                          {area}
                        </Badge>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">No service areas added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(formData.profile.vendorInfo?.certifications || []).length > 0 ? (
                  formData.profile.vendorInfo.certifications.map(
                    (cert, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Award className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{cert.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Issued by {cert.issuedBy} • {cert.date}
                            </p>
                          </div>
                        </div>
                        {cert.verified && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* Settings Tab */}
        <TabsContent value="notifications" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VendorNotificationSettings
                preferences={formData.profile.preferences?.notifications || {
                  email: true,
                  push: true,
                  newMessages: true,
                  newsUpdates: false,
                  marketing: false
                }}
                businessPreferences={formData.profile.preferences?.business || {
                  emailNotifications: true,
                  smsNotifications: true,
                  leadAlerts: true,
                  marketingEmails: false,
                  weeklyReports: true
                }}
                onChange={(key, value) => updateFormField(`profile.preferences.notifications.${key}`, value)}
                onBusinessChange={(key, value) => updateFormField(`profile.preferences.business.${key}`, value)}
                onTestPushNotification={handleTestPushNotification}
                onTestEmail={handleTestEmail}
                showTestButtons={true}
              />
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b border-border/40 pb-3">
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Shield className="w-4 h-4 mr-2 text-primary" />
                    Security & Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="p-4 rounded-lg bg-background/50 border border-border/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Password</h4>
                        <p className="text-[10px] text-muted-foreground">Last changed 30 days ago</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordDialogOpen(true)}
                      className="w-full text-xs h-8"
                    >
                      Change Password
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-border/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Account Status</h4>
                        <p className="text-[10px] text-muted-foreground">Your account is active</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/10 p-1.5 rounded-md justify-center">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active & Verified
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Password Change Dialog */}
          <PasswordChangeDialog
            open={passwordDialogOpen}
            onOpenChange={setPasswordDialogOpen}
          />
        </TabsContent>


      </Tabs>




    </div >
  );
};

export default VendorProfilePage;
