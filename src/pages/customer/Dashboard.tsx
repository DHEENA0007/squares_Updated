import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Heart, 
  Search, 
  Plus,
  MessageSquare,
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  Eye,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRealtime, usePropertyRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { customerDashboardService, CustomerStats, CustomerActivity, RecommendedProperty } from "@/services/customerDashboardService";

const Dashboard = () => {
  const { isConnected, lastEvent } = useRealtime();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for real dashboard data
  const [stats, setStats] = useState<CustomerStats>({
    propertiesViewed: 0,
    propertiesViewedChange: 'Loading...',
    savedFavorites: 0,
    savedFavoritesChange: 'Loading...',
    activeInquiries: 0,
    activeInquiriesChange: 'Loading...',
    myProperties: 0,
    myPropertiesChange: 'Loading...',
  });
  
  const [recentActivities, setRecentActivities] = useState<CustomerActivity[]>([]);
  const [recommendedProperties, setRecommendedProperties] = useState<RecommendedProperty[]>([]);
  const [quickStats, setQuickStats] = useState({
    favoritesCount: 0,
    messagesCount: 0,
    propertiesCount: 0,
    unreadMessages: 0,
  });

  // Transform stats for UI display
  const displayStats = [
    {
      title: "Properties Viewed",
      value: stats.propertiesViewed.toString(),
      change: stats.propertiesViewedChange,
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Saved Favorites",
      value: stats.savedFavorites.toString(),
      change: stats.savedFavoritesChange,
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Active Inquiries",
      value: stats.activeInquiries.toString(),
      change: stats.activeInquiriesChange,
      icon: MessageSquare,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "My Properties",
      value: stats.myProperties.toString(),
      change: stats.myPropertiesChange,
      icon: Home,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  // Load dashboard data from API
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [
        dashboardResponse,
        activitiesData,
        recommendedData,
        quickStatsData
      ] = await Promise.all([
        customerDashboardService.getCustomerDashboardData(),
        customerDashboardService.getRecentActivities(),
        customerDashboardService.getRecommendedProperties(6),
        customerDashboardService.getQuickStats()
      ]);

      if (dashboardResponse.success) {
        // Ensure stats is never undefined
        if (dashboardResponse.data.stats) {
          setStats(dashboardResponse.data.stats);
        }
        if (dashboardResponse.data.recentActivities) {
          setRecentActivities(dashboardResponse.data.recentActivities);
        }
        if (dashboardResponse.data.recommendedProperties) {
          setRecommendedProperties(dashboardResponse.data.recommendedProperties);
        }
        if (dashboardResponse.data.quickStats) {
          setQuickStats(dashboardResponse.data.quickStats);
        }
      } else {
        // Fallback to individual API calls
        setRecentActivities(activitiesData);
        setRecommendedProperties(recommendedData);
        setQuickStats(quickStatsData);
        
        // Load stats separately
        const statsData = await customerDashboardService.getCustomerStats();
        if (statsData) {
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Realtime integration for dashboard updates - memoize callbacks
  const handleStatsUpdate = useCallback(() => {
    console.log("Stats updated via realtime");
    refreshDashboard();
  }, [refreshDashboard]);

  const handlePropertiesUpdate = useCallback(() => {
    console.log("Properties updated via realtime");
    refreshDashboard();
  }, [refreshDashboard]);

  usePropertyRealtime({
    refreshStats: handleStatsUpdate,
    refreshProperties: handlePropertiesUpdate
  });

  // Listen to specific realtime events for immediate updates
  useRealtimeEvent('property_viewed', useCallback((data) => {
    setStats(prev => ({
      ...prev,
      propertiesViewed: prev.propertiesViewed + 1,
      propertiesViewedChange: '+1 new view'
    }));
  }, []));

  useRealtimeEvent('favorite_added', useCallback((data) => {
    setStats(prev => ({
      ...prev,
      savedFavorites: prev.savedFavorites + 1,
      savedFavoritesChange: '+1 new favorite'
    }));
    setQuickStats(prev => ({
      ...prev,
      favoritesCount: prev.favoritesCount + 1
    }));
  }, []));

  useRealtimeEvent('favorite_removed', useCallback((data) => {
    setStats(prev => ({
      ...prev,
      savedFavorites: Math.max(0, prev.savedFavorites - 1),
      savedFavoritesChange: '-1 favorite removed'
    }));
    setQuickStats(prev => ({
      ...prev,
      favoritesCount: Math.max(0, prev.favoritesCount - 1)
    }));
  }, []));

  useRealtimeEvent('property_inquiry', useCallback((data) => {
    setStats(prev => ({
      ...prev,
      activeInquiries: prev.activeInquiries + 1,
      activeInquiriesChange: '+1 new inquiry'
    }));
  }, []));

  useRealtimeEvent('new_message', (data) => {
    setQuickStats(prev => ({
      ...prev,
      messagesCount: prev.messagesCount + 1,
      unreadMessages: prev.unreadMessages + 1
    }));
  });

  // Get activity icon component from string
  const getActivityIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'Heart': Heart,
      'MessageSquare': MessageSquare,
      'Search': Search,
      'Home': Home,
      'Edit': TrendingUp
    };
    return iconMap[iconName] || TrendingUp;
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time updates active' : 'Offline mode'}
          </span>
          {lastEvent && (
            <Badge variant="secondary" className="text-xs">
              Last update: {customerDashboardService.formatTimeAgo(lastEvent.timestamp)}
            </Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDashboard}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{user?.profile?.firstName ? `, ${user.profile.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your property journey
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/customer/search">
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Search Properties
            </Button>
          </Link>
          <Link to="/customer/post-property">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Post Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading dashboard data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {displayStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions and searches</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.icon);
                  return (
                    <div key={activity._id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        {activity.property && (
                          <p className="text-sm text-muted-foreground">{activity.property}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {customerDashboardService.formatTimeAgo(activity.time)}
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
                  <span className="text-sm text-muted-foreground">Loading activities...</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground">
                  Start browsing properties to see your activity here
                </p>
              </div>
            )}
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/customer/favorites">
              <Button variant="outline" className="w-full justify-start">
                <Heart className="w-4 h-4 mr-2" />
                My Favorites ({quickStats.favoritesCount})
              </Button>
            </Link>
            <Link to="/customer/messages">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages ({quickStats.messagesCount})
                {quickStats.unreadMessages > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs px-2 py-1">
                    {quickStats.unreadMessages}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link to="/customer/my-properties">
              <Button variant="outline" className="w-full justify-start">
                <Home className="w-4 h-4 mr-2" />
                My Properties ({quickStats.propertiesCount})
              </Button>
            </Link>
            <Link to="/customer/services">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Book Services
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Properties */}
      {!loading && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recommended for You</CardTitle>
                <CardDescription>Properties matching your preferences</CardDescription>
              </div>
              <Link to="/customer/search">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recommendedProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedProperties.map((property) => (
                  <div key={property._id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      <Home className="w-12 h-12 text-muted-foreground" />
                      {property.image && (
                        <img 
                          src={property.image} 
                          alt={property.title}
                          className="absolute top-0 left-0 w-full h-full object-fill"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>
                        <Button size="sm" variant="ghost" className="p-1">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">{property.location}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-primary">{property.price}</span>
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-xs">{property.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {property.propertyType}
                        </Badge>
                        <span>{property.bedrooms} BHK</span>
                        <span>{property.area} sq ft</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No recommendations available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start browsing and marking favorites to get personalized recommendations
                </p>
                <Link to="/customer/search">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Browse Properties
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;