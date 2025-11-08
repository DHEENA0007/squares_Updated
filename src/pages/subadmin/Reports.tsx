import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, TrendingUp, Users, Building, Eye, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportData {
  propertyStats: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  userStats: {
    totalVendors: number;
    totalCustomers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  };
  engagementStats: {
    totalViews: number;
    totalMessages: number;
    totalReviews: number;
    averageRating: number;
  };
  supportStats: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
  };
}

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30days");
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/reports?range=${dateRange}`);
      const data = await handleApiResponse<{ data: ReportData }>(response);
      setReportData(data.data || null);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching report data",
        variant: "destructive",
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (type: string) => {
    try {
      toast({
        title: "Exporting",
        description: `Generating ${type} report...`,
      });

      const response = await fetchWithAuth(`/subadmin/reports/export?type=${type}&range=${dateRange}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buildhomemartsquares_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Report exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error exporting report",
        variant: "destructive",
      });
    }
  };

  if (loading || !reportData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights dashboard
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExportReport('full')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.propertyStats.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-green-600">
                {reportData.propertyStats.active} Active
              </div>
              <div className="text-xs text-yellow-600">
                {reportData.propertyStats.pending} Pending
              </div>
              <div className="text-xs text-red-600">
                {reportData.propertyStats.rejected} Rejected
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.userStats.totalVendors + reportData.userStats.totalCustomers}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-blue-600">
                {reportData.userStats.totalVendors} Vendors
              </div>
              <div className="text-xs text-purple-600">
                {reportData.userStats.totalCustomers} Customers
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.engagementStats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Property page views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.supportStats.totalTickets}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-xs text-orange-600">
                {reportData.supportStats.openTickets} Open
              </div>
              <div className="text-xs text-green-600">
                {reportData.supportStats.resolvedTickets} Resolved
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Distribution</CardTitle>
                <CardDescription>Breakdown of property statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Properties</span>
                    <span className="text-sm font-semibold text-green-600">
                      {reportData.propertyStats.active} ({Math.round((reportData.propertyStats.active / reportData.propertyStats.total) * 100)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending Review</span>
                    <span className="text-sm font-semibold text-yellow-600">
                      {reportData.propertyStats.pending} ({Math.round((reportData.propertyStats.pending / reportData.propertyStats.total) * 100)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rejected</span>
                    <span className="text-sm font-semibold text-red-600">
                      {reportData.propertyStats.rejected} ({Math.round((reportData.propertyStats.rejected / reportData.propertyStats.total) * 100)}%)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>User registration statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Active Users</span>
                    <span className="text-sm font-semibold">{reportData.userStats.activeUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Users This Month</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">
                        {reportData.userStats.newUsersThisMonth}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vendors</span>
                    <span className="text-sm font-semibold">{reportData.userStats.totalVendors}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Customers</span>
                    <span className="text-sm font-semibold">{reportData.userStats.totalCustomers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>User interaction statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Views</span>
                    <span className="text-sm font-semibold">{reportData.engagementStats.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Messages</span>
                    <span className="text-sm font-semibold">{reportData.engagementStats.totalMessages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Reviews</span>
                    <span className="text-sm font-semibold">{reportData.engagementStats.totalReviews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Rating</span>
                    <span className="text-sm font-semibold">{reportData.engagementStats.averageRating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Performance</CardTitle>
                <CardDescription>Customer support metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Tickets</span>
                    <span className="text-sm font-semibold">{reportData.supportStats.totalTickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Tickets</span>
                    <span className="text-sm font-semibold text-orange-600">{reportData.supportStats.openTickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Resolved Tickets</span>
                    <span className="text-sm font-semibold text-green-600">{reportData.supportStats.resolvedTickets}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Resolution Time</span>
                    <span className="text-sm font-semibold">{reportData.supportStats.avgResolutionTime}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Download detailed reports</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" onClick={() => handleExportReport('properties')}>
                <Download className="h-4 w-4 mr-2" />
                Properties Report
              </Button>
              <Button variant="outline" onClick={() => handleExportReport('users')}>
                <Download className="h-4 w-4 mr-2" />
                Users Report
              </Button>
              <Button variant="outline" onClick={() => handleExportReport('engagement')}>
                <Download className="h-4 w-4 mr-2" />
                Engagement Report
              </Button>
              <Button variant="outline" onClick={() => handleExportReport('support')}>
                <Download className="h-4 w-4 mr-2" />
                Support Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs placeholder */}
        <TabsContent value="properties" className="space-y-4 mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Detailed Property Analytics</h3>
              <p className="text-muted-foreground text-center">
                Comprehensive property statistics and charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Detailed User Analytics</h3>
              <p className="text-muted-foreground text-center">
                Comprehensive user statistics and charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4 mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Detailed Engagement Analytics</h3>
              <p className="text-muted-foreground text-center">
                Comprehensive engagement statistics and charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4 mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Detailed Support Analytics</h3>
              <p className="text-muted-foreground text-center">
                Comprehensive support statistics and charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
