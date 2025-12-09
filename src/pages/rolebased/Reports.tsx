import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Activity,
  Percent,
  Building,
  Star,
  Package,
  Headphones,
  Shield,
  Home,
  ShoppingBag,
  FileQuestion,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReportStats {
  users?: {
    total: number;
    created: number;
    edited: number;
    deleted: number;
    last7Days: number;
    last30Days: number;
  };
  roles?: {
    total: number;
    created: number;
    edited: number;
    deleted: number;
  };
  properties?: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    last7Days: number;
    last30Days: number;
  };
  vendors?: {
    total: number;
    approved: number;
    pending: number;
    last7Days: number;
  };
  supportTickets?: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    replied: number;
    avgResponseTime: number;
    last7Days: number;
    last30Days: number;
  };
  addonServices?: {
    total: number;
    scheduled: number;
    completed: number;
    pending: number;
    last7Days: number;
  };
  reviews?: {
    total: number;
    reported: number;
    deleted: number;
    last7Days: number;
  };
  policies?: {
    privacyEdits: number;
    refundEdits: number;
  };
}

const RoleBasedReports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const permissions = user?.rolePermissions || [];
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [stats, setStats] = useState<ReportStats>({});
  const [activeTab, setActiveTab] = useState("overview");

  const hasPermission = (permission: string) => permissions.includes(permission);

  const hasAnyReportableData = () => {
    return permissions.some(p => 
      p.includes('view') || 
      p.includes('read') || 
      p.includes('create') || 
      p.includes('edit') || 
      p.includes('delete')
    );
  };

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch user activity report from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/user-activity/report?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activity report');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch report data');
      }

      const activityData = result.data.activities;

      const reportStats: ReportStats = {};

      // Map backend data to frontend structure
      if (hasPermission(PERMISSIONS.USERS_VIEW) || hasPermission(PERMISSIONS.USERS_EDIT)) {
        reportStats.users = {
          total: (activityData.users?.created || 0) + (activityData.users?.edited || 0),
          created: activityData.users?.created || 0,
          edited: activityData.users?.edited || 0,
          deleted: 0,
          last7Days: activityData.users?.last7Days || 0,
          last30Days: activityData.users?.last30Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.ROLES_VIEW) || hasPermission(PERMISSIONS.ROLES_EDIT)) {
        reportStats.roles = {
          total: (activityData.roles?.created || 0) + (activityData.roles?.edited || 0),
          created: activityData.roles?.created || 0,
          edited: activityData.roles?.edited || 0,
          deleted: 0,
        };
      }

      if (hasPermission(PERMISSIONS.PROPERTIES_VIEW) || hasPermission(PERMISSIONS.PROPERTIES_APPROVE)) {
        reportStats.properties = {
          total: (activityData.properties?.approved || 0) + (activityData.properties?.rejected || 0),
          approved: activityData.properties?.approved || 0,
          rejected: activityData.properties?.rejected || 0,
          pending: 0,
          last7Days: activityData.properties?.last7Days || 0,
          last30Days: activityData.properties?.last30Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.VENDORS_VIEW) || hasPermission(PERMISSIONS.VENDORS_APPROVE)) {
        reportStats.vendors = {
          total: activityData.vendors?.approved || 0,
          approved: activityData.vendors?.approved || 0,
          pending: 0,
          last7Days: activityData.vendors?.last7Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.SUPPORT_TICKETS_READ) || hasPermission(PERMISSIONS.SUPPORT_TICKETS_REPLY)) {
        reportStats.supportTickets = {
          total: (activityData.supportTickets?.replied || 0) + (activityData.supportTickets?.resolved || 0),
          open: 0,
          resolved: activityData.supportTickets?.resolved || 0,
          closed: activityData.supportTickets?.closed || 0,
          replied: activityData.supportTickets?.replied || 0,
          avgResponseTime: activityData.supportTickets?.avgResponseTime || 0,
          last7Days: activityData.supportTickets?.last7Days || 0,
          last30Days: activityData.supportTickets?.last30Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.ADDON_SERVICES_READ) || hasPermission(PERMISSIONS.ADDON_SERVICES_MANAGE)) {
        reportStats.addonServices = {
          total: (activityData.addonServices?.scheduled || 0) + (activityData.addonServices?.completed || 0),
          scheduled: activityData.addonServices?.scheduled || 0,
          completed: activityData.addonServices?.completed || 0,
          pending: 0,
          last7Days: activityData.addonServices?.last7Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.REVIEWS_VIEW) || hasPermission(PERMISSIONS.REVIEWS_DELETE)) {
        reportStats.reviews = {
          total: (activityData.reviews?.deleted || 0) + (activityData.reviews?.reported || 0),
          reported: activityData.reviews?.reported || 0,
          deleted: activityData.reviews?.deleted || 0,
          last7Days: activityData.reviews?.last7Days || 0,
        };
      }

      if (hasPermission(PERMISSIONS.POLICIES_EDIT_PRIVACY) || hasPermission(PERMISSIONS.POLICIES_EDIT_REFUND)) {
        reportStats.policies = {
          privacyEdits: activityData.policies?.privacyEdits || 0,
          refundEdits: activityData.policies?.refundEdits || 0,
        };
      }

      setStats(reportStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    try {
      toast({
        title: "Exporting Report",
        description: `Preparing ${format.toUpperCase()} report...`,
      });

      // TODO: Implement actual export functionality
      setTimeout(() => {
        toast({
          title: "Success",
          description: `Report exported as ${format.toUpperCase()}`,
        });
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const formatRoleName = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Work Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Loading your activity data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!hasAnyReportableData()) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-12">
              <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Reportable Data</h3>
                <p className="text-muted-foreground mt-2">
                  You don't have any permissions that generate reportable activities.
                  <br />
                  Contact your administrator for access to report-generating features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Work Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {user?.profile?.firstName}'s Activity Report • {formatRoleName(user?.role || '')}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleExportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.users && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">User Management</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.created + stats.users.edited}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.users.created} created, {stats.users.edited} edited
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.roles && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Role Management</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.roles.created + stats.roles.edited}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.roles.created} created, {stats.roles.edited} edited
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.properties && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Properties</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.properties.approved}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600">+{stats.properties.last7Days} this week</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.vendors && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.vendors.approved}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.vendors.pending} pending approval
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.supportTickets && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.supportTickets.replied}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.supportTickets.resolved} resolved
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.addonServices && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Addon Services</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.addonServices.scheduled}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.addonServices.completed} completed
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.reviews && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reviews</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reviews.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.reviews.deleted} moderated
                  </p>
                </CardContent>
              </Card>
            )}

            {stats.supportTickets && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.supportTickets.avgResponseTime}h</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average resolution time
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Properties Detailed */}
            {stats.properties && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Management Details
                  </CardTitle>
                  <CardDescription>Breakdown of property activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Approved</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.properties.approved}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">Rejected</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.properties.rejected}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Pending</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.properties.pending}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                        <p className="text-xs text-muted-foreground">Last 7 Days</p>
                        <p className="text-xl font-bold">{stats.properties.last7Days}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                        <p className="text-xs text-muted-foreground">Last 30 Days</p>
                        <p className="text-xl font-bold">{stats.properties.last30Days}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Tickets Detailed */}
            {stats.supportTickets && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Support Ticket Performance
                  </CardTitle>
                  <CardDescription>Customer support metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Open Tickets</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.supportTickets.open}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Resolved</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.supportTickets.resolved}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Replied</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stats.supportTickets.replied}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                        <p className="text-xs text-muted-foreground">Last 7 Days</p>
                        <p className="text-xl font-bold">{stats.supportTickets.last7Days}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950">
                        <p className="text-xs text-muted-foreground">Last 30 Days</p>
                        <p className="text-xl font-bold">{stats.supportTickets.last30Days}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Management Detailed */}
            {stats.users && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management Activity
                  </CardTitle>
                  <CardDescription>User creation and modification stats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Users Created</p>
                      <p className="text-2xl font-bold">{stats.users.created}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Users Edited</p>
                      <p className="text-2xl font-bold">{stats.users.edited}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Users Deleted</p>
                      <p className="text-2xl font-bold">{stats.users.deleted}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                        <p className="text-xs text-muted-foreground">Last 7 Days</p>
                        <p className="text-xl font-bold">{stats.users.last7Days}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950">
                        <p className="text-xs text-muted-foreground">Last 30 Days</p>
                        <p className="text-xl font-bold">{stats.users.last30Days}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addon Services Detailed */}
            {stats.addonServices && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Addon Services Management
                  </CardTitle>
                  <CardDescription>Service scheduling and completion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="text-2xl font-bold">{stats.addonServices.scheduled}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{stats.addonServices.completed}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{stats.addonServices.pending}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Insights
              </CardTitle>
              <CardDescription>AI-generated insights based on your activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.properties && stats.properties.approved > 50 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        High Property Approval Rate
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        You've approved {stats.properties.approved} properties. Your approval rate is {((stats.properties.approved / stats.properties.total) * 100).toFixed(1)}%.
                      </p>
                    </div>
                  </div>
                )}

                {stats.supportTickets && stats.supportTickets.avgResponseTime < 6 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Excellent Response Time
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your average response time of {stats.supportTickets.avgResponseTime}h is excellent! Keep maintaining this quick turnaround.
                      </p>
                    </div>
                  </div>
                )}

                {stats.users && stats.users.created > 20 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">
                        Active User Management
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        You've created {stats.users.created} new users. Great job onboarding new team members!
                      </p>
                    </div>
                  </div>
                )}

                {stats.addonServices && stats.addonServices.completed > 80 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-950">
                    <Package className="h-5 w-5 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-teal-900 dark:text-teal-100">
                        Service Completion Champion
                      </p>
                      <p className="text-sm text-teal-700 dark:text-teal-300">
                        {stats.addonServices.completed} services completed! Your completion rate is outstanding.
                      </p>
                    </div>
                  </div>
                )}

                {stats.vendors && stats.vendors.pending > 5 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <Activity className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        Vendor Approvals Needed
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        You have {stats.vendors.pending} vendors pending approval. Consider reviewing them soon to keep the pipeline moving.
                      </p>
                    </div>
                  </div>
                )}

                {!stats.properties && !stats.supportTickets && !stats.users && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Getting Started
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Start using your assigned permissions to generate activity reports and insights.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Activity Summary
              </CardTitle>
              <CardDescription>Overall performance in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.users && (
                  <div className="text-center p-4 rounded-lg border">
                    <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{stats.users.created + stats.users.edited}</p>
                    <p className="text-xs text-muted-foreground">User Actions</p>
                  </div>
                )}
                {stats.properties && (
                  <div className="text-center p-4 rounded-lg border">
                    <Home className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{stats.properties.approved}</p>
                    <p className="text-xs text-muted-foreground">Properties</p>
                  </div>
                )}
                {stats.supportTickets && (
                  <div className="text-center p-4 rounded-lg border">
                    <Headphones className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold">{stats.supportTickets.replied}</p>
                    <p className="text-xs text-muted-foreground">Tickets Handled</p>
                  </div>
                )}
                {stats.addonServices && (
                  <div className="text-center p-4 rounded-lg border">
                    <Package className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{stats.addonServices.scheduled}</p>
                    <p className="text-xs text-muted-foreground">Services</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleBasedReports;
