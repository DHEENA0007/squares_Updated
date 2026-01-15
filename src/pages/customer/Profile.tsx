import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { locaService } from "@/services/locaService";
import { useIsMobile } from "@/hooks/use-mobile";

import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  Camera,
  Save,
  X,
  Shield,
  Eye,
  Star,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Activity,
  Settings,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userService, type User as UserType } from "@/services/userService";
import { customerDashboardService } from "@/services/customerDashboardService";
import { customerPropertiesService } from "@/services/customerPropertiesService";
import { useRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { toast } from "@/hooks/use-toast";
import { uploadService } from "@/services/uploadService";

const Profile = () => {
  const navigate = useNavigate();
  const { isConnected, lastEvent } = useRealtime();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    address: "",
    pincode: "",
    bio: "",
    joinDate: "",
    avatar: "",
    verified: false
  });

  // Enhanced location states for loca.json integration
  const [locationData, setLocationData] = useState({
    states: [] as string[],
    districts: [] as string[],
    cities: [] as string[],
    selectedState: "",
    selectedDistrict: "",
    selectedCity: "",
    loadingStates: false,
    loadingDistricts: false,
    loadingCities: false
  });

  // OTP verification states
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(10);
  const [pendingChanges, setPendingChanges] = useState<{
    newEmail?: string;
    newPhone?: string;
    otherUpdates?: Partial<UserType>;
  }>({});
  const [originalValues, setOriginalValues] = useState({
    email: "",
    phone: ""
  });

  // Real stats from API - Customer-focused only
  const [stats, setStats] = useState({
    inquiriesSent: 0,
    savedSearches: 0,
    propertiesViewed: 0,
    totalFavorites: 0,
    ownedProperties: 0
  });

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    icon: string;
  }>>([]);

  // Initialize location service
  useEffect(() => {
    const initializeLocationService = async () => {
      try {
        await locaService.initialize();
        // Load states after initialization
        const states = locaService.getStates();
        setLocationData(prev => ({ ...prev, states }));
      } catch (error) {
        console.error('Error initializing location service:', error);
      }
    };
    
    initializeLocationService();
  }, []);



  // Handle state selection
  const handleStateChange = useCallback((state: string) => {
    setLocationData(prev => ({
      ...prev,
      selectedState: state,
      selectedDistrict: "",
      selectedCity: "",
      districts: locaService.getDistricts(state),
      cities: []
    }));
    
    // Update profile location
    setProfile(prev => ({
      ...prev,
      location: `${state}`
    }));
  }, []);

  // Handle district selection
  const handleDistrictChange = useCallback((district: string) => {
    setLocationData(prev => {
      const selectedState = prev.selectedState;
      return {
        ...prev,
        selectedDistrict: district,
        selectedCity: "",
        cities: locaService.getCities(selectedState, district)
      };
    });
    
    // Update profile location separately to avoid state conflicts
    setProfile(prev => ({
      ...prev,
      location: `${district}, ${locationData.selectedState}`
    }));
  }, [locationData.selectedState]);

  // Handle city selection
  const handleCityChange = useCallback((city: string) => {
    setLocationData(prev => ({
      ...prev,
      selectedCity: city
    }));
    
    // Update profile location separately to avoid state conflicts
    setProfile(prev => ({
      ...prev,
      location: `${city}, ${locationData.selectedDistrict}, ${locationData.selectedState}`
    }));
  }, [locationData.selectedState, locationData.selectedDistrict]);

  // Helper function to format location display
  const formatLocationDisplay = useCallback((address: any) => {
    if (!address) return "Not specified";
    
    const parts = [];
    if (address.city) parts.push(address.city);
    if (address.district && address.district !== address.city) parts.push(address.district);
    if (address.state) parts.push(address.state);
    
    return parts.length > 0 ? parts.join(', ') : "Not specified";
  }, []);

  // Load user data and stats
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load user profile, stats, and activities in parallel
      const [userResponse, dashboardResponse, propertiesResponse] = await Promise.all([
        userService.getCurrentUser(),
        customerDashboardService.getCustomerDashboardData().catch(() => null),
        customerPropertiesService.getCustomerPropertyStats().catch(() => null)
      ]);

      const userData = userResponse.data.user;
      setUser(userData);
      
      // Map user data to profile state
      const existingAddress = userData.profile.address;
      const locationString = existingAddress ? 
        `${existingAddress.city || ""}, ${existingAddress.state || ""}`.replace(/^,\s*|,\s*$/g, '') : "";
      
      console.log('Loading user data, address:', existingAddress);
      console.log('Existing zipCode from database:', existingAddress?.zipCode);
      
      setProfile({
        name: userService.getFullName(userData),
        email: userData.email,
        phone: userData.profile.phone || "",
        location: locationString,
        address: existingAddress?.street || "",
        pincode: existingAddress?.zipCode || "",
        bio: userData.profile.bio || "",
        joinDate: userService.formatCreationDate(userData.createdAt),
        avatar: (userData.profile as any).avatar || "", // Avatar may not be in type definition but exists in API
        verified: userData.profile.emailVerified || false
      });

      // Save original values for comparison
      setOriginalValues({
        email: userData.email,
        phone: userData.profile.phone || ""
      });

      // Populate location dropdowns with existing data
      if (existingAddress?.state || existingAddress?.city) {
        const state = existingAddress.state || "";
        const city = existingAddress.city || "";
        
        setLocationData(prev => ({
          ...prev,
          selectedState: state,
          selectedCity: city,
          districts: state ? locaService.getDistricts(state) : [],
          cities: state ? locaService.getCities(state, "") : []
        }));

        // Try to find district from city if available
        if (city && state) {
          const allDistricts = locaService.getDistricts(state);
          for (const district of allDistricts) {
            const districtCities = locaService.getCities(state, district);
            if (districtCities.includes(city)) {
              setLocationData(prev => ({
                ...prev,
                selectedDistrict: district,
                cities: districtCities
              }));
              break;
            }
          }
        }
      }



      // Load stats from APIs
      if (dashboardResponse?.success) {
        const dashStats = dashboardResponse.data.stats;
        setStats(prev => ({
          ...prev,
          inquiriesSent: dashStats.activeInquiries || 0,
          propertiesViewed: dashStats.propertiesViewed || 0,
          totalFavorites: dashStats.savedFavorites || 0
        }));
        
        setRecentActivity(dashboardResponse.data.recentActivities.map(activity => ({
          id: activity._id,
          type: activity.type,
          message: activity.message,
          timestamp: activity.time,
          icon: activity.icon
        })));
      }

      if (propertiesResponse?.success) {
        const propStats = propertiesResponse.data;
        setStats(prev => ({
          ...prev,
          ownedProperties: propStats.totalProperties || 0,
          savedSearches: propStats.pendingApproval || 0
        }));
      }

    } catch (error) {
      console.error('Error loading user data:', error);

      // Check if it's a network error (offline)
      const isOffline = !navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'));

      toast({
        title: isOffline ? "Connection Issue" : "Error",
        description: isOffline
          ? "You're offline. Please check your internet connection and try again."
          : "Failed to load profile data. Please try again.",
        variant: isOffline ? "default" : "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - this function is stable

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, []); // Empty deps - loadUserData is stable

    // Load data on component mount
  useEffect(() => {
    loadUserData();
  }, []); // Empty dependency since loadUserData is stable

  // Memoize event handlers to prevent infinite loops
  const handleProfileUpdate = useCallback(() => {
    // Directly call loadUserData without going through refreshData
    loadUserData();
  }, []); // Empty dependency array since we want this to be stable

  const handlePropertyInquiry = useCallback(() => {
    setStats(prev => ({
      ...prev,
      inquiriesSent: prev.inquiriesSent + 1
    }));
  }, []);

  const handlePropertyViewed = useCallback(() => {
    setStats(prev => ({
      ...prev,
      propertiesViewed: prev.propertiesViewed + 1
    }));
  }, []);

  const handlePropertyFavorited = useCallback((data: any) => {
    if (data.action === 'add') {
      setStats(prev => ({
        ...prev,
        totalFavorites: prev.totalFavorites + 1
      }));
    } else if (data.action === 'remove') {
      setStats(prev => ({
        ...prev,
        totalFavorites: Math.max(0, prev.totalFavorites - 1)
      }));
    }
  }, []);

  // Listen to realtime events for profile updates
  useRealtimeEvent('profile_updated', handleProfileUpdate);
  useRealtimeEvent('property_inquiry', handlePropertyInquiry);
  useRealtimeEvent('property_viewed', handlePropertyViewed);
  useRealtimeEvent('property_favorited', handlePropertyFavorited);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Check if email or phone changed
      const isEmailChanged = profile.email !== originalValues.email;
      const isPhoneChanged = profile.phone !== originalValues.phone;

      // Prepare user data for update
      const defaultPreferences = {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          showEmail: false,
          showPhone: false
        },
        security: {
          twoFactorEnabled: false,
          loginAlerts: true,
          sessionTimeout: '30'
        }
      };

      const currentPreferences = user.profile?.preferences;
      const preferences = currentPreferences ? {
        notifications: {
          email: currentPreferences.notifications?.email ?? defaultPreferences.notifications.email,
          sms: currentPreferences.notifications?.sms ?? defaultPreferences.notifications.sms,
          push: currentPreferences.notifications?.push ?? defaultPreferences.notifications.push
        },
        privacy: {
          showEmail: currentPreferences.privacy?.showEmail ?? defaultPreferences.privacy.showEmail,
          showPhone: currentPreferences.privacy?.showPhone ?? defaultPreferences.privacy.showPhone
        },
        security: {
          twoFactorEnabled: currentPreferences.security?.twoFactorEnabled ?? defaultPreferences.security.twoFactorEnabled,
          loginAlerts: currentPreferences.security?.loginAlerts ?? defaultPreferences.security.loginAlerts,
          sessionTimeout: currentPreferences.security?.sessionTimeout ?? defaultPreferences.security.sessionTimeout
        }
      } : defaultPreferences;

      const updateData: Partial<UserType> = {
        profile: {
          firstName: profile.name.split(' ')[0] || '',
          lastName: profile.name.split(' ').slice(1).join(' ') || '',
          phone: profile.phone,
          bio: profile.bio,
          address: {
            street: profile.address,
            city: locationData.selectedCity || profile.location.split(',')[0]?.trim() || '',
            district: locationData.selectedDistrict || '',
            state: locationData.selectedState || profile.location.split(',')[1]?.trim() || '',
            zipCode: profile.pincode || ''
          },
          preferences: preferences
        }
      };

      // If email or phone changed, trigger OTP verification
      if (isEmailChanged || isPhoneChanged) {
        console.log('Email or phone changed, requesting OTP verification');
        setPendingChanges({
          newEmail: isEmailChanged ? profile.email : undefined,
          newPhone: isPhoneChanged ? profile.phone : undefined,
          otherUpdates: updateData
        });
        setSaving(false);
        await handleRequestOTP(isEmailChanged ? profile.email : undefined, isPhoneChanged ? profile.phone : undefined);
        return;
      }

      // No email/phone change, proceed with normal update
      console.log('Profile data being sent:', updateData);
      await userService.updateCurrentUser(updateData);
      await loadUserData();
      setIsEditing(false);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data if needed
  };

  // OTP verification handlers
  const handleRequestOTP = async (newEmail?: string, newPhone?: string) => {
    try {
      setSendingOtp(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/request-profile-update-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newEmail,
          newPhone,
          currentEmail: originalValues.email,
          currentPhone: originalValues.phone
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShowOTPDialog(true);
        setOtpSent(true);
        setOtpExpiry(data.expiryMinutes || 10);

        toast({
          title: "Verification Code Sent",
          description: data.message,
        });
      } else {
        throw new Error(data.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error requesting OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifyingOtp(true);

      // First verify OTP and update email/phone
      const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-profile-update-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          otp,
          newEmail: pendingChanges.newEmail,
          newPhone: pendingChanges.newPhone
        })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(verifyData.message || 'Invalid verification code');
      }

      // Now update other profile fields if any
      if (pendingChanges.otherUpdates) {
        // Remove email and phone from otherUpdates as they're already updated
        const { profile: profileUpdate, ...rest } = pendingChanges.otherUpdates;
        if (profileUpdate) {
          const { phone, ...otherProfileFields } = profileUpdate as any;
          const finalUpdate = {
            ...rest,
            profile: otherProfileFields
          };

          // Only update if there are other fields to update
          if (Object.keys(otherProfileFields).length > 1) {
            await userService.updateCurrentUser(finalUpdate);
          }
        }
      }

      // Reload user data
      await loadUserData();

      // Close dialog and reset states
      setShowOTPDialog(false);
      setOtp("");
      setOtpSent(false);
      setPendingChanges({});
      setIsEditing(false);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated and verified successfully.",
      });

    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelOTP = () => {
    setShowOTPDialog(false);
    setOtp("");
    setOtpSent(false);
    setPendingChanges({});
    // Revert changes to profile
    if (user) {
      setProfile(prev => ({
        ...prev,
        email: originalValues.email,
        phone: originalValues.phone
      }));
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      
      setProfile(prev => ({ ...prev, avatar: avatarUrl }));
      
      if (user) {
        await userService.updateCurrentUser({
          profile: {
            ...user.profile,
            avatar: avatarUrl
          } as any // Type assertion needed as avatar may not be in type definition
        });
      }
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
      
      await loadUserData();
      
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



  if (loading) {
    return (
      <div className="space-y-6 pt-24">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-16">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`font-bold flex items-center gap-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            <User className="w-8 h-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View your profile information and activity. Visit <span className="font-medium">Settings</span> to manage preferences.
          </p>
        </div>

        <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
          {!isEditing && !loading && (
            <Button onClick={() => setIsEditing(true)} className={isMobile ? 'w-full' : ''}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/customer/settings')} className={isMobile ? 'w-full' : ''}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-col md:flex-row'} items-start md:items-center gap-6`}>
                <div className="relative self-center md:self-start">
                  <Avatar className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'}`}>
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'}`}>
                    <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{profile.name}</h2>
                    {profile.verified && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'} text-muted-foreground`}>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {profile.phone}
                    </span>
                  </div>

                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'} text-muted-foreground`}>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {profile.joinDate}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className={`grid gap-4 text-center ${isMobile ? 'grid-cols-2 w-full' : 'grid-cols-2'}`}>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{stats.ownedProperties}</p>
                    <p className="text-xs text-muted-foreground">Properties</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{stats.totalFavorites}</p>
                    <p className="text-xs text-muted-foreground">Favorites</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    {isEditing ? (
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{profile.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{profile.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setProfile(prev => ({ ...prev, phone: value }));
                          }
                        }}
                        placeholder="10 digit mobile number"
                        maxLength={10}
                      />
                    ) : (
                      <p className="text-sm">{profile.phone}</p>
                    )}
                  </div>
                  
                  {/* Enhanced Location Fields */}
                  {isEditing ? (
                    <>
                      {/* Pincode Autocomplete - Primary location input */}
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="pincode">PIN Code</Label>
                        <PincodeAutocomplete
                          value={profile.pincode || ""}
                          state={locationData.selectedState}
                          district={locationData.selectedDistrict}
                          city={locationData.selectedCity}
                          onChange={(pincode, locationSuggestion) => {
                            console.log('Pincode selected:', pincode, locationSuggestion);
                            
                            // Update pincode in profile immediately
                            setProfile(prev => ({ ...prev, pincode }));
                            
                            // Auto-fill location fields if suggestion provides data
                            if (locationSuggestion) {
                              console.log('Auto-filling location from pincode:', locationSuggestion);
                              
                              // Get districts and cities for the state
                              const stateDistricts = locaService.getDistricts(locationSuggestion.state);
                              const stateCities = locaService.getCities(locationSuggestion.state, locationSuggestion.district);
                              
                              // Update location data in one go to avoid cascading issues
                              setLocationData(prev => ({
                                ...prev,
                                selectedState: locationSuggestion.state || '',
                                selectedDistrict: locationSuggestion.district || '',
                                selectedCity: locationSuggestion.city || '',
                                districts: stateDistricts,
                                cities: stateCities
                              }));
                              
                              // Update profile location
                              setProfile(prev => ({
                                ...prev,
                                location: `${locationSuggestion.city}, ${locationSuggestion.district}, ${locationSuggestion.state}`,
                                pincode: pincode // Ensure pincode is also updated here
                              }));
                              
                              console.log('Profile updated with pincode and location:', {
                                pincode,
                                location: `${locationSuggestion.city}, ${locationSuggestion.district}, ${locationSuggestion.state}`
                              });
                              
                              toast({
                                title: "Location Auto-filled ✓",
                                description: `${locationSuggestion.city}, ${locationSuggestion.district}, ${locationSuggestion.state}`,
                              });
                            }
                          }}
                          placeholder="Enter PIN code to auto-fill location..."
                          className="w-full"
                        />
                        <div className="space-y-1 mt-1">
                          <p className="text-xs text-muted-foreground">
                            💡 Type your PIN code to auto-fill state, district, and city
                          </p>
                          {profile.pincode && locationData.selectedCity && (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Location: {locationData.selectedCity}, {locationData.selectedDistrict}, {locationData.selectedState}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* State Selection */}
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Select 
                          value={locationData.selectedState} 
                          onValueChange={handleStateChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.states.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* District Selection */}
                      <div className="space-y-2">
                        <Label>District</Label>
                        <Select 
                          value={locationData.selectedDistrict}
                          onValueChange={handleDistrictChange}
                          disabled={!locationData.selectedState}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !locationData.selectedState 
                                ? "Select state first" 
                                : locationData.loadingDistricts 
                                  ? "Loading districts..." 
                                  : "Select district"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.districts.map((district) => (
                              <SelectItem key={district} value={district}>
                                {district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City Selection */}
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Select 
                          value={locationData.selectedCity}
                          onValueChange={handleCityChange}
                          disabled={!locationData.selectedDistrict}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !locationData.selectedState
                                ? "Select state first"
                                : !locationData.selectedDistrict
                                  ? "Select district first"
                                  : locationData.loadingCities
                                    ? "Loading cities..."
                                    : "Select city"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Street Address */}
                      <div className="space-y-2">
                        <Label>Street Address</Label>
                        <Input
                          value={profile.address}
                          onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="House/Flat number, Street name, Area"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <p className="text-sm">{user?.profile?.address ? formatLocationDisplay(user.profile.address) : "Not specified"}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <p className="text-sm">{profile.address || "Not specified"}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>PIN Code</Label>
                        <p className="text-sm">{user?.profile?.address?.zipCode || profile.pincode || "Not provided"}</p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Bio</Label>
                  {isEditing ? (
                    <Textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm">{profile.bio}</p>
                  )}
                </div>

                {isEditing && (
                  <div className={`flex gap-2 pt-4 ${isMobile ? 'flex-col' : ''}`}>
                    <Button onClick={handleSave} disabled={saving} className={isMobile ? 'w-full' : ''}>
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className={isMobile ? 'w-full' : ''}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Owned Properties</span>
                    </div>
                    <span className="font-semibold">{stats.ownedProperties}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Inquiries Sent</span>
                    </div>
                    <span className="font-semibold">{stats.inquiriesSent}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Properties Viewed</span>
                    </div>
                    <span className="font-semibold">{stats.propertiesViewed.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Total Favorites</span>
                    </div>
                    <span className="font-semibold">{stats.totalFavorites}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Saved Searches</span>
                    </div>
                    <span className="font-semibold">{stats.savedSearches}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Settings Link Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
                <div className="flex items-center gap-3">
                  <Settings className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Manage Your Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure notifications, privacy, security, and account settings
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/customer/settings')} className={isMobile ? 'w-full' : ''}>
                  Go to Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!loading && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const getActivityColor = (type: string) => {
                      switch (type) {
                        case 'property_posted': return 'bg-green-500';
                        case 'inquiry': return 'bg-blue-500';
                        case 'favorite': return 'bg-red-500';
                        case 'search': return 'bg-purple-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {customerDashboardService.formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading activity...</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground">
                    Start browsing properties to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={(open) => !verifyingOtp && !open && handleCancelOTP()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Changes</DialogTitle>
            <DialogDescription>
              {pendingChanges.newEmail
                ? `Enter the 6-digit code sent to your new email: ${pendingChanges.newEmail}`
                : `Enter the 6-digit code sent to your current email: ${originalValues.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={verifyingOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Code expires in {otpExpiry} minutes
              </p>
            </div>

            {pendingChanges.newEmail && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Email Change:</strong> {originalValues.email} → {pendingChanges.newEmail}
                </p>
              </div>
            )}

            {pendingChanges.newPhone && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Phone Change:</strong> {originalValues.phone} → {pendingChanges.newPhone}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelOTP}
              disabled={verifyingOtp}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOTP}
              disabled={verifyingOtp || otp.length !== 6}
              className="w-full sm:w-auto"
            >
              {verifyingOtp ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                "Verify & Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;