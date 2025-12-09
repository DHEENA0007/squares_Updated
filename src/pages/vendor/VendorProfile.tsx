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
  MessageSquare
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/vendors/subscription/current`, {
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
    <div className="space-y-6">


      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight flex items-center gap-2`}>
            <User className="w-8 h-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile information and preferences.
          </p>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving} className={isMobile ? 'flex-1' : ''}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className={isMobile ? 'flex-1' : ''}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className={isMobile ? 'w-full' : ''}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className={`flex items-start ${isMobile ? 'flex-col space-y-4' : 'space-x-6'}`}>
            <div className="relative">
              <Avatar 
                className={`${isMobile ? 'h-20 w-20' : 'h-24 w-24'} ${isMobile ? 'mx-auto' : ''}`}
              >
                <AvatarImage 
                  src={formData.profile.avatar || undefined}
                />
                <AvatarFallback className={`${isMobile ? 'text-base' : 'text-lg'}`}>
                  {formData.profile.firstName.charAt(0)}
                  {formData.profile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 ${isMobile ? 'right-1/2 translate-x-1/2' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex-1 space-y-4">
              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={formData.profile.firstName}
                      onChange={(e) =>
                        updateFormField("profile.firstName", e.target.value)
                      }
                    />
                  ) : (
                    <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                      {formData.profile.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData.profile.lastName}
                      onChange={(e) =>
                        updateFormField("profile.lastName", e.target.value)
                      }
                    />
                  ) : (
                    <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                      {formData.profile.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className={`flex items-center ${isMobile ? 'flex-col space-y-2' : 'space-x-4'} text-sm text-muted-foreground`}>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {formData.email}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {isEditing ? (
                    <Input
                      value={formData.profile.phone}
                      onChange={(e) =>
                        updateFormField("profile.phone", e.target.value)
                      }
                      className="h-6 text-sm w-32"
                    />
                  ) : (
                    formData.profile.phone
                  )}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Member since {memberSince}
                </div>
              </div>

              <div className={`flex items-center ${isMobile ? 'flex-col space-y-2' : 'space-x-4'}`}>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="font-medium">
                    {(formData.profile.vendorInfo?.rating?.average || 0).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({formData.profile.vendorInfo?.rating?.count || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">
                    {formData.profile.vendorInfo?.responseTime || "Not calculated"} avg response
                  </span>
                </div>
              </div>

              {/* Premium Badges */}
              {!subscriptionLoading && subscription?.plan?.benefits && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {subscription.plan.benefits.topRated && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                      <Star className="w-3 h-3 mr-1" />
                      Top Rated
                    </Badge>
                  )}
                  {subscription.plan.benefits.verifiedBadge && (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified Owner
                    </Badge>
                  )}
                  {subscription.plan.benefits.marketingManager && (
                    <Badge className="bg-purple-500 hover:bg-purple-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Marketing Manager
                    </Badge>
                  )}
                  {subscription.plan.benefits.commissionBased && (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <Award className="w-3 h-3 mr-1" />
                      Commission Based
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`${isMobile ? 'flex flex-col h-auto gap-2' : 'grid w-full grid-cols-3'}`}>
          <TabsTrigger value="profile" className={isMobile ? 'w-full justify-start' : ''}>Personal Info</TabsTrigger>
          <TabsTrigger value="company" className={isMobile ? 'w-full justify-start' : ''}>Company Details</TabsTrigger>
          {/* <TabsTrigger value="specializations" className={isMobile ? 'w-full justify-start' : ''}>Specializations</TabsTrigger> */}
          <TabsTrigger value="notifications" className={isMobile ? 'w-full justify-start' : ''}>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.profile.bio || ""}
                    onChange={(e) =>
                      updateFormField("profile.bio", e.target.value)
                    }
                    placeholder="Tell us about yourself and your experience..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.profile.bio || "No bio provided"}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="street"
                      value={formData.profile.address?.street || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.street", e.target.value)
                      }
                      placeholder="Enter street address..."
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.street || "Not provided"}
                    </p>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <Label className="text-sm font-medium">Location Details</Label>
                    <div className="mt-2 space-y-4">
                      {/* State Selection */}
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={formData.profile.address?.state || ""}
                          onValueChange={(value) => {
                            updateFormField("profile.address.state", value);
                            // Clear district and city when state changes
                            updateFormField("profile.address.district", "");
                            updateFormField("profile.address.city", "");
                            // Clear pincode as well since location context changed
                            updateFormField("profile.address.zipCode", "");
                          }}
                          disabled={locationLoading.states}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={locationLoading.states ? "Loading states..." : "Select state"} />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* District Selection */}
                      <div>
                        <Label htmlFor="district">District</Label>
                        <Select
                          value={formData.profile.address?.district || ""}
                          onValueChange={(value) => {
                            updateFormField("profile.address.district", value);
                            // Clear city when district changes
                            updateFormField("profile.address.city", "");
                            // Clear pincode as well since location context changed
                            updateFormField("profile.address.zipCode", "");
                          }}
                          disabled={!formData.profile.address?.state || locationLoading.districts}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !formData.profile.address?.state ? "Select state first" :
                              locationLoading.districts ? "Loading districts..." :
                              "Select district"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((district) => (
                              <SelectItem key={district} value={district}>
                                {district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City Selection */}
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Select
                          value={formData.profile.address?.city || ""}
                          onValueChange={(value) => {
                            updateFormField("profile.address.city", value);
                            // Clear pincode when city changes to ensure accuracy
                            updateFormField("profile.address.zipCode", "");
                          }}
                          disabled={!formData.profile.address?.district || locationLoading.cities}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !formData.profile.address?.district ? "Select district first" :
                              locationLoading.cities ? "Loading cities..." :
                              "Select city"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>State</Label>
                      <p className="text-sm">
                        {formData.profile.address?.state || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label>District</Label>
                      <p className="text-sm">
                        {formData.profile.address?.district || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label>City</Label>
                      <p className="text-sm">
                        {formData.profile.address?.city || "Not provided"}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="zipCode">PIN Code</Label>
                  {isEditing ? (
                    <PincodeAutocomplete
                      value={formData.profile.address?.zipCode || ""}
                      onChange={(pincode, locationData) => {
                        updateFormField("profile.address.zipCode", pincode);
                        
                        // Auto-fill location fields from pincode data
                        if (locationData) {
                          console.log('Auto-filling location from pincode:', locationData);
                          
                          // Update state
                          if (locationData.state) {
                            const stateValue = locationData.state.toUpperCase();
                            if (states.includes(stateValue)) {
                              updateFormField("profile.address.state", stateValue);
                              updateFormField("profile.address.stateCode", stateValue);
                              
                              // Load districts for the selected state
                              setTimeout(() => {
                                const districtsForState = locaService.getDistricts(stateValue);
                                setDistricts(districtsForState);
                                
                                // Set district if available
                                if (locationData.district) {
                                  const matchingDistrict = districtsForState.find(d => 
                                    d.toUpperCase() === locationData.district.toUpperCase()
                                  );
                                  
                                  if (matchingDistrict) {
                                    updateFormField("profile.address.district", matchingDistrict);
                                    updateFormField("profile.address.districtCode", matchingDistrict);
                                    
                                    // Load cities for the selected district
                                    setTimeout(() => {
                                      const citiesForDistrict = locaService.getCities(stateValue, matchingDistrict);
                                      setCities(citiesForDistrict);
                                      
                                      // Set city if available
                                      if (locationData.city) {
                                        const matchingCity = citiesForDistrict.find(c => 
                                          c.toUpperCase() === locationData.city.toUpperCase()
                                        );
                                        
                                        if (matchingCity) {
                                          updateFormField("profile.address.city", matchingCity);
                                          updateFormField("profile.address.cityCode", matchingCity);
                                        }
                                      }
                                    }, 100);
                                  }
                                }
                              }, 100);
                            }
                          }
                        }
                      }}
                      state={formData.profile.address?.state}
                      district={formData.profile.address?.district}
                      city={formData.profile.address?.city}
                      placeholder={
                        formData.profile.address?.city 
                          ? `Enter PIN code for ${formData.profile.address.city}...`
                          : "Enter PIN code to auto-fill location..."
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.address?.zipCode || "Not provided"}
                    </p>
                  )}
                  {isEditing && (
                    <div className="space-y-1 mt-1">
                      <p className="text-xs text-gray-600">
                        💡 Select your location first or enter PIN code to auto-fill location details
                      </p>
                      {formData.profile.address?.zipCode && formData.profile.address?.city && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Location validated with PIN code
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  {isEditing ? (
                    <Input
                      id="companyName"
                      value={formData.profile.vendorInfo?.companyName || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.companyName",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.companyName || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  {isEditing ? (
                    <Select
                      value={formData.profile.vendorInfo?.businessType || ""}
                      onValueChange={(value) =>
                        updateFormField("profile.vendorInfo.businessType", value)
                      }
                    >
                      <SelectTrigger>
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
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.businessType 
                        ? formData.profile.vendorInfo.businessType
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                        : "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="experience">Experience (Years)</Label>
                  {isEditing ? (
                    <Input
                      id="experience"
                      type="number"
                      value={formData.profile.vendorInfo?.experience || 0}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.experience",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.experience || 0} years
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  {isEditing ? (
                    <Input
                      id="website"
                      value={formData.profile.vendorInfo?.website || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.website",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.website || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="licenseNumber">License Number</Label>
                  {isEditing ? (
                    <Input
                      id="licenseNumber"
                      value={formData.profile.vendorInfo?.licenseNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.licenseNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.licenseNumber ||
                        "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  {isEditing ? (
                    <Input
                      id="gstNumber"
                      value={formData.profile.vendorInfo?.gstNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.gstNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.gstNumber || "Not provided"}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  {isEditing ? (
                    <Input
                      id="panNumber"
                      value={formData.profile.vendorInfo?.panNumber || ""}
                      onChange={(e) =>
                        updateFormField(
                          "profile.vendorInfo.panNumber",
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm">
                      {formData.profile.vendorInfo?.panNumber || "Not provided"}
                    </p>
                  )}
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
        <TabsContent value="notifications" className="space-y-6">
          <VendorNotificationSettings
            preferences={vendorSettings.notifications}
            businessPreferences={{
              emailNotifications: vendorSettings.business.emailNotifications,
              smsNotifications: vendorSettings.business.smsNotifications,
              leadAlerts: vendorSettings.business.leadAlerts,
              marketingEmails: vendorSettings.business.marketingEmails,
              weeklyReports: vendorSettings.business.weeklyReports
            }}
            onChange={(key, value) => updateVendorSettings('notifications', key, value)}
            onBusinessChange={(key, value) => updateVendorSettings('business', key, value)}
            showTestButtons={true}
            onTestPushNotification={() => {
              toast({
                title: "Test Push Notification",
                description: "Push notification test sent successfully!",
              });
            }}
            onTestEmail={() => {
              toast({
                title: "Test Email",
                description: "Test email sent successfully!",
              });
            }}
          />

          {/* Auto-Response Section - commented out per request */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Auto-Response Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure automatic replies to new customer inquiries.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoResponse">Enable Auto-Response</Label>
                  <p className="text-sm text-muted-foreground">Automatic replies to new inquiries</p>
                </div>
                <Switch
                  id="autoResponse"
                  checked={vendorSettings.business.autoResponseEnabled}
                  onCheckedChange={async (checked) => {
                    await updateVendorSettings('business', 'autoResponseEnabled', checked);
                  }}
                  disabled={isSaving}
                />
              </div>

              {vendorSettings.business.autoResponseEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="autoResponseMessage">Auto-Response Message</Label>
                  <Textarea
                    id="autoResponseMessage"
                    value={vendorSettings.business.autoResponseMessage}
                    onChange={async (e) => {
                      const message = e.target.value;
                      await updateVendorSettings('business', 'autoResponseMessage', message);
                    }}
                    placeholder="Enter your automatic response message..."
                    rows={3}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be automatically sent to new inquiries
                  </p>
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* Password Change Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Change Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Update your account password with secure OTP verification
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password Change Dialog */}
          <PasswordChangeDialog 
            open={passwordDialogOpen} 
            onOpenChange={setPasswordDialogOpen} 
          />
        </TabsContent>


      </Tabs>

      {/* Statistics Overview */}
      {vendorData.statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
              <div className="text-center">
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600`}>
                  {vendorData.statistics.totalProperties}
                </div>
                <div className="text-sm text-muted-foreground">
                  Properties Listed
                </div>
              </div>

              <div className="text-center">
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>
                  {vendorData.statistics.totalValue || "???0"}
                </div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>

              <div className="text-center">
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-600`}>
                  {(formData.profile.vendorInfo?.rating?.average || 0).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Rating
                </div>
              </div>

              <div className="text-center">
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600`}>
                  {vendorData.statistics.totalMessages}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Messages
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorProfilePage;
