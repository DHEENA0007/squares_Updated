import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Search,
  Bell,
  MoreHorizontal,
  MapPin,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useVendorDashboard } from "@/hooks/useVendorDashboard";
import { vendorDashboardService } from "@/services/vendorDashboardService";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const VendorDashboard = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("7d");

  // Real-time dashboard data
  const [dashboardState, dashboardActions] = useVendorDashboard({
    autoRefresh: true,
    refreshInterval: 30000,
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
  } = dashboardState;

  // Slideshow logic for Hero Banner
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideProperties = recentProperties.filter((p: any) => p.images && p.images.length > 0);

  useEffect(() => {
    if (slideProperties.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slideProperties.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [slideProperties.length]);

  const { refreshData, updateFilters } = dashboardActions;

  useEffect(() => {
    updateFilters({ dateRange });
  }, [dateRange, updateFilters]);

  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Dashboard Refreshed",
      description: "Latest data loaded successfully.",
    });
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  // Use real performance data
  const revenueData = performanceData;

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1f3c] to-[#2d325a] text-white p-8 md:p-12 shadow-lg">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                Your Real Estate Success<br />is All Yours.
              </h2>
            </div>
            {/* Decorative House Image Slideshow */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full hidden md:block">
              {slideProperties.length > 0 ? (
                <div className="absolute right-[-50px] bottom-[-50px] w-[400px] h-[400px] rounded-full border-8 border-white/10 shadow-2xl transform rotate-[-10deg] overflow-hidden bg-background">
                  {slideProperties.map((property: any, index: number) => (
                    <Link
                      key={property._id}
                      to={`/vendor/properties/edit/${property._id}`}
                      className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                      title={`View ${property.title}`}
                    >
                      <img
                        src={vendorDashboardService.getImageUrl(property.images[0])}
                        alt={property.title}
                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-700"
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80"
                  alt="House"
                  className="absolute right-[-50px] bottom-[-50px] w-[400px] h-[400px] object-cover rounded-full border-8 border-white/10 shadow-2xl transform rotate-[-10deg]"
                />
              )}
            </div>
          </div>

          {/* Stats & Chart Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Column */}
            <div className="space-y-6">
              {/* Total Revenue Card */}
              <Card className="bg-card border-none shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <div className="text-xs font-semibold text-primary">Total Revenue</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-3xl font-bold">
                      {vendorDashboardService.formatPrice(stats?.totalRevenue || 0)}
                    </h3>
                    <div className="flex items-center text-sm">
                      <span className={`font-medium flex items-center ${stats?.revenueChange?.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {stats?.revenueChange || '0%'} <ArrowUpRight className="h-4 w-4 ml-1" />
                      </span>
                      <span className="text-muted-foreground ml-2">From last period</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Views Card (Replaced Maintenance Cost) */}
              <Card className="bg-card border-none shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-orange-500/10 rounded-full">
                      <div className="text-xs font-semibold text-orange-600">Total Views</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-3xl font-bold">
                      {stats?.propertyViews || 0}
                    </h3>
                    <div className="flex items-center text-sm">
                      <span className={`font-medium flex items-center ${stats?.propertyViewsChange?.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {stats?.propertyViewsChange || '0%'} <ArrowUpRight className="h-4 w-4 ml-1" />
                      </span>
                      <span className="text-muted-foreground ml-2">From last period</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Column */}
            <div className="md:col-span-2">
              <Card className="h-full border-none shadow-sm rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-bold">Performance Overview</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Views</span>
                      </div>
                    </div>
                  </div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[120px] rounded-full h-8 text-xs">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorViews)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No performance data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Leads / Inquiries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Recent Inquiries</h3>
              <Button variant="ghost" className="text-sm text-muted-foreground" asChild>
                <Link to="/vendor/messages">View All</Link>
              </Button>
            </div>
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Property</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.length > 0 ? (
                      recentLeads.map((lead: any, i: number) => (
                        <tr key={lead._id || i} className="group hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.email || i}`} />
                                <AvatarFallback>{lead.name?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{lead.name || 'Unknown User'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {lead.email || lead.phone || 'No contact info'}
                          </td>
                          <td className="p-4 text-sm truncate max-w-[150px]">
                            {lead.propertyTitle || 'General Inquiry'}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className={`border-none ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                              lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                              {lead.status || 'new'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No recent inquiries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>


        </div>

        {/* Right Column (Property List) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Your Properties</h3>
            <Link to="/vendor/properties" className="text-sm text-primary hover:underline">See All</Link>
          </div>

          <div className="space-y-4">
            {recentProperties.length > 0 ? (
              recentProperties.slice(0, 3).map((property: any, i: number) => (
                <Card key={property._id || i} className="overflow-hidden border-none shadow-sm rounded-2xl group cursor-pointer hover:shadow-md transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={vendorDashboardService.getImageUrl(property.images?.[0])}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1600596542815-e32cb141d3ad?auto=format&fit=crop&w=600&q=80";
                      }}
                    />

                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <Badge className={`border-none shadow-sm font-medium ${vendorDashboardService.getStatusColor(property.status)} text-white`}>
                        {property.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-lg mb-1 truncate" title={property.title}>
                      {property.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3 truncate" title={property.location}>
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {property.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">
                        {vendorDashboardService.formatPrice(property.price)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {property.views || 0} views
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-2xl">
                <p>No properties listed yet.</p>
                <Button variant="link" asChild>
                  <Link to="/vendor/properties/add">Add your first property</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;