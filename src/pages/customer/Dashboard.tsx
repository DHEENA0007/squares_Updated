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
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRealtime, usePropertyRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { customerDashboardService, CustomerStats, CustomerActivity, RecommendedProperty } from "@/services/customerDashboardService";

const Dashboard = () => {
  const { isConnected, lastEvent } = useRealtime();
  const { user } = useAuth();
  const navigate = useNavigate();
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
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Saved Favorites",
      value: stats.savedFavorites.toString(),
      change: stats.savedFavoritesChange,
      icon: Heart,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Active Inquiries",
      value: stats.activeInquiries.toString(),
      change: stats.activeInquiriesChange,
      icon: MessageSquare,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "My Properties",
      value: stats.myProperties.toString(),
      change: stats.myPropertiesChange,
      icon: Home,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
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

  // Integration for dashboard updates - memoize callbacks
  const handleStatsUpdate = useCallback(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const handlePropertiesUpdate = useCallback(() => {
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

  const handleActivityClick = (activity: CustomerActivity) => {
    if (activity.propertyId) {
      navigate(`/customer/property/${activity.propertyId}`);
    } else if (activity.type === 'inquiry') {
      navigate('/customer/messages');
    } else if (activity.type === 'search') {
      navigate('/customer/search');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-responsive mt-8 pb-10">
      {/* Header Section */}
      <div className="dashboard-header-responsive flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="dashboard-title-responsive text-3xl font-bold tracking-tight">
            Welcome back{user?.profile?.firstName ? `, ${user.profile.firstName}` : ''}!
          </h1>
          <p className="text-body-responsive text-muted-foreground mt-2">
            Here's what's happening with your property journey today.
          </p>
        </div>
        <div className="flex flex-row gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="btn-responsive touch-friendly h-10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">↻</span>
          </Button>
          <Link to="/customer/search">
            <Button className="btn-responsive w-full sm:w-auto touch-friendly h-10 shadow-sm hover:shadow-md transition-all">
              <Search className="w-4 h-4 mr-2" />
              <span className="text-responsive-sm">Search Properties</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-lg font-medium">Loading dashboard data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {!loading && (
        <div className="grid-dashboard animate-slide-up-responsive gap-6">
          {displayStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="stats-card-responsive hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1">
                    {stat.change.includes('+') ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : null}
                    <span className={stat.change.includes('+') ? 'text-green-600' : ''}>
                      {stat.change}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-[350px]">
          <CardHeader className="border-b bg-muted/5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription className="mt-0.5 text-xs">Your latest interactions</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex h-8 text-xs"
                onClick={() => navigate('/customer/profile')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {!loading && recentActivities.length > 0 ? (
              <div className="divide-y h-full overflow-y-auto">
                {recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.icon);
                  return (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <div className="p-2 bg-primary/10 rounded-full mt-0.5 shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none mb-1 group-hover:text-primary transition-colors">{activity.message}</p>
                        {activity.property && (
                          <p className="text-xs text-muted-foreground truncate mb-0.5">{activity.property}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80">
                          {customerDashboardService.formatTimeAgo(activity.time)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivityClick(activity);
                        }}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading activities...</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 h-full flex flex-col items-center justify-center">
                <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground">No recent activity</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Start browsing properties to see your activity here
                </p>
                <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={() => navigate('/customer/search')}>
                  Browse Properties
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-fit shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="border-b bg-muted/5 py-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription className="mt-0.5 text-xs">Frequently used features</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Link to="/customer/favorites" className="block">
              <Button variant="outline" className="w-full justify-between h-12 hover:border-primary/50 hover:bg-primary/5 group">
                <div className="flex items-center">
                  <div className="bg-red-100 dark:bg-red-900/20 p-1.5 rounded-md mr-3 group-hover:scale-110 transition-transform">
                    <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span>My Favorites</span>
                </div>
                <Badge variant="secondary" className="bg-muted group-hover:bg-background">
                  {quickStats.favoritesCount}
                </Badge>
              </Button>
            </Link>

            <Link to="/customer/messages" className="block">
              <Button variant="outline" className="w-full justify-between h-12 hover:border-primary/50 hover:bg-primary/5 group">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-1.5 rounded-md mr-3 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Messages</span>
                </div>
                <div className="flex items-center gap-2">
                  {quickStats.unreadMessages > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-600">
                      {quickStats.unreadMessages} new
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-muted group-hover:bg-background">
                    {quickStats.messagesCount}
                  </Badge>
                </div>
              </Button>
            </Link>

            <Link to="/customer/owned-properties" className="block">
              <Button variant="outline" className="w-full justify-between h-12 hover:border-primary/50 hover:bg-primary/5 group">
                <div className="flex items-center">
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-1.5 rounded-md mr-3 group-hover:scale-110 transition-transform">
                    <Home className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span>My Properties</span>
                </div>
                <Badge variant="secondary" className="bg-muted group-hover:bg-background">
                  {quickStats.propertiesCount}
                </Badge>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Properties */}
      {!loading && (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="border-b bg-muted/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Recommended for You</CardTitle>
                <CardDescription className="mt-1">Properties matching your preferences</CardDescription>
              </div>
              <Link to="/customer/search">
                <Button variant="ghost" className="group">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {recommendedProperties.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {recommendedProperties.map((property) => (
                  <Link
                    key={property._id}
                    to={`/customer/property/${property._id}`}
                    className="group bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row h-auto"
                  >
                    {/* Image Section */}
                    <div className="w-full sm:w-56 h-48 sm:h-auto relative shrink-0 bg-muted overflow-hidden">
                      {property.image ? (
                        <img
                          src={property.image}
                          alt={property.title}
                          className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            const icon = document.createElement('div');
                            icon.innerHTML = '<svg class="w-12 h-12 text-muted-foreground/20" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
                            e.currentTarget.parentElement?.appendChild(icon);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Home className="w-12 h-12 text-muted-foreground/20" />
                        </div>
                      )}

                      <div className="absolute top-2 right-2 sm:hidden">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full h-7 w-7 shadow-sm bg-white/90 hover:bg-white text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">{property.location}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-primary">{property.price}</div>
                          </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-5">
                            {property.listingType === 'sale' ? 'Sale' : 'Rent'}
                          </Badge>
                          {property.propertyType && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0 h-5">
                              {property.propertyType}
                            </Badge>
                          )}
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px] px-1.5 py-0 h-5">
                            Verified
                          </Badge>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/40">
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Beds</span>
                            <span className="text-xs font-semibold text-foreground">{property.bedrooms}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center border-l border-border/40">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Baths</span>
                            <span className="text-xs font-semibold text-foreground">{property.bathrooms}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center border-l border-border/40">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Area</span>
                            <span className="text-xs font-semibold text-foreground">{property.area}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="w-5 h-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                                U{i}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">+12</span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md border-border hover:bg-muted hover:text-red-500 hidden sm:flex"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm text-xs font-medium rounded-md">
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed">
                <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">No recommendations yet</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto mb-6">
                  We need to know more about your preferences. Start browsing and marking favorites to get personalized recommendations.
                </p>
                <Link to="/customer/search">
                  <Button size="lg" className="shadow-md hover:shadow-lg transition-all">
                    <Search className="w-5 h-5 mr-2" />
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