import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Users, Building, TrendingUp, TrendingDown, BarChart3, Activity, FileText, Timer } from "lucide-react";
import subAdminService from "@/services/subAdminService";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate, formatLocalDateTime, getRelativeTime } from "@/utils/dateTime";

interface DashboardStats {
  totalPropertiesApproved: number;
  availablePropertiesApproved: number;
  pendingProperties: number;
  rejectedPropertiesApproved: number;
  totalSupport: number;
  openSupport: number;
  closedSupport: number;
  analytics?: {
    propertiesApprovedLast7Days: number;
    propertiesApprovedLast30Days: number;
    supportTicketsResolvedLast7Days: number;
    supportTicketsResolvedLast30Days: number;
    propertiesApprovedThisMonth: number;
    propertiesApprovedLastMonth: number;
    supportTicketsThisMonth: number;
    supportTicketsLastMonth: number;
    propertyApprovalTrend: number;
    supportTicketTrend: number;
    avgResponseTimeHours: number;
  };
  recentActivity?: {
    approvals: Array<{
      _id: string;
      title: string;
      type: string;
      approvedAt: string;
      owner: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
    rejections: Array<{
      _id: string;
      title: string;
      type: string;
      rejectionReason: string;
      updatedAt: string;
    }>;
    tickets: Array<{
      _id: string;
      subject: string;
      status: string;
      priority: string;
      updatedAt: string;
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    }>;
  };
}

const SubAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const data = await subAdminService.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates for property changes
  useRealtimeEvent('property_created', () => {
    fetchDashboardStats();
  });

  useRealtimeEvent('property_approved', () => {
    fetchDashboardStats();
  });

  useRealtimeEvent('property_rejected', () => {
    fetchDashboardStats();
  });

  // Real-time updates for support tickets
  useRealtimeEvent('support_ticket_created', () => {
    fetchDashboardStats();
  });

  useRealtimeEvent('support_ticket_updated', () => {
    fetchDashboardStats();
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sub Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Content moderation and support management overview
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your content moderation performance and activity overview
        </p>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/subadmin/property-reviews" className="block">
          <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Property Approvals</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPropertiesApproved || 0}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="text-xs text-green-600">
                  {stats?.availablePropertiesApproved || 0} Available
                </p>
                <p className="text-xs text-red-600">
                  {stats?.rejectedPropertiesApproved || 0} Rejected
                </p>
              </div>
              {stats?.analytics && (
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.analytics.propertiesApprovedLast7Days} in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/subadmin/property-reviews" className="block">
          <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingProperties || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Properties awaiting review
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/subadmin/support-tickets" className="block">
          <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Support Tickets</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSupport || 0}</div>
              <div className="flex gap-2 mt-2">
                <p className="text-xs text-orange-600">
                  {stats?.openSupport || 0} Open
                </p>
                <p className="text-xs text-green-600">
                  {stats?.closedSupport || 0} Closed
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/subadmin/reports" className="block">
          <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.analytics?.avgResponseTimeHours || 0}h
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Average ticket resolution time
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Section */}
      {stats?.analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Property Approval Analytics
              </CardTitle>
              <CardDescription>Your property review performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold">{stats.analytics.propertiesApprovedThisMonth}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${stats.analytics.propertyApprovalTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.analytics.propertyApprovalTrend >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {Math.abs(stats.analytics.propertyApprovalTrend)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">vs last month</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <p className="text-xs text-muted-foreground">Last 7 Days</p>
                  <p className="text-xl font-bold">{stats.analytics.propertiesApprovedLast7Days}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <p className="text-xs text-muted-foreground">Last 30 Days</p>
                  <p className="text-xl font-bold">{stats.analytics.propertiesApprovedLast30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Support Ticket Analytics
              </CardTitle>
              <CardDescription>Your customer support performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold">{stats.analytics.supportTicketsThisMonth}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${stats.analytics.supportTicketTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.analytics.supportTicketTrend >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {Math.abs(stats.analytics.supportTicketTrend)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">vs last month</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-xs text-muted-foreground">Closed (7d)</p>
                  <p className="text-xl font-bold">{stats.analytics.supportTicketsResolvedLast7Days}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <p className="text-xs text-muted-foreground">Closed (30d)</p>
                  <p className="text-xl font-bold">{stats.analytics.supportTicketsResolvedLast30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for content moderation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/subadmin/property-reviews"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Review Properties</div>
              <div className="text-sm text-muted-foreground">
                {stats?.pendingProperties} properties awaiting approval
              </div>
            </Link>
            <Link
              to="/subadmin/support-tickets"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Handle Support</div>
              <div className="text-sm text-muted-foreground">
                {stats?.openSupport} open tickets
              </div>
            </Link>
            <Link
              to="/subadmin/reports"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                View Reports
              </div>
              <div className="text-sm text-muted-foreground">
                Generate detailed analytics reports
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest moderation activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity?.approvals && stats.recentActivity.approvals.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.approvals.slice(0, 3).map((approval) => (
                  <div key={approval._id} className="flex items-start gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{approval.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Approved • {formatLocalDate(approval.approvedAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {approval.type}
                    </Badge>
                  </div>
                ))}

                {stats.recentActivity.tickets && stats.recentActivity.tickets.slice(0, 2).map((ticket) => (
                  <div key={ticket._id} className="flex items-start gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.user?.profile?.firstName} {ticket.user?.profile?.lastName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      {stats?.analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Performance Summary
            </CardTitle>
            <CardDescription>Overview of your work as a content moderator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Properties Reviewed</span>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{stats.totalPropertiesApproved}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((stats.availablePropertiesApproved / stats.totalPropertiesApproved) * 100).toFixed(1)}% approval rate
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Support Tickets Handled</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{stats.totalSupport}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((stats.closedSupport / stats.totalSupport) * 100 || 0).toFixed(1)}% closed
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Activity</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">
                  {stats.analytics.propertiesApprovedThisMonth + stats.analytics.supportTicketsThisMonth}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total actions this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubAdminDashboard;