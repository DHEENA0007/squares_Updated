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
  Users,
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
  DollarSign,
  Target,
  BarChart3,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useVendorDashboard } from "@/hooks/useVendorDashboard";
import { vendorDashboardService } from "@/services/vendorDashboardService";
import { toast } from "@/hooks/use-toast";

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
      title: "Active Leads",
      value: stats?.activeLeads || 0,
      change: stats?.activeLeadsChange || "+0",
      icon: Users,
      color: "text-green-600",
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
      value: stats?.totalMessages || 0,
      change: stats?.messagesChange || "0 unread",
      icon: MessageSquare,
      color: "text-orange-600",
    },
    {
      title: "Total Revenue",
      value: vendorDashboardService.formatPrice(stats?.totalRevenue || 0),
      change: stats?.revenueChange || "+0%",
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || 0}%`,
      change: stats?.conversionChange || "+0%",
      icon: Target,
      color: "text-indigo-600",
    },
  ];

  // Use real-time performance data or fallback
  // Use real performance data only, no fallback to mock data
  const chartData = performanceData.length > 0 ? performanceData : [];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Manage your properties and track your performance</p>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadNotifications > 0 && (
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Notifications ({unreadNotifications})
            </Button>
          )}
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statsCards.map((stat) => {
          const changeData = vendorDashboardService.formatPercentageChange(stat.change);
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      {changeData.isPositive ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <p className={`text-xs ${changeData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change}
                      </p>
                    </div>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Leads & Views Performance
              <div className="flex gap-2">
                {["7d", "30d", "90d"].map((range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDateRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="views" fill="#8884d8" name="Views" />
                  <Bar dataKey="leads" fill="#82ca9d" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Activity className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Performance Data</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Performance metrics will appear here once your properties start receiving views and generating leads.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Leads
              <Button variant="ghost" size="sm">View All</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.propertyTitle}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={vendorDashboardService.getInterestColor(lead.interestLevel)}>
                          {lead.interestLevel}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => updateLeadStatus(lead._id, 'contacted')}
                            >
                              Mark as Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateLeadStatus(lead._id, 'qualified')}
                            >
                              Mark as Qualified
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateLeadStatus(lead._id, 'converted')}
                            >
                              Mark as Converted
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Activity className="w-3 h-3 mr-1" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent leads</p>
                  <p className="text-sm">New leads will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Properties
            <Button variant="ghost" size="sm">View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <Card key={property._id} className="overflow-hidden">
                  <div className="relative">
                    <img 
                      src={property.images[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&h=200&fit=crop&auto=format"} 
                      alt={property.title}
                      className="w-full h-32 object-cover"
                    />
                    <Badge className={`absolute top-2 right-2 ${vendorDashboardService.getStatusColor(property.status)} text-white`}>
                      {property.status}
                    </Badge>
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {property.listingType}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {property.location}
                    </p>
                    <p className="text-lg font-bold text-primary mb-3">
                      {vendorDashboardService.formatPrice(property.price, property.currency)}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {property.views} views
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {property.leads} leads
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {property.favorites}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No properties found</p>
                <p className="text-sm">Add your first property to get started</p>
                <Button className="mt-4">
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