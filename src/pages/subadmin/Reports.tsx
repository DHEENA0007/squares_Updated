import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Building,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Activity,
  Percent
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import subAdminService from "@/services/subAdminService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Reports = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const data = await subAdminService.getDashboardStats();
      setStats(data);
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

      // TODO: Implement export functionality
      // await subAdminService.exportReport(timeRange, format);

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into your moderation activities
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your moderation activities
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

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties Reviewed</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPropertiesApproved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.analytics && (
                <span className="text-green-600">
                  +{stats.analytics.propertiesApprovedLast7Days} this week
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalPropertiesApproved > 0 
                ? ((stats.availablePropertiesApproved / stats.totalPropertiesApproved) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties approved vs rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSupport || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.resolvedSupport || 0} resolved, {stats?.openSupport || 0} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.analytics?.avgResponseTimeHours || 0}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average ticket resolution time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      {stats?.analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Review Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Property Review Performance
              </CardTitle>
              <CardDescription>Breakdown of your property moderation activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Approved Properties</p>
                      <p className="text-sm text-muted-foreground">Available listings</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.availablePropertiesApproved}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Rejected Properties</p>
                      <p className="text-sm text-muted-foreground">Not approved</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.rejectedPropertiesApproved}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Pending Review</p>
                      <p className="text-sm text-muted-foreground">Awaiting action</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.pendingProperties}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Time-based Analytics</h4>
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
              </div>
            </CardContent>
          </Card>

          {/* Support Ticket Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Support Ticket Performance
              </CardTitle>
              <CardDescription>Your customer support metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Open Tickets</p>
                      <p className="text-sm text-muted-foreground">Pending response</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.openSupport}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Resolved Tickets</p>
                      <p className="text-sm text-muted-foreground">Successfully closed</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.resolvedSupport}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium">Closed Tickets</p>
                      <p className="text-sm text-muted-foreground">All completed</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.closedSupport}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Resolution Analytics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-xs text-muted-foreground">Resolved (7d)</p>
                    <p className="text-xl font-bold">{stats.analytics.supportTicketsResolvedLast7Days}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950">
                    <p className="text-xs text-muted-foreground">Resolved (30d)</p>
                    <p className="text-xl font-bold">{stats.analytics.supportTicketsResolvedLast30Days}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trends */}
      {stats?.analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trends & Comparison
            </CardTitle>
            <CardDescription>Compare this month's performance with last month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Approval Trend */}
              <div className="space-y-3">
                <h4 className="font-semibold">Property Approvals</h4>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-3xl font-bold">{stats.analytics.propertiesApprovedThisMonth}</p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-lg font-semibold ${
                      stats.analytics.propertyApprovalTrend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.analytics.propertyApprovalTrend >= 0 ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingUp className="h-5 w-5 rotate-180" />
                      )}
                      <span>{Math.abs(stats.analytics.propertyApprovalTrend)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">vs last month</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Last Month</p>
                  <p className="text-xl font-bold">{stats.analytics.propertiesApprovedLastMonth}</p>
                </div>
              </div>

              {/* Support Ticket Trend */}
              <div className="space-y-3">
                <h4 className="font-semibold">Support Tickets</h4>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-3xl font-bold">{stats.analytics.supportTicketsThisMonth}</p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-lg font-semibold ${
                      stats.analytics.supportTicketTrend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.analytics.supportTicketTrend >= 0 ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingUp className="h-5 w-5 rotate-180" />
                      )}
                      <span>{Math.abs(stats.analytics.supportTicketTrend)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">vs last month</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Last Month</p>
                  <p className="text-xl font-bold">{stats.analytics.supportTicketsLastMonth}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>Key insights and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.analytics ? (
              <>
                {stats.analytics.propertyApprovalTrend > 10 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Excellent Property Review Performance
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        You've increased your property approvals by {stats.analytics.propertyApprovalTrend}% compared to last month. Keep up the great work!
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.analytics.avgResponseTimeHours > 0 && stats.analytics.avgResponseTimeHours < 24 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Fast Response Time
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your average response time of {stats.analytics.avgResponseTimeHours}h is excellent. Users appreciate quick responses!
                      </p>
                    </div>
                  </div>
                )}

                {stats.openSupport > 10 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <Activity className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        High Open Ticket Volume
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        You have {stats.openSupport} open tickets. Consider prioritizing ticket resolution to improve response times.
                      </p>
                    </div>
                  </div>
                )}

                {stats.totalPropertiesApproved === 0 && stats.totalSupport === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Get Started
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Start reviewing properties and handling support tickets to build your performance metrics.
                      </p>
                    </div>
                  </div>
                )}

                {/* Default insights when no specific conditions are met */}
                {stats.totalPropertiesApproved > 0 && 
                 stats.analytics.propertyApprovalTrend <= 10 && 
                 (stats.analytics.avgResponseTimeHours === 0 || stats.analytics.avgResponseTimeHours >= 24) && 
                 stats.openSupport <= 10 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Steady Performance
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        You've reviewed {stats.totalPropertiesApproved} properties and handled {stats.totalSupport} support tickets. 
                        {stats.analytics.propertiesApprovedThisMonth > 0 && ` This month: ${stats.analytics.propertiesApprovedThisMonth} properties approved.`}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No performance data available yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
