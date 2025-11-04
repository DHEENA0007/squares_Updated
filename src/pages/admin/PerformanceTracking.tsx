import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Building2, Star, Eye, Phone, MessageSquare } from "lucide-react";

interface VendorPerformance {
  _id: string;
  vendor: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  metrics: {
    totalProperties: number;
    activeProperties: number;
    viewsThisMonth: number;
    leadsThisMonth: number;
    averageRating: number;
    responseRate: number;
    responseTime: number; // in hours
    conversionRate: number;
  };
  trends: {
    propertiesChange: number;
    viewsChange: number;
    leadsChange: number;
    ratingChange: number;
  };
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedDate: string;
}

const PerformanceTracking = () => {
  const [vendors, setVendors] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalProperties');
  const [filterStatus, setFilterStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');

  const fetchVendorPerformance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy,
        status: filterStatus,
        timeRange,
      });

      const response = await fetch(`/api/admin/vendors/performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error('Failed to fetch vendor performance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorPerformance();
  }, [sortBy, filterStatus, timeRange]);

  const getPerformanceScore = (vendor: VendorPerformance) => {
    const { metrics } = vendor;
    const score = (
      (Math.min(metrics.averageRating / 5, 1) * 25) +
      (Math.min(metrics.responseRate / 100, 1) * 25) +
      (Math.min(metrics.conversionRate / 10, 1) * 25) +
      (Math.max(0, Math.min((100 - metrics.responseTime) / 100, 1)) * 25)
    );
    return Math.round(score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} hr`;
    return `${Math.round(hours / 24)} day`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor vendor and builder performance metrics
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalProperties">Total Properties</SelectItem>
                  <SelectItem value="viewsThisMonth">Monthly Views</SelectItem>
                  <SelectItem value="leadsThisMonth">Monthly Leads</SelectItem>
                  <SelectItem value="averageRating">Rating</SelectItem>
                  <SelectItem value="responseRate">Response Rate</SelectItem>
                  <SelectItem value="performanceScore">Performance Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchVendorPerformance} variant="outline">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{vendors.length}</div>
                <div className="text-sm text-muted-foreground">Total Vendors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {vendors.reduce((sum, v) => sum + v.metrics.totalProperties, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="w-8 h-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {vendors.length > 0 
                    ? (vendors.reduce((sum, v) => sum + v.metrics.averageRating, 0) / vendors.length).toFixed(1)
                    : '0.0'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {vendors.reduce((sum, v) => sum + v.metrics.viewsThisMonth, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Monthly Views</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance List */}
      <div className="space-y-4">
        {vendors.map((vendor) => {
          const performanceScore = getPerformanceScore(vendor);
          return (
            <Card key={vendor._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Vendor Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{vendor.vendor.name}</h3>
                        <p className="text-muted-foreground">{vendor.vendor.company}</p>
                        <p className="text-sm text-muted-foreground">{vendor.vendor.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getScoreBadge(performanceScore)}>
                          Score: {performanceScore}/100
                        </Badge>
                        <Badge variant="outline">
                          {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    {/* Performance Score Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Performance</span>
                        <span className={getScoreColor(performanceScore)}>{performanceScore}%</span>
                      </div>
                      <Progress value={performanceScore} className="h-2" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-lg font-bold">{vendor.metrics.totalProperties}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Properties</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-lg font-bold">{vendor.metrics.viewsThisMonth.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Monthly Views</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-lg font-bold">{vendor.metrics.leadsThisMonth}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Monthly Leads</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-muted-foreground" />
                          <span className="text-lg font-bold">{vendor.metrics.averageRating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Rating</div>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response Rate:</span>
                        <span className="font-medium">{vendor.metrics.responseRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className="font-medium">{formatResponseTime(vendor.metrics.responseTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conversion Rate:</span>
                        <span className="font-medium">{vendor.metrics.conversionRate}%</span>
                      </div>
                    </div>

                    {/* Trends */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        {vendor.trends.propertiesChange >= 0 ? (
                          <TrendingUp className={`w-4 h-4 ${getTrendColor(vendor.trends.propertiesChange)}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 ${getTrendColor(vendor.trends.propertiesChange)}`} />
                        )}
                        <span className={`text-sm ${getTrendColor(vendor.trends.propertiesChange)}`}>
                          {vendor.trends.propertiesChange >= 0 ? '+' : ''}{vendor.trends.propertiesChange} properties
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.trends.viewsChange >= 0 ? (
                          <TrendingUp className={`w-4 h-4 ${getTrendColor(vendor.trends.viewsChange)}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 ${getTrendColor(vendor.trends.viewsChange)}`} />
                        )}
                        <span className={`text-sm ${getTrendColor(vendor.trends.viewsChange)}`}>
                          {vendor.trends.viewsChange >= 0 ? '+' : ''}{vendor.trends.viewsChange}% views
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.trends.leadsChange >= 0 ? (
                          <TrendingUp className={`w-4 h-4 ${getTrendColor(vendor.trends.leadsChange)}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 ${getTrendColor(vendor.trends.leadsChange)}`} />
                        )}
                        <span className={`text-sm ${getTrendColor(vendor.trends.leadsChange)}`}>
                          {vendor.trends.leadsChange >= 0 ? '+' : ''}{vendor.trends.leadsChange}% leads
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.trends.ratingChange >= 0 ? (
                          <TrendingUp className={`w-4 h-4 ${getTrendColor(vendor.trends.ratingChange)}`} />
                        ) : (
                          <TrendingDown className={`w-4 h-4 ${getTrendColor(vendor.trends.ratingChange)}`} />
                        )}
                        <span className={`text-sm ${getTrendColor(vendor.trends.ratingChange)}`}>
                          {vendor.trends.ratingChange >= 0 ? '+' : ''}{vendor.trends.ratingChange.toFixed(1)} rating
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Vendor
                      </Button>
                      {vendor.status === 'active' && performanceScore < 50 && (
                        <Button variant="outline" size="sm" className="text-orange-600">
                          Send Warning
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {vendors.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Vendors Found</h3>
              <p className="text-muted-foreground">
                No vendors match your current filters.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceTracking;
