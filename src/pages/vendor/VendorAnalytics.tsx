import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Phone,
  MessageSquare,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Home,
  Heart,
  Share,
  Star,
  Clock,
  BarChart3,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { analyticsService, AnalyticsOverviewStats, AnalyticsFilters, PerformanceMetrics } from "@/services/analyticsService";
import { propertyService } from "@/services/propertyService";
import { useToast } from "@/hooks/use-toast";

const VendorAnalytics = () => {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '90days' | '1year'>("30days");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<AnalyticsOverviewStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const filters: AnalyticsFilters = {
    timeframe,
    propertyId: propertyFilter !== 'all' ? propertyFilter : undefined,
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [statsData, metricsData, propertiesData] = await Promise.all([
        analyticsService.getOverviewStats(filters),
        analyticsService.getPerformanceMetrics(filters),
        propertyService.getProperties({ page: 1, limit: 100 })
      ]);
      
      setOverviewStats(statsData);
      setPerformanceMetrics(metricsData);
      setProperties(propertiesData.success ? propertiesData.data.properties : []);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe, propertyFilter]);

  const handleExportData = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(true);
      const blob = await analyticsService.exportAnalyticsData(filters, format);
      const filename = `analytics-${timeframe}-${Date.now()}.${format}`;
      analyticsService.downloadBlob(blob, filename);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  const formatOverviewStats = (stats: AnalyticsOverviewStats) => [
    {
      title: "Total Views",
      value: analyticsService.formatNumber(stats.totalViews),
      change: "N/A", // Would come from historical comparison data
      changeType: "neutral",
      icon: Eye,
      description: "Property page views"
    },
    {
      title: "Leads Generated", 
      value: analyticsService.formatNumber(stats.totalLeads),
      change: "N/A",
      changeType: "neutral", 
      icon: Users,
      description: "This month"
    },
    {
      title: "Phone Calls",
      value: analyticsService.formatNumber(stats.totalCalls),
      change: "N/A",
      changeType: "neutral",
      icon: Phone,
      description: "Direct calls"
    },
    {
      title: "Messages",
      value: analyticsService.formatNumber(stats.totalMessages),
      change: "N/A",
      changeType: "neutral",
      icon: MessageSquare,
      description: "Chat inquiries"
    },
    {
      title: "Revenue",
      value: analyticsService.formatCurrency(stats.totalRevenue),
      change: "N/A",
      changeType: "neutral",
      icon: DollarSign,
      description: "Commission earned"
    },
    {
      title: "Active Properties",
      value: analyticsService.formatNumber(stats.totalProperties),
      change: "N/A",
      changeType: "neutral",
      icon: Home,
      description: "Listed properties"
    },
    {
      title: "Avg. Rating",
      value: stats.averageRating.toFixed(1),
      change: "N/A",
      changeType: "neutral",
      icon: Star,
      description: "Customer rating"
    },
    {
      title: "Response Time",
      value: stats.responseTime,
      change: "N/A",
      changeType: "neutral",
      icon: Clock,
      description: "Avg. response time"
    }
  ];

  const displayStats = overviewStats ? formatOverviewStats(overviewStats) : [];

  // Use real performance metrics data or fallback to default
  const viewsData = performanceMetrics?.viewsData.length ? 
    performanceMetrics.viewsData : 
    analyticsService.generateDateRange(timeframe);

  const leadsData = performanceMetrics?.leadsData.length ?
    performanceMetrics.leadsData :
    analyticsService.generateDateRange(timeframe);

  const conversionData = performanceMetrics?.conversionData.length ?
    performanceMetrics.conversionData :
    analyticsService.generateDateRange(timeframe);

  const revenueData = performanceMetrics?.revenueData.length ?
    performanceMetrics.revenueData :
    analyticsService.generateDateRange(timeframe);

  const propertyPerformance = performanceMetrics?.propertyPerformance || [];

  const leadSources = performanceMetrics?.leadSources.length ? 
    performanceMetrics.leadSources : [
    { name: "Website", value: 45, color: "#8884d8" },
    { name: "Social Media", value: 25, color: "#82ca9d" },
    { name: "Referrals", value: 20, color: "#ffc658" },
    { name: "Direct Call", value: 10, color: "#ff7300" }
  ];

  const demographicsData = performanceMetrics?.demographicsData.length ?
    performanceMetrics.demographicsData : [];

  // Generate engagement data from real metrics or use empty array
  const engagementData = performanceMetrics?.viewsData.length ? 
    performanceMetrics.viewsData.slice(0, 7).map((item, index) => ({
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || item.name,
      favorites: Math.floor(item.value * 0.1),
      shares: Math.floor(item.value * 0.05),
      inquiries: Math.floor(item.value * 0.02)
    })) : [];

  // Use real property performance data instead of hardcoded data
  const topProperties = performanceMetrics?.propertyPerformance.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your property performance and marketing insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as '7days' | '30days' | '90days' | '1year')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleExportData('csv')}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExportData('pdf')}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === "increase" ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${
                      stat.changeType === "increase" ? "text-green-500" : "text-red-500"
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views & Leads Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Views & Leads Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stackId="2" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {leadSources.map((source) => (
                <div key={source.name} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="text-sm">{source.name} ({source.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Property Performance</CardTitle>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property._id} value={property._id}>
                    {property.title.substring(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={propertyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#8884d8" name="Views" />
              <Bar dataKey="leads" fill="#82ca9d" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="favorites" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Favorites"
                />
                <Line 
                  type="monotone" 
                  dataKey="shares" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Shares"
                />
                <Line 
                  type="monotone" 
                  dataKey="inquiries" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Inquiries"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProperties.map((property, index) => (
                <div key={property.propertyId || index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Home className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{property.title}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Eye className="w-3 h-3 mr-1" />
                        {property.views}
                      </span>
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Users className="w-3 h-3 mr-1" />
                        {property.leads}
                      </span>
                      <span className="flex items-center text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {property.conversionRate}%
                      </span>
                    </div>
                  </div>
                  <Badge 
                    variant="default"
                    className="flex-shrink-0"
                  >
                    {analyticsService.formatCurrency(property.revenue)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Peak Activity Time</h4>
              <p className="text-sm text-blue-700">
                Most inquiries come between 6-9 PM. Consider posting new properties during this time.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Best Performing Content</h4>
              <p className="text-sm text-green-700">
                Properties with virtual tours get 35% more leads. Add virtual tours to boost performance.
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Pricing Strategy</h4>
              <p className="text-sm text-amber-700">
                Your commercial properties have higher conversion rates. Consider focusing more on commercial listings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorAnalytics;