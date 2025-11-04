import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { locaService } from "@/services/locaService";

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

const Profile = () => {
  const { isConnected, lastEvent } = useRealtime();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  
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



  // Real stats from API
  const [stats, setStats] = useState({
    propertiesPosted: 0,
    inquiriesReceived: 0,
    responseRate: 0,
    avgResponseTime: "N/A",
    rating: 0,
    reviews: 0,
    totalViews: 0,
    totalFavorites: 0
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
        bio: "", // Bio field not available in current User model
        joinDate: userService.formatCreationDate(userData.createdAt),
        avatar: "", // Avatar field not available in current User model
        verified: userData.emailVerified
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
          inquiriesReceived: dashStats.activeInquiries,
          totalViews: dashStats.propertiesViewed,
          totalFavorites: dashStats.savedFavorites
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
          propertiesPosted: propStats.totalProperties,
          responseRate: Math.round(propStats.conversionRate) || 0,
          avgResponseTime: propStats.averageInquiries > 0 ? "< 2 hours" : "N/A"
        }));
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
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
    console.log("Profile updated via realtime");
    // Directly call loadUserData without going through refreshData
    loadUserData();
  }, []); // Empty dependency array since we want this to be stable

  const handlePropertyInquiry = useCallback(() => {
    setStats(prev => ({
      ...prev,
      inquiriesReceived: prev.inquiriesReceived + 1
    }));
  }, []);

  const handlePropertyViewed = useCallback(() => {
    setStats(prev => ({
      ...prev,
      totalViews: prev.totalViews + 1
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
      
      // Prepare user data for update
      // Ensure preferences is always an object, never undefined
      const defaultPreferences = {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          showEmail: false,
          showPhone: false
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
        }
      } : defaultPreferences;

      const updateData: Partial<UserType> = {
        profile: {
          firstName: profile.name.split(' ')[0] || '',
          lastName: profile.name.split(' ').slice(1).join(' ') || '',
          phone: profile.phone,
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

      console.log('Profile data being sent:', updateData);
      console.log('Current profile.pincode:', profile.pincode);
      console.log('Address object being sent:', updateData.profile?.address);

      await userService.updateCurrentUser(updateData);
      await loadUserData(); // Refresh data
      console.log('User data refreshed, checking pincode...');
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data if needed
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
      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time profile updates active' : 'Offline mode'}
          </span>
          {lastEvent && (
            <Badge variant="secondary" className="text-xs">
              Last update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </Badge>
          )}
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View your profile information and activity. Visit <span className="font-medium">Settings</span> to manage preferences.
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isEditing && !loading && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/customer/settings'}>
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
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-2xl">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 rounded-full"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                    {profile.verified && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {profile.phone}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground">
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
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{stats.rating.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{stats.propertiesPosted}</p>
                    <p className="text-xs text-muted-foreground">Properties</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
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
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
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
                    <Button variant="outline" onClick={handleCancel}>
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
                      <span className="text-sm">Properties Posted</span>
                    </div>
                    <span className="font-semibold">{stats.propertiesPosted}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Inquiries Received</span>
                    </div>
                    <span className="font-semibold">{stats.inquiriesReceived}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Total Views</span>
                    </div>
                    <span className="font-semibold">{stats.totalViews.toLocaleString()}</span>
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
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Average Rating</span>
                    </div>
                    <span className="font-semibold">{stats.rating.toFixed(1)}/5.0</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Response Rate</span>
                    </div>
                    <span className="font-semibold">{stats.responseRate}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Avg Response Time</span>
                    </div>
                    <span className="font-semibold">{stats.avgResponseTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Settings Link Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Manage Your Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure notifications, privacy, security, and account settings
                    </p>
                  </div>
                </div>
                <Button onClick={() => window.location.href = '/customer/settings'}>
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
    </div>
  );
};

export default Profile;