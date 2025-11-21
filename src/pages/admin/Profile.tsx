import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Eye, 
  EyeOff, 
  CalendarIcon, 
  Loader2, 
  RefreshCw, 
  Camera, 
  Save, 
  Edit, 
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Shield,
  Bell,
  Globe,
  Settings as SettingsIcon
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { Label } from "@/components/ui/label";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import { uploadService } from "@/services/uploadService";

const profileSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^[0-9]{10}$/, "Must be exactly 10 digits")
    .min(10, "Must be exactly 10 digits")
    .max(10, "Must be exactly 10 digits"),
  birthday: z.date().optional(),
  anniversary: z.date().optional(),
  bio: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  street: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{6}$/.test(val),
      "Pincode must be exactly 6 digits"
    ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface AdminProfile {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    birthday?: string;
    anniversary?: string;
    avatar?: string;
    bio?: string;
    department?: string;
    designation?: string;
    address?: {
      street?: string;
      state?: string;
      district?: string;
      city?: string;
      zipCode?: string;
      pincode?: string;
    };
  };
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  permissions?: string[];
  preferences?: {
    notifications: {
      email: boolean;
      browser: boolean;
      mobile: boolean;
    };
    dashboard: {
      defaultView: string;
      autoRefresh: boolean;
      refreshInterval: number;
    };
    security: {
      sessionTimeout: number;
    };
  };
}

// Helper function to convert User to AdminProfile
const convertUserToAdminProfile = (user: any): AdminProfile => {
  return {
    ...user,
    profile: {
      ...user.profile,
      avatar: user.profile?.avatar || "",
      bio: user.profile?.bio || "",
      department: user.profile?.department || "",
      designation: user.profile?.designation || "",
      birthday: user.profile?.birthday || "",
      anniversary: user.profile?.anniversary || "",
      address: {
        ...user.profile?.address,
        district: user.profile?.address?.district || "",
        zipCode: user.profile?.address?.zipCode || user.profile?.address?.pincode || "",
      }
    },
    preferences: user.profile?.preferences ? {
      notifications: {
        email: user.profile.preferences.notifications?.email || true,
        browser: user.profile.preferences.notifications?.push || true,
        mobile: user.profile.preferences.notifications?.push || true,
      },
      dashboard: {
        defaultView: "overview",
        autoRefresh: true,
        refreshInterval: 30,
      },
      security: {
        sessionTimeout: 60,
      },
    } : {
      notifications: { email: true, browser: true, mobile: true },
      dashboard: { defaultView: "overview", autoRefresh: true, refreshInterval: 30 },
      security: { sessionTimeout: 60 },
    }
  };
};

const Profile = () => {
  const { toast } = useToast();
  const { user, checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState<AdminProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Location data states
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

  // Admin preferences state
  const [adminPreferences, setAdminPreferences] = useState({
    notifications: {
      email: true,
      browser: true,
      mobile: true
    },
    dashboard: {
      defaultView: "overview",
      autoRefresh: true,
      refreshInterval: 30
    },
    security: {
      sessionTimeout: 60
    }
  });
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",

    },
  });

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
    initializeLocationService();
  }, [user]);

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

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await userService.getCurrentUser();
      if (response.success) {
        const userData = convertUserToAdminProfile(response.data.user);
        setProfileData(userData);
        
        // Set avatar URL
        const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`;
        setAvatarUrl(userData.profile?.avatar || defaultAvatar);
        
        // Set form data for editing
        setFormData(userData);
        
        // Update admin preferences if available
        if (userData.preferences) {
          setAdminPreferences(userData.preferences);
        }
        
        // Populate form with current data
        form.reset({
          first_name: userData.profile?.firstName || "",
          last_name: userData.profile?.lastName || "",
          email: userData.email || "",
          phone: userData.profile?.phone || "",
          birthday: userData.profile?.birthday ? new Date(userData.profile.birthday) : undefined,
          anniversary: userData.profile?.anniversary ? new Date(userData.profile.anniversary) : undefined,
          bio: userData.profile?.bio || "",
          department: userData.profile?.department || "",
          designation: userData.profile?.designation || "",
          street: userData.profile?.address?.street || "",
          state: userData.profile?.address?.state || "",
          district: userData.profile?.address?.district || "",
          city: userData.profile?.address?.city || "",
          zipCode: userData.profile?.address?.zipCode || "",

        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    await checkAuth(); // Refresh auth context
    await loadProfile();
    setRefreshing(false);
    toast({
      title: "Profile Refreshed",
      description: "Profile data has been refreshed successfully.",
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = uploadService.validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const compressedFile = await uploadService.compressImage(file);
      const avatarUrl = await uploadService.uploadAvatar(compressedFile);
      
      setAvatarUrl(avatarUrl);
      
      // Update formData with the new avatar URL
      if (formData) {
        const updatedFormData = {
          ...formData,
          profile: {
            ...formData.profile,
            avatar: avatarUrl
          }
        };
        setFormData(updatedFormData);
      }
      
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully! Click 'Save Changes' to update.",
      });
      
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  // Handle pincode selection and auto-fill location
  const handlePincodeChange = (pincode: string, locationData?: PincodeSuggestion) => {
    updateFormField("profile.address.zipCode", pincode);

    if (locationData) {
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

  // Update form field helper
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

    setFormData(newFormData);
    
    // Update form values as well
    const formFieldName = path.replace("profile.", "").replace("address.", "");
    if (form.getValues()[formFieldName] !== undefined) {
      form.setValue(formFieldName as keyof ProfileFormValues, value);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Prepare update data from formData
      const updateData = {
        email: formData.email,
        profile: {
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          phone: formData.profile.phone,
          birthday: formData.profile.birthday,
          anniversary: formData.profile.anniversary,
          bio: formData.profile.bio,
          department: formData.profile.department,
          designation: formData.profile.designation,
          address: formData.profile.address,
          avatar: avatarUrl !== `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}` ? avatarUrl : undefined,
        },
        // Convert admin preferences to user preferences format
        preferences: {
          language: 'en',
          currency: 'INR',
          notifications: {
            email: adminPreferences.notifications.email,
            push: adminPreferences.notifications.browser,

            newMessages: adminPreferences.notifications.mobile,
            newsUpdates: true,
            marketing: false,
          }
        }
      };

      const response = await userService.updateCurrentUser(updateData);
      
      if (response.success) {
        const updatedUser = convertUserToAdminProfile(response.data.user);
        setProfileData(updatedUser);
        setFormData(updatedUser);
        setIsEditing(false);
        
        await checkAuth();
        
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData);
    setIsEditing(false);
    if (profileData?.preferences) {
      setAdminPreferences(profileData.preferences);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    // Update formData with form values
    if (formData) {
      const updatedFormData = {
        ...formData,
        profile: {
          ...formData.profile,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
          birthday: data.birthday?.toISOString(),
          anniversary: data.anniversary?.toISOString(),
          bio: data.bio,
          department: data.department,
          designation: data.designation,
          address: {
            street: data.street,
            state: data.state,
            district: data.district,
            city: data.city,
            zipCode: data.zipCode,
          }
        }
      };
      
      setFormData(updatedFormData);
    }
    
    // Password changes are now handled through the secure OTP dialog
    
    // Save the main profile data
    await handleSave();
  };

  // Update admin preferences
  const updateAdminPreferences = useCallback(async (category: keyof typeof adminPreferences, key: string, value: any) => {
    setAdminPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span className="text-lg">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load profile data</p>
          <Button onClick={loadProfile} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            Admin Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile information and administrative preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshProfile} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
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
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg">
                  {profileData.profile?.firstName?.charAt(0)}
                  {profileData.profile?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
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
                      value={formData?.profile?.firstName || ""}
                      onChange={(e) =>
                        updateFormField("profile.firstName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {profileData.profile?.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData?.profile?.lastName || ""}
                      onChange={(e) =>
                        updateFormField("profile.lastName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="text-lg font-semibold">
                      {profileData.profile?.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData?.email || ""}
                      onChange={(e) =>
                        setFormData(prev => prev ? {...prev, email: e.target.value} : null)
                      }
                      className="h-6 text-sm w-48"
                      placeholder="Email address"
                    />
                  ) : (
                    profileData.email
                  )}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {isEditing ? (
                    <Input
                      value={formData?.profile?.phone || ""}
                      onChange={(e) =>
                        updateFormField("profile.phone", e.target.value)
                      }
                      className="h-6 text-sm w-32"
                    />
                  ) : (
                    profileData.profile?.phone || "Not provided"
                  )}
                </div>
                <div className="flex items-center">
                  <Badge variant="secondary">
                    {profileData.role?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-sm">
                    <Badge 
                      variant={profileData.status === 'active' ? 'default' : 'destructive'}
                    >
                      {profileData.status?.toUpperCase()}
                    </Badge>
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">
                    Email {profileData.emailVerified ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">
                    Since {userService.formatCreationDate(profileData.createdAt)}
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
          <TabsTrigger value="work">Work Details</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData?.profile?.bio || ""}
                    onChange={(e) =>
                      updateFormField("profile.bio", e.target.value)
                    }
                    placeholder="Tell us about yourself and your role..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {profileData.profile?.bio || "No bio provided"}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="street"
                      value={formData?.profile?.address?.street || ""}
                      onChange={(e) =>
                        updateFormField("profile.address.street", e.target.value)
                      }
                      placeholder="Enter street address..."
                    />
                  ) : (
                    <p className="text-sm">
                      {profileData.profile?.address?.street || "Not provided"}
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
                          value={formData?.profile?.address?.state || ""}
                          onValueChange={(value) => updateFormField("profile.address.state", value)}
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
                          value={formData?.profile?.address?.district || ""}
                          onValueChange={(value) => updateFormField("profile.address.district", value)}
                          disabled={locationLoading.districts || !formData?.profile?.address?.state}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              locationLoading.districts ? "Loading districts..." : 
                              !formData?.profile?.address?.state ? "Select state first" : 
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
                          value={formData?.profile?.address?.city || ""}
                          onValueChange={(value) => updateFormField("profile.address.city", value)}
                          disabled={locationLoading.cities || !formData?.profile?.address?.district}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              locationLoading.cities ? "Loading cities..." : 
                              !formData?.profile?.address?.district ? "Select district first" : 
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

                      {/* PIN Code */}
                      <div>
                        <Label htmlFor="zipCode">PIN Code</Label>
                        <PincodeAutocomplete
                          value={formData?.profile?.address?.zipCode || ""}
                          onChange={handlePincodeChange}
                          state={formData?.profile?.address?.state}
                          district={formData?.profile?.address?.district}
                          city={formData?.profile?.address?.city}
                          placeholder="Select PIN code..."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>State</Label>
                      <p className="text-sm">{profileData.profile?.address?.state || "Not provided"}</p>
                    </div>
                    <div>
                      <Label>District</Label>
                      <p className="text-sm">{profileData.profile?.address?.district || "Not provided"}</p>
                    </div>
                    <div>
                      <Label>City</Label>
                      <p className="text-sm">{profileData.profile?.address?.city || "Not provided"}</p>
                    </div>
                    <div>
                      <Label>PIN Code</Label>
                      <p className="text-sm">{profileData.profile?.address?.zipCode || "Not provided"}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Work Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      value={formData?.profile?.department || ""}
                      onChange={(e) =>
                        updateFormField("profile.department", e.target.value)
                      }
                      placeholder="Enter department..."
                    />
                  ) : (
                    <p className="text-sm">
                      {profileData.profile?.department || "Not provided"}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  {isEditing ? (
                    <Input
                      id="designation"
                      value={formData?.profile?.designation || ""}
                      onChange={(e) =>
                        updateFormField("profile.designation", e.target.value)
                      }
                      placeholder="Enter designation..."
                    />
                  ) : (
                    <p className="text-sm">
                      {profileData.profile?.designation || "Not provided"}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthday">Birthday</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData?.profile?.birthday && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData?.profile?.birthday ? 
                            format(new Date(formData.profile.birthday), "dd/MM/yyyy") : 
                            <span>dd/mm/yyyy</span>
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData?.profile?.birthday ? new Date(formData.profile.birthday) : undefined}
                          onSelect={(date) => updateFormField("profile.birthday", date?.toISOString())}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm">
                      {profileData.profile?.birthday ? 
                        format(new Date(profileData.profile.birthday), "dd/MM/yyyy") : 
                        "Not provided"
                      }
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="anniversary">Anniversary</Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData?.profile?.anniversary && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData?.profile?.anniversary ? 
                            format(new Date(formData.profile.anniversary), "dd/MM/yyyy") : 
                            <span>dd/mm/yyyy</span>
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData?.profile?.anniversary ? new Date(formData.profile.anniversary) : undefined}
                          onSelect={(date) => updateFormField("profile.anniversary", date?.toISOString())}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm">
                      {profileData.profile?.anniversary ? 
                        format(new Date(profileData.profile.anniversary), "dd/MM/yyyy") : 
                        "Not provided"
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Permissions Display */}
              <div>
                <Label>Permissions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.permissions?.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">No specific permissions assigned</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Admin Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Preferences */}
              <div>
                <h4 className="text-sm font-medium mb-4">Notification Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <Switch
                      id="emailNotifications"
                      checked={adminPreferences.notifications.email}
                      onCheckedChange={(checked) => 
                        updateAdminPreferences("notifications", "email", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="browserNotifications">Browser Notifications</Label>
                    <Switch
                      id="browserNotifications"
                      checked={adminPreferences.notifications.browser}
                      onCheckedChange={(checked) => 
                        updateAdminPreferences("notifications", "browser", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mobileNotifications">Mobile Notifications</Label>
                    <Switch
                      id="mobileNotifications"
                      checked={adminPreferences.notifications.mobile}
                      onCheckedChange={(checked) => 
                        updateAdminPreferences("notifications", "mobile", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dashboard Preferences */}
              <div>
                <h4 className="text-sm font-medium mb-4">Dashboard Settings</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultView">Default View</Label>
                    <Select
                      value={adminPreferences.dashboard.defaultView}
                      onValueChange={(value) => 
                        updateAdminPreferences("dashboard", "defaultView", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Overview</SelectItem>
                        <SelectItem value="analytics">Analytics</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="properties">Properties</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoRefresh">Auto Refresh Dashboard</Label>
                    <Switch
                      id="autoRefresh"
                      checked={adminPreferences.dashboard.autoRefresh}
                      onCheckedChange={(checked) => 
                        updateAdminPreferences("dashboard", "autoRefresh", checked)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="300"
                      value={adminPreferences.dashboard.refreshInterval}
                      onChange={(e) => 
                        updateAdminPreferences("dashboard", "refreshInterval", parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Preferences */}
              <div>
                <h4 className="text-sm font-medium mb-4">Authentication</h4>
                <div className="space-y-4">
                  {/* Commented out Two-Factor Authentication for Super Admin
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                      <p className="text-xs text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      id="twoFactorAuth"
                      checked={adminPreferences.security.twoFactorEnabled}
                      onCheckedChange={(checked) => 
                        updateAdminPreferences("security", "twoFactorEnabled", checked)
                      }
                    />
                  </div>
                  */}
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="15"
                      max="480"
                      value={adminPreferences.security.sessionTimeout}
                      onChange={(e) => 
                        updateAdminPreferences("security", "sessionTimeout", parseInt(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically logout after this period of inactivity
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Password Security */}
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Password Security
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs text-muted-foreground">
                        Use secure OTP verification to change your password
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setPasswordDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

export default Profile;
