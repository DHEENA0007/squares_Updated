import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Bell,
  Eye,
  Lock,
  CreditCard,
  Star,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Activity
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    propertyAlerts: true,
    priceDropAlerts: true
  });

  const [privacy, setPrivacy] = useState({
    showPhone: true,
    showEmail: false,
    profileVisibility: "public"
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
      setProfile({
        name: userService.getFullName(userData),
        email: userData.email,
        phone: userData.profile.phone || "",
        location: userData.profile.address ? 
          `${userData.profile.address.city || ""}, ${userData.profile.address.state || ""}`.replace(/^,\s*|,\s*$/g, '') : "",
        address: userData.profile.address?.street || "",
        pincode: userData.profile.address?.pincode || "",
        bio: "", // Bio field not available in current User model
        joinDate: userService.formatCreationDate(userData.createdAt),
        avatar: "", // Avatar field not available in current User model
        verified: userData.emailVerified
      });

      // Map preferences
      setPreferences({
        emailNotifications: userData.preferences?.notifications?.email ?? true,
        smsNotifications: userData.preferences?.notifications?.sms ?? false,
        pushNotifications: userData.preferences?.notifications?.push ?? true,
        marketingEmails: false, // Marketing field not available in current User model
        propertyAlerts: true, // Property alerts field not available in current User model
        priceDropAlerts: true // Price drop alerts field not available in current User model
      });

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
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, [loadUserData]);

  // Load data on component mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Listen to realtime events for profile updates
  useRealtimeEvent('profile_updated', () => {
    console.log("Profile updated via realtime");
    refreshData();
  });

  useRealtimeEvent('property_inquiry', (data) => {
    setStats(prev => ({
      ...prev,
      inquiriesReceived: prev.inquiriesReceived + 1
    }));
  });

  useRealtimeEvent('property_viewed', (data) => {
    setStats(prev => ({
      ...prev,
      totalViews: prev.totalViews + 1
    }));
  });

  useRealtimeEvent('property_favorited', (data) => {
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
  });

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Prepare user data for update
      const updateData: Partial<UserType> = {
        profile: {
          firstName: profile.name.split(' ')[0] || '',
          lastName: profile.name.split(' ').slice(1).join(' ') || '',
          phone: profile.phone,
          address: {
            street: profile.address,
            city: profile.location.split(',')[0]?.trim() || '',
            state: profile.location.split(',')[1]?.trim() || '',
            pincode: profile.pincode
          }
        },
        preferences: {
          ...user.preferences,
          notifications: {
            email: preferences.emailNotifications,
            sms: preferences.smsNotifications,
            push: preferences.pushNotifications
          }
        }
      };

      await userService.updateCurrentUser(updateData);
      await loadUserData(); // Refresh data
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

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean | string) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value
    }));
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
            Manage your personal information and preferences
          </p>
        </div>
        
        {!isEditing && !loading && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
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
                  
                  <div className="space-y-2">
                    <Label>Location</Label>
                    {isEditing ? (
                      <Input
                        value={profile.location}
                        onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm">{profile.location}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address</Label>
                    {isEditing ? (
                      <Input
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Street address"
                      />
                    ) : (
                      <p className="text-sm">{profile.address}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    {isEditing ? (
                      <Input
                        value={profile.pincode}
                        onChange={(e) => setProfile(prev => ({ ...prev, pincode: e.target.value }))}
                        placeholder="Postal code"
                      />
                    ) : (
                      <p className="text-sm">{profile.pincode}</p>
                    )}
                  </div>
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
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates and alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get important updates via text message
                    </p>
                  </div>
                  <Switch
                    checked={preferences.smsNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Browser notifications for instant updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-muted-foreground">
                      Promotional content and special offers
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketingEmails}
                    onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Property Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      New properties matching your criteria
                    </p>
                  </div>
                  <Switch
                    checked={preferences.propertyAlerts}
                    onCheckedChange={(checked) => handlePreferenceChange('propertyAlerts', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Price Drop Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Notifications when saved properties drop in price
                    </p>
                  </div>
                  <Switch
                    checked={preferences.priceDropAlerts}
                    onCheckedChange={(checked) => handlePreferenceChange('priceDropAlerts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Phone Number</p>
                    <p className="text-sm text-muted-foreground">
                      Display your phone number on your public profile
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showPhone}
                    onCheckedChange={(checked) => handlePrivacyChange('showPhone', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Email Address</p>
                    <p className="text-sm text-muted-foreground">
                      Display your email address on your public profile
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
                  />
                </div>
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