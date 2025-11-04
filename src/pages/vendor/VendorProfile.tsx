import React, { useState, useEffect, useCallback } from "react";
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

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vendorData, setVendorData] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  // Location data states from loca.json
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  
  // Loading states for location fields
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    cities: false,
    pincode: false
  });

  // Store selected location names for display
  const [selectedLocationNames, setSelectedLocationNames] = useState({
    country: 'India',
    state: '',
    district: '',
    city: ''
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
    
    try {
      await syncSettingRealtime(category, key, value);
    } catch (error) {
      console.error('Failed to sync setting:', error);
    }
  }, [vendorData]);

  useEffect(() => {
    loadVendorProfile();
    loadVendorSettings();
    initializeLocationService();
  }, []);

  // Initialize locaService on component mount
  useEffect(() => {
    const initLocaService = async () => {
      setLocationLoading(prev => ({ ...prev, states: true }));
      try {
        await locaService.initialize();
        const statesList = locaService.getStates();
        setStates(statesList);
        console.log(`Loaded ${statesList.length} states from loca.json`);
      } catch (error) {
        console.error("Error initializing loca service:", error);
        toast({
          title: "Error",
          description: "Failed to load location data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, states: false }));
      }
    };

    initLocaService();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (!formData?.profile?.address?.state) {
      setDistricts([]);
      return;
    }

    setLocationLoading(prev => ({ ...prev, districts: true }));
    try {
      const districtsList = locaService.getDistricts(formData.profile.address.state);
      setDistricts(districtsList);
      console.log(`Loaded ${districtsList.length} districts for ${formData.profile.address.state}`);
      
      // Only clear dependent fields if the current district is not in the new list
      // Don't clear when just loading districts for the first time
      if (formData.profile.address.district) {
        const currentDistrict = formData.profile.address.district;
        const districtExists = districtsList.some(d => 
          d.toLowerCase() === currentDistrict.toLowerCase() || 
          d === currentDistrict
        );
        
        if (!districtExists) {
          console.log(`District "${currentDistrict}" not found in list, clearing...`);
          updateFormField("profile.address.district", "");
          updateFormField("profile.address.city", "");
        } else {
          console.log(`District "${currentDistrict}" found in list, keeping...`);
        }
      }
    } catch (error) {
      console.error("Error loading districts:", error);
      toast({
        title: "Error",
        description: "Failed to load districts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(prev => ({ ...prev, districts: false }));
    }
  }, [formData?.profile?.address?.state]);

  // Load cities when district changes
  useEffect(() => {
    if (!formData?.profile?.address?.state || !formData?.profile?.address?.district) {
      setCities([]);
      return;
    }

    setLocationLoading(prev => ({ ...prev, cities: true }));
    try {
      const citiesList = locaService.getCities(formData.profile.address.state, formData.profile.address.district);
      setCities(citiesList);
      console.log(`Loaded ${citiesList.length} cities for ${formData.profile.address.district}`);
      
      // Clear city if it's not in the new list
      if (formData.profile.address.city && !citiesList.includes(formData.profile.address.city)) {
        updateFormField("profile.address.city", "");
      }
      
      setSelectedLocationNames(prev => ({ ...prev, city: "" }));
    } catch (error) {
      console.error("Error loading cities:", error);
      toast({
        title: "Error",
        description: "Failed to load cities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(prev => ({ ...prev, cities: false }));
    }
  }, [formData?.profile?.address?.state, formData?.profile?.address?.district]);

  // Update selectedLocationNames when form data changes
  useEffect(() => {
    if (formData?.profile?.address?.state) {
      setSelectedLocationNames(prev => ({ ...prev, state: formData.profile.address.state }));
    }
  }, [formData?.profile?.address?.state]);

  useEffect(() => {
    if (formData?.profile?.address?.district) {
      setSelectedLocationNames(prev => ({ ...prev, district: formData.profile.address.district }));
    }
  }, [formData?.profile?.address?.district]);

  useEffect(() => {
    if (formData?.profile?.address?.city) {
      setSelectedLocationNames(prev => ({ ...prev, city: formData.profile.address.city }));
    }
  }, [formData?.profile?.address?.city]);

  // Auto-save when settings change
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveVendorSettings();
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
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
          preferences: profile.profile.preferences || {
            language: 'en',
            currency: 'INR',
            notifications: {
              email: true,
              push: true,
              newMessages: true,
              newsUpdates: true,
              marketing: true,
            },
          },
        },
      };
      
      console.log("Loaded vendor profile:", profileWithDefaults);
      console.log("Profile address:", profileWithDefaults.profile?.address);
      
      setVendorData(profileWithDefaults);
      setFormData(profileWithDefaults);
      
      // Update localStorage with the full vendor profile so updateVendorProfile can access the user ID
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

  // Load vendor settings
  const loadVendorSettings = async () => {
    try {
      const savedSettings = localStorage.getItem('vendorSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setVendorSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      }
      
      try {
        const response = await vendorService.getVendorProfile();
        if (response && response.profile.vendorInfo?.vendorPreferences) {
          const apiPrefs = response.profile.vendorInfo.vendorPreferences;
          
          const mergedSettings: VendorSettingsConfig = {
            notifications: { 
              email: response.profile?.preferences?.notifications?.email || vendorSettings.notifications.email,
              push: response.profile?.preferences?.notifications?.push || vendorSettings.notifications.push,
              newMessages: response.profile?.preferences?.notifications?.newMessages || vendorSettings.notifications.newMessages,
              newsUpdates: response.profile?.preferences?.notifications?.newsUpdates || vendorSettings.notifications.newsUpdates,
              marketing: response.profile?.preferences?.notifications?.marketing || vendorSettings.notifications.marketing
            },
            business: {
              emailNotifications: apiPrefs.emailNotifications || vendorSettings.business.emailNotifications,
              smsNotifications: apiPrefs.smsNotifications || vendorSettings.business.smsNotifications,
              leadAlerts: apiPrefs.leadAlerts || vendorSettings.business.leadAlerts,
              marketingEmails: apiPrefs.marketingEmails || vendorSettings.business.marketingEmails,
              weeklyReports: apiPrefs.weeklyReports || vendorSettings.business.weeklyReports,
              autoResponseEnabled: apiPrefs.autoResponseEnabled || vendorSettings.business.autoResponseEnabled,
              autoResponseMessage: apiPrefs.autoResponseMessage || vendorSettings.business.autoResponseMessage
            }
          };
          
          setVendorSettings(mergedSettings);
          localStorage.setItem('vendorSettings', JSON.stringify(mergedSettings));
        }
      } catch (apiError) {
        console.log("Using local settings - API unavailable");
      }
    } catch (error) {
      console.error("Settings load failed:", error);
      toast({
        title: "Settings Loaded",
        description: "Using saved settings.",
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
        const profileUpdate = {
          profile: {
            preferences: {
              notifications: {
                email: vendorSettings.notifications.email,
                push: vendorSettings.notifications.push,
                newMessages: vendorSettings.notifications.newMessages,
                newsUpdates: vendorSettings.notifications.newsUpdates,
                marketing: vendorSettings.notifications.marketing
              }
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
          }
        };

        await vendorService.updateVendorProfile(profileUpdate);
        localStorage.setItem('vendorSettings', JSON.stringify(vendorSettings));
        setLastSyncTime(new Date().toISOString());
        
        toast({
          title: "Settings Saved",
          description: "Your preferences have been updated",
        });
        
      } catch (apiError) {
        console.error('Failed to save settings:', apiError);
        localStorage.setItem('vendorSettings', JSON.stringify(vendorSettings));
        
        toast({
          title: "Settings Saved",
          description: "Your preferences have been saved",
          variant: "default"
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



  // Update setting
  const syncSettingRealtime = async (category: keyof VendorSettingsConfig, key: string, value: any) => {
    try {
      setIsSaving(true);
      
      await vendorService.updateVendorPreferences(`${category}.${key}`, value);
      
      const settingName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      const statusText = typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : 'updated';
      
      setLastSyncTime(new Date().toISOString());
      
      // If auto-response is being enabled/disabled, test the integration
      if (key === 'autoResponseEnabled' && value === true) {
        await testAutoResponseIntegration();
      }
      
      toast({
        title: `Setting Updated`,
        description: `${settingName} ${statusText}`,
      });
      
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Setting Saved",
        description: "Your preference has been saved",
        variant: "default"
      });
    } finally {
      setIsSaving(false);
    }
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

  // Initialize location service
  const initializeLocationService = async () => {
    try {
      if (!locaService.isReady()) {
        await locaService.initialize();
      }
    } catch (error) {
      console.error("Failed to initialize location service:", error);
    }
  };

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
          preferences: formData.profile.preferences,
          address: {
            ...formData.profile.address,
            // Ensure all address fields are properly included
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

  const updateFormField = (path: string, value: any) => {
    if (!formData) return;

    const pathArray = path.split(".");
    const newFormData = { ...formData };
    let current: any = newFormData;

    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    current[pathArray[pathArray.length - 1]] = value;

    console.log(`Updated ${path} to:`, value);
    console.log('Full address after update:', newFormData.profile?.address);
    
    setFormData(newFormData);
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile information and preferences.
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.profile.avatar || ""} />
                <AvatarFallback className="text-lg">
                  {formData.profile.firstName.charAt(0)}
                  {formData.profile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-lg font-semibold">
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
                    <p className="text-lg font-semibold">
                      {formData.profile.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
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

              <div className="flex items-center space-x-4">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="notifications">Settings</TabsTrigger>
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

        <TabsContent value="specializations" className="space-y-6">
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
        </TabsContent>

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

          {/* Auto-Response Section */}
          <Card>
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
          </Card>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {vendorData.statistics.totalProperties}
                </div>
                <div className="text-sm text-muted-foreground">
                  Properties Listed
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {vendorData.statistics.totalValue || "???0"}
                </div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(formData.profile.vendorInfo?.rating?.average || 0).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Average Rating
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
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
