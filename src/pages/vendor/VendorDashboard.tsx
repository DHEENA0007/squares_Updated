import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Home,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  MoreHorizontal,
  Bell,
  MapPin,
  Heart,
  Star,
  Phone,
  Mail,
  Activity,
  Target,
  BarChart3,
  RefreshCw,
  Loader2,
  IndianRupee,
} from "lucide-react";
import { useVendorDashboard } from "@/hooks/useVendorDashboard";
import { vendorDashboardService } from "@/services/vendorDashboardService";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const VendorDashboard = () => {
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");

  // Real-time dashboard data
  const [dashboardState, dashboardActions] = useVendorDashboard({
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    enableRealtime: true,
  });

  const {
    stats,
    recentProperties,
    recentLeads,
    performanceData,
    notifications,
    isLoading,
    error,
    lastUpdated,
  } = dashboardState;

  const {
    refreshData,
    refreshStats,
    updateFilters,
    markNotificationAsRead,
    updateLeadStatus,
  } = dashboardActions;

  // Handle date range changes
  useEffect(() => {
    updateFilters({ dateRange });
  }, [dateRange, updateFilters]);

  // Handle manual refresh
  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Dashboard Refreshed",
      description: "All data has been updated with the latest information.",
    });
  };

  // Loading state
  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  // Create stats cards from real-time data
  const statsCards = [
    {
      title: "Total Properties",
      value: stats?.totalProperties || 0,
      change: stats?.totalPropertiesChange || "+0",
      icon: Home,
      color: "text-blue-600",
    },
    {
      title: "Property Views",
      value: stats?.propertyViews || 0,
      change: stats?.propertyViewsChange || "+0%",
      icon: Eye,
      color: "text-purple-600",
    },
    {
      title: "Messages",
      value: stats?.dateRangeMessages || stats?.totalMessages || 0,
      change: stats?.messagesChange || "0 unread",
      icon: MessageSquare,
      color: "text-orange-600",
    },
    {
      title: "Total Revenue",
      value: vendorDashboardService.formatPrice(stats?.totalRevenue || 0),
      change: stats?.revenueChange || "+0%",
      icon: IndianRupee,
      color: "text-emerald-600",
    },
    {
      title: "Avg. Rating",
      value: stats?.averageRating ? stats.averageRating.toFixed(1) : "0.0",
      change: stats?.ratingChange || "+0%",
      icon: Star,
      color: "text-yellow-600",
    },
    {
      title: "Phone Clicks",
      value: stats?.totalPhoneCalls || stats?.phoneCalls || 0,
      change: stats?.phoneCallsChange || "+0%",
      icon: Phone,
      color: "text-green-600",
    },
  ];

  // Use real-time performance data or fallback
  // Use real performance data only, no fallback to mock data
  const chartData = performanceData.length > 0 ? performanceData : [];


  return (
    <div className="space-y-4 md:space-y-6 mt-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className="text-sm md:text-base text-muted-foreground">Manage your properties and track your performance</p>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="flex-1 sm:flex-none">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadNotifications > 0 && (
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Bell className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Notifications ({unreadNotifications})</span>
                <span className="sm:hidden">({unreadNotifications})</span>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Link to="/vendor/analytics" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">View Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </Button>
            </Link>
            <Link to="/vendor/properties/add" className="flex-1 sm:flex-none">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6">
        {statsCards.map((stat) => {
          const changeData = vendorDashboardService.formatPercentageChange(stat.change);
          return (
            <Card key={stat.title}>
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-lg md:text-2xl font-bold truncate">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      {changeData.isPositive ? (
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500 mr-1 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500 mr-1 flex-shrink-0" />
                      )}
                      <p className={`text-xs truncate ${changeData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change}
                      </p>
                    </div>
                  </div>
                  <stat.icon className={`h-6 w-6 md:h-8 md:w-8 ${stat.color} flex-shrink-0 ml-2`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Performance Chart - Stock Market Style */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
              <span>Views Performance</span>
              <div className="flex gap-1 sm:gap-2">
                {["7d", "30d", "90d"].map((range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDateRange(range)}
                    className="text-xs px-2 py-1 h-7"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: '12px',
                      padding: '8px'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--popover-foreground))',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: '#10b981',
                      stroke: '#fff',
                      strokeWidth: 2
                    }}
                    name="Views"
                    fill="url(#colorViews)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] md:h-[300px] text-center px-4">
                <Activity className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-semibold text-muted-foreground mb-2">No Performance Data</h3>
                <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                  Performance metrics will appear here once your properties start receiving views.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
              <span>Recent Activities</span>
              <Button variant="ghost" size="sm" className="self-start sm:self-auto" asChild>
                <Link to="/vendor/analytics">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 md:space-y-4">
              {dashboardState.recentActivities && dashboardState.recentActivities.length > 0 ? (
                dashboardState.recentActivities.slice(0, 8).map((activity) => {
                  // Determine icon based on activity type
                  const getActivityIcon = () => {
                    switch (activity.type) {
                      case 'property_listed':
                        return <Home className="w-4 h-4 md:w-5 md:h-5" />;
                      case 'property_updated':
                        return <Activity className="w-4 h-4 md:w-5 md:h-5" />;
                      case 'inquiry_received':
                        return <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />;
                      case 'property_viewed':
                        return <Eye className="w-4 h-4 md:w-5 md:h-5" />;
                      default:
                        return <Activity className="w-4 h-4 md:w-5 md:h-5" />;
                    }
                  };

                  const getActivityColor = () => {
                    switch (activity.type) {
                      case 'property_listed':
                        return 'bg-green-100 dark:bg-green-900';
                      case 'property_updated':
                        return 'bg-blue-100 dark:bg-blue-900';
                      case 'inquiry_received':
                        return 'bg-orange-100 dark:bg-orange-900';
                      case 'property_viewed':
                        return 'bg-purple-100 dark:bg-purple-900';
                      default:
                        return 'bg-gray-100 dark:bg-gray-900';
                    }
                  };

                  return (
                    <div key={activity._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 md:w-10 md:h-10 ${getActivityColor()} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{activity.message}</p>
                          {activity.property && (
                            <p className="text-sm text-muted-foreground truncate">{activity.property}</p>
                          )}
                          {activity.metadata?.customerName && (
                            <p className="text-xs text-muted-foreground truncate">
                              From: {activity.metadata.customerName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(activity.time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <Activity className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-50" />
                  <p className="text-sm md:text-base">No recent activities</p>
                  <p className="text-xs md:text-sm">Property inquiries and updates will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Properties */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
            <span>Recent Properties</span>
            <Button variant="ghost" size="sm" className="self-start sm:self-auto">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <Card key={property._id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={vendorDashboardService.getImageUrl(property.images?.[0])}
                      alt={property.title}
                      className="w-full h-24 md:h-32 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&h=200&fit=crop&auto=format";
                      }}
                    />
                    <Badge className={`absolute top-1 right-1 md:top-2 md:right-2 text-xs ${vendorDashboardService.getStatusColor(property.status)} text-white`}>
                      {property.status}
                    </Badge>
                    <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2">
                      <Badge variant="secondary" className="text-xs">
                        {property.listingType}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 md:p-4">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-1">{property.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{property.location}</span>
                    </p>
                    <p className="text-base md:text-lg font-bold text-primary mb-2 md:mb-3 truncate">
                      {vendorDashboardService.formatPrice(property.price, property.currency)}
                    </p>
                    <div className="flex justify-between text-xs md:text-sm gap-1">
                      <span className="flex items-center flex-1 min-w-0">
                        <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{property.views} views</span>
                      </span>
                      <span className="flex items-center flex-1 min-w-0">
                        <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{property.favorites} fav</span>
                      </span>
                      <span className="flex items-center flex-1 min-w-0">
                        <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{property.rating || 0}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-6 md:py-8 text-muted-foreground">
                <Home className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base">No properties found</p>
                <p className="text-xs md:text-sm">Add your first property to get started</p>
                <Button className="mt-3 md:mt-4" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;