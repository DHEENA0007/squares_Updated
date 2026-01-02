import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Users, Eye, TrendingUp, DollarSign, Activity,
  MousePointer, Globe, Clock, MessageSquare, Star,
  BarChart3, PieChart, LineChart, FileText, ArrowRight, User, Phone,
  MapPin, Monitor, Download, CalendarIcon, Filter, RefreshCw, ThumbsUp
} from 'lucide-react';
import analyticsService from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import ExportUtils from '@/utils/exportUtils';

import DetailedPropertyReport from '@/components/analytics/DetailedPropertyReport';

const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8884d8', '#82ca9d'];

const SuperAdminAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [propertyViews, setPropertyViews] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  // Custom date range states
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hasPermission = (permission: string) => {
    if (user?.role === 'superadmin') return true;
    return user?.rolePermissions?.includes(permission) || false;
  };

  // Export permission check
  const canExport = hasPermission(PERMISSIONS.SUPERADMIN_ANALYTICS_EXPORT) || hasPermission(PERMISSIONS.ANALYTICS_VIEW) || user?.role === 'superadmin';

  // Comprehensive Report Generation
  const generateComprehensiveReport = () => {
    setExporting(true);
    try {
      const currentDate = format(new Date(), 'MMMM dd, yyyy');
      const rangeDays = dateRange === 'custom' ?
        Math.ceil((customEndDate!.getTime() - customStartDate!.getTime()) / (1000 * 60 * 60 * 24)) :
        parseInt(dateRange);
      const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN')}`;

      // Executive Summary
      const summaryData = [
        { 'Metric': 'Report Period', 'Value': `Last ${rangeDays} days`, 'Details': `Generated on ${currentDate}` },
        { 'Metric': 'Total Users', 'Value': overview?.overview?.totalUsers || 0, 'Details': 'All registered users' },
        { 'Metric': 'Total Customers', 'Value': overview?.overview?.totalCustomers || 0, 'Details': 'Customer role users' },
        { 'Metric': 'New Registrations', 'Value': overview?.overview?.newRegistrations || 0, 'Details': 'Users registered in this period' },
        { 'Metric': 'Total Properties', 'Value': overview?.overview?.totalProperties || 0, 'Details': 'All listed properties' },
        { 'Metric': 'Total Views', 'Value': overview?.overview?.totalViews || 0, 'Details': 'Property page views' },
        { 'Metric': 'Unique Viewers', 'Value': overview?.overview?.uniqueViewers || 0, 'Details': 'Distinct visitors' },
        { 'Metric': 'Avg. View Duration', 'Value': `${overview?.overview?.avgViewDuration || 0}s`, 'Details': 'Average time on property pages' },
        { 'Metric': 'Total Revenue', 'Value': formatCurrency(overview?.overview?.totalRevenue || 0), 'Details': 'Revenue in this period' },
        { 'Metric': 'Guest Views', 'Value': overview?.overview?.guestViews || 0, 'Details': 'Views from unregistered users' },
        { 'Metric': 'Registered Views', 'Value': overview?.overview?.registeredViews || 0, 'Details': 'Views from registered users' },
        { 'Metric': 'Total Interactions', 'Value': overview?.overview?.totalInteractions || 0, 'Details': 'Phone + Message clicks' },
      ];

      // User Distribution by Role
      const usersByRole = (overview?.usersByRole || []).map((role: any) => ({
        'Role': role._id || 'Unknown',
        'Count': role.count || 0,
        'Percentage': `${overview?.overview?.totalUsers > 0 ? ((role.count / overview.overview.totalUsers) * 100).toFixed(1) : 0}%`
      }));

      // Conversion Metrics
      const conversionData = [
        { 'Metric': 'Total Views', 'Value': conversion?.totalViews || 0 },
        { 'Metric': 'Guest Views', 'Value': conversion?.guestViews || 0 },
        { 'Metric': 'Registered Views', 'Value': conversion?.registeredViews || 0 },
        { 'Metric': 'New Registrations', 'Value': conversion?.newRegistrations || 0 },
        { 'Metric': 'Conversion Rate', 'Value': `${conversion?.conversionRate || 0}%` },
      ];

      // Daily Registrations
      const registrationsByDate = (conversion?.registrationsByDate || []).map((day: any) => ({
        'Date': day._id,
        'New Registrations': day.count,
      }));

      // Property Views by Date
      const viewsByDate = (propertyViews?.viewsByDate || []).map((day: any) => ({
        'Date': day._id,
        'Views': day.count,
      }));

      // Top Viewed Properties
      const topProperties = (propertyViews?.viewsByProperty || []).slice(0, 30).map((prop: any, idx: number) => ({
        '#': idx + 1,
        'Property Title': prop.title || 'Unknown',
        'Total Views': prop.views || 0,
        'Views in Period': prop.periodViews || prop.views || 0,
      }));

      // Viewer Types
      const viewerTypes = (propertyViews?.viewerTypes || []).map((type: any) => ({
        'Viewer Type': type.name || type._id || 'Unknown',
        'Count': type.value || type.count || 0,
      }));

      // Interactions Summary
      const interactionsData = [
        { 'Interaction Type': 'Phone Clicks', 'Count': propertyViews?.interactions?.phoneClicks || 0 },
        { 'Interaction Type': 'Message Clicks', 'Count': propertyViews?.interactions?.messageClicks || 0 },
        { 'Interaction Type': 'Interest Clicks', 'Count': propertyViews?.interactions?.interestClicks || 0 },
        { 'Interaction Type': 'Total', 'Count': (propertyViews?.interactions?.phoneClicks || 0) + (propertyViews?.interactions?.messageClicks || 0) + (propertyViews?.interactions?.interestClicks || 0) },
      ];

      // Traffic Sources
      const trafficSources = (traffic?.trafficBySource || []).map((source: any, idx: number) => ({
        '#': idx + 1,
        'Source': source.source || 'Unknown',
        'Visits': source.count || 0,
        'Percentage': traffic?.trafficBySource?.length > 0 ?
          `${((source.count / traffic.trafficBySource.reduce((sum: number, s: any) => sum + s.count, 0)) * 100).toFixed(1)}%` : '0%'
      }));

      // Traffic by Device
      const trafficByDevice = (traffic?.trafficByDevice || []).map((device: any) => ({
        'Device': device.name || device._id || 'Unknown',
        'Count': device.value || device.count || 0,
      }));

      // Traffic by Browser
      const trafficByBrowser = (traffic?.trafficByBrowser || []).map((browser: any) => ({
        'Browser': browser._id || 'Unknown',
        'Count': browser.count || 0,
      }));

      // Traffic by Country
      const trafficByCountry = (traffic?.trafficByCountry || []).map((country: any) => ({
        'Country': country._id || 'Unknown',
        'Visits': country.count || 0,
      }));

      // Peak Hours
      const peakHours = (traffic?.peakHours || []).map((hour: any) => ({
        'Hour': `${hour._id || 0}:00`,
        'Visits': hour.count || 0,
      }));

      // Daily Active Users
      const activeUsers = (engagement?.activeUsers || []).map((day: any) => ({
        'Date': day._id,
        'Total Active': day.count || 0,
        'Customers': day.customers || 0,
        'Vendors/Agents': day.vendors || 0,
      }));

      // Active Users Summary
      const activeUsersSummary = [
        { 'Role': 'Customers', 'Count': engagement?.activeUsersSummary?.customers?.count || 0 },
        { 'Role': 'Vendors/Agents', 'Count': engagement?.activeUsersSummary?.vendors?.count || 0 },
        { 'Role': 'Total Active', 'Count': (engagement?.activeUsersSummary?.customers?.count || 0) + (engagement?.activeUsersSummary?.vendors?.count || 0) },
      ];

      // Message Activity
      const messageActivity = (engagement?.messageActivity || []).map((day: any) => ({
        'Date': day._id,
        'Messages Sent': day.count || 0,
      }));

      // Review Activity
      const reviewActivity = (engagement?.reviewActivity || []).map((day: any) => ({
        'Date': day._id,
        'Reviews': day.count || 0,
        'Avg. Rating': (day.avgRating || 0).toFixed(1),
      }));

      // Recent Activity
      const recentActivity = (overview?.overview?.recentActivity || []).map((activity: any) => ({
        'Type': activity.type || 'Unknown',
        'Count': activity.count || 0,
      }));

      const config = {
        filename: `analytics_comprehensive_report_${format(new Date(), 'yyyy-MM-dd')}`,
        title: 'Comprehensive Analytics Report',
        metadata: {
          'Generated on': currentDate,
          'Report Period': `Last ${rangeDays} days`,
          'Total Users': (overview?.overview?.totalUsers || 0).toString(),
          'Total Properties': (overview?.overview?.totalProperties || 0).toString(),
          'Total Views': (overview?.overview?.totalViews || 0).toString(),
          'Total Revenue': formatCurrency(overview?.overview?.totalRevenue || 0),
          'Generated By': user?.email || 'Admin'
        }
      };

      const sheets = [
        { name: 'Executive Summary', data: summaryData, columns: [{ wch: 25 }, { wch: 20 }, { wch: 40 }] },
        { name: 'Users by Role', data: usersByRole, columns: [{ wch: 15 }, { wch: 12 }, { wch: 12 }] },
        { name: 'Conversion Metrics', data: conversionData, columns: [{ wch: 20 }, { wch: 15 }] },
        { name: 'Daily Registrations', data: registrationsByDate, columns: [{ wch: 15 }, { wch: 15 }] },
        { name: 'Daily Views', data: viewsByDate, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Top Properties', data: topProperties, columns: [{ wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 15 }] },
        { name: 'Viewer Types', data: viewerTypes, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Interactions', data: interactionsData, columns: [{ wch: 18 }, { wch: 12 }] },
        { name: 'Traffic Sources', data: trafficSources, columns: [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 12 }] },
        { name: 'Devices', data: trafficByDevice, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Browsers', data: trafficByBrowser, columns: [{ wch: 20 }, { wch: 12 }] },
        { name: 'Countries', data: trafficByCountry, columns: [{ wch: 20 }, { wch: 12 }] },
        { name: 'Peak Hours', data: peakHours, columns: [{ wch: 10 }, { wch: 12 }] },
        { name: 'Daily Active Users', data: activeUsers, columns: [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }] },
        { name: 'Active Users Summary', data: activeUsersSummary, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Message Activity', data: messageActivity, columns: [{ wch: 15 }, { wch: 15 }] },
        { name: 'Review Activity', data: reviewActivity, columns: [{ wch: 15 }, { wch: 10 }, { wch: 12 }] },
        { name: 'Recent Activity', data: recentActivity, columns: [{ wch: 15 }, { wch: 12 }] },
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: 'Report Generated',
        description: `Comprehensive analytics report with ${sheets.length} sheets has been downloaded`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate analytics report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Export Overview Tab
  const exportOverviewReport = () => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN')}`;

    const overviewData = [
      { 'Metric': 'Total Users', 'Value': overview?.overview?.totalUsers || 0 },
      { 'Metric': 'Total Customers', 'Value': overview?.overview?.totalCustomers || 0 },
      { 'Metric': 'New Registrations', 'Value': overview?.overview?.newRegistrations || 0 },
      { 'Metric': 'Total Properties', 'Value': overview?.overview?.totalProperties || 0 },
      { 'Metric': 'Total Views', 'Value': overview?.overview?.totalViews || 0 },
      { 'Metric': 'Unique Viewers', 'Value': overview?.overview?.uniqueViewers || 0 },
      { 'Metric': 'Avg. View Duration', 'Value': `${overview?.overview?.avgViewDuration || 0}s` },
      { 'Metric': 'Total Revenue', 'Value': formatCurrency(overview?.overview?.totalRevenue || 0) },
      { 'Metric': 'Total Interactions', 'Value': overview?.overview?.totalInteractions || 0 },
    ];

    const usersByRole = (overview?.usersByRole || []).map((role: any) => ({
      'Role': role._id, 'Count': role.count
    }));

    ExportUtils.generateExcelReport(
      { filename: `overview_report_${currentDate}`, title: 'Overview Report', metadata: { 'Generated': currentDate } },
      [
        { name: 'Overview', data: overviewData, columns: [{ wch: 25 }, { wch: 20 }] },
        { name: 'Users by Role', data: usersByRole, columns: [{ wch: 15 }, { wch: 12 }] },
      ]
    );
    toast({ title: 'Overview Report Downloaded' });
  };

  // Export Property Views Tab
  const exportPropertyViewsReport = () => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const viewsByDate = (propertyViews?.viewsByDate || []).map((d: any) => ({ 'Date': d._id, 'Views': d.count }));
    const topProperties = (propertyViews?.viewsByProperty || []).map((p: any, i: number) => ({
      '#': i + 1, 'Title': p.title, 'Views': p.views
    }));
    const viewerTypes = (propertyViews?.viewerTypes || []).map((t: any) => ({
      'Type': t.name || t._id, 'Count': t.value || t.count
    }));
    const interactions = [
      { 'Type': 'Phone Clicks', 'Count': propertyViews?.interactions?.phoneClicks || 0 },
      { 'Type': 'Message Clicks', 'Count': propertyViews?.interactions?.messageClicks || 0 },
      { 'Type': 'Interest Clicks', 'Count': propertyViews?.interactions?.interestClicks || 0 },
    ];

    ExportUtils.generateExcelReport(
      { filename: `property_views_report_${currentDate}`, title: 'Property Views Report', metadata: { 'Generated': currentDate } },
      [
        { name: 'Daily Views', data: viewsByDate, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Top Properties', data: topProperties, columns: [{ wch: 5 }, { wch: 40 }, { wch: 12 }] },
        { name: 'Viewer Types', data: viewerTypes, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Interactions', data: interactions, columns: [{ wch: 18 }, { wch: 12 }] },
      ]
    );
    toast({ title: 'Property Views Report Downloaded' });
  };

  // Export Conversion Tab
  const exportConversionReport = () => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const conversionMetrics = [
      { 'Metric': 'Total Views', 'Value': conversion?.totalViews || 0 },
      { 'Metric': 'Guest Views', 'Value': conversion?.guestViews || 0 },
      { 'Metric': 'Registered Views', 'Value': conversion?.registeredViews || 0 },
      { 'Metric': 'New Registrations', 'Value': conversion?.newRegistrations || 0 },
      { 'Metric': 'Conversion Rate', 'Value': `${conversion?.conversionRate || 0}%` },
    ];
    const registrationsByDate = (conversion?.registrationsByDate || []).map((d: any) => ({
      'Date': d._id, 'Registrations': d.count
    }));

    ExportUtils.generateExcelReport(
      { filename: `conversion_report_${currentDate}`, title: 'Conversion Report', metadata: { 'Generated': currentDate } },
      [
        { name: 'Conversion Metrics', data: conversionMetrics, columns: [{ wch: 20 }, { wch: 15 }] },
        { name: 'Daily Registrations', data: registrationsByDate, columns: [{ wch: 15 }, { wch: 15 }] },
      ]
    );
    toast({ title: 'Conversion Report Downloaded' });
  };

  // Export Traffic Tab
  const exportTrafficReport = () => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const sources = (traffic?.trafficBySource || []).map((s: any, i: number) => ({
      '#': i + 1, 'Source': s.source, 'Visits': s.count
    }));
    const devices = (traffic?.trafficByDevice || []).map((d: any) => ({
      'Device': d.name || d._id, 'Count': d.value || d.count
    }));
    const browsers = (traffic?.trafficByBrowser || []).map((b: any) => ({
      'Browser': b._id, 'Count': b.count
    }));
    const countries = (traffic?.trafficByCountry || []).map((c: any) => ({
      'Country': c._id, 'Visits': c.count
    }));
    const peakHours = (traffic?.peakHours || []).map((h: any) => ({
      'Hour': `${h._id}:00`, 'Visits': h.count
    }));

    ExportUtils.generateExcelReport(
      { filename: `traffic_report_${currentDate}`, title: 'Traffic Report', metadata: { 'Generated': currentDate } },
      [
        { name: 'Traffic Sources', data: sources, columns: [{ wch: 5 }, { wch: 35 }, { wch: 12 }] },
        { name: 'Devices', data: devices, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Browsers', data: browsers, columns: [{ wch: 20 }, { wch: 12 }] },
        { name: 'Countries', data: countries, columns: [{ wch: 20 }, { wch: 12 }] },
        { name: 'Peak Hours', data: peakHours, columns: [{ wch: 10 }, { wch: 12 }] },
      ]
    );
    toast({ title: 'Traffic Report Downloaded' });
  };

  // Export Engagement Tab
  const exportEngagementReport = () => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const activeUsers = (engagement?.activeUsers || []).map((d: any) => ({
      'Date': d._id, 'Total': d.count, 'Customers': d.customers || 0, 'Agents': d.vendors || 0
    }));
    const messages = (engagement?.messageActivity || []).map((d: any) => ({
      'Date': d._id, 'Messages': d.count
    }));
    const reviews = (engagement?.reviewActivity || []).map((d: any) => ({
      'Date': d._id, 'Reviews': d.count, 'Avg Rating': (d.avgRating || 0).toFixed(1)
    }));

    ExportUtils.generateExcelReport(
      { filename: `engagement_report_${currentDate}`, title: 'Engagement Report', metadata: { 'Generated': currentDate } },
      [
        { name: 'Daily Active Users', data: activeUsers, columns: [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }] },
        { name: 'Message Activity', data: messages, columns: [{ wch: 15 }, { wch: 12 }] },
        { name: 'Review Activity', data: reviews, columns: [{ wch: 15 }, { wch: 10 }, { wch: 12 }] },
      ]
    );
    toast({ title: 'Engagement Report Downloaded' });
  };

  useEffect(() => {
    const canViewAnalytics = hasPermission(PERMISSIONS.SUPERADMIN_ANALYTICS_VIEW) || hasPermission(PERMISSIONS.ANALYTICS_VIEW);
    if (!canViewAnalytics) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to view analytics.",
        variant: 'destructive',
      });
      navigate('/rolebased');
      return;
    }
    fetchAllAnalytics();
  }, [dateRange]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      // Use the consolidated V3 admin analytics endpoint - single API call for all data
      const response = await analyticsService.getConsolidatedAdminAnalytics(dateRange);

      if (response.success && response.data) {
        setOverview({
          overview: response.data.overview,
          usersByRole: response.data.overview.usersByRole
        });
        setPropertyViews(response.data.propertyViews);
        setConversion(response.data.conversion);
        setTraffic(response.data.traffic);
        setEngagement(response.data.engagement);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const canViewAnalytics = hasPermission(PERMISSIONS.SUPERADMIN_ANALYTICS_VIEW) || hasPermission(PERMISSIONS.ANALYTICS_VIEW);

  if (!canViewAnalytics) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, change, color, subtext }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change >= 0 ? '+' : ''}{change}%
            </span> from previous period
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Reports snapshot and detailed insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={(val) => {
              setDateRange(val);
              setShowCustomRange(val === 'custom');
            }}>
              <SelectTrigger className="w-[160px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range Pickers */}
            {showCustomRange && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'MMM dd') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'MMM dd') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchAllAnalytics()}
                >
                  Apply
                </Button>
              </div>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchAllAnalytics()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Export Report Button */}
            {canExport && (
              <Button
                onClick={generateComprehensiveReport}
                disabled={exporting || loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Generating...' : 'Export Report'}
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Quick Filters:</span>
          </div>
          {['1', '7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={dateRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setDateRange(days);
                setShowCustomRange(false);
              }}
              className="h-7 text-xs"
            >
              {days === '1' ? 'Today' : `${days}D`}
            </Button>
          ))}
        </div>
      </div>

      {/* Detailed Revenue Summary Section */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-5 w-5" />
              Revenue Summary
            </CardTitle>
            <CardDescription>Complete financial overview for the selected period</CardDescription>
          </div>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentDate = format(new Date(), 'yyyy-MM-dd');
                const formatCurrency = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;
                const revenueData = [
                  { 'Metric': 'Total Revenue', 'Value': formatCurrency(overview?.overview?.totalRevenue || 0) },
                  { 'Metric': 'Subscription Revenue', 'Value': formatCurrency(overview?.overview?.subscriptionRevenue || 0) },
                  { 'Metric': 'Addon Revenue', 'Value': formatCurrency(overview?.overview?.addonRevenue || 0) },
                  { 'Metric': 'Active Subscriptions', 'Value': overview?.overview?.activeSubscriptions || 0 },
                  { 'Metric': 'Revenue Period', 'Value': `Last ${dateRange} days` },
                ];
                ExportUtils.generateExcelReport(
                  { filename: `revenue_report_${currentDate}`, title: 'Revenue Report', metadata: { 'Generated': currentDate } },
                  [{ name: 'Revenue Summary', data: revenueData, columns: [{ wch: 25 }, { wch: 20 }] }]
                );
                toast({ title: 'Revenue Report Downloaded' });
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Revenue
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">
                ₹{((overview?.overview?.totalRevenue || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-medium">Subscriptions</p>
              <p className="text-xl font-bold text-blue-600">
                ₹{((overview?.overview?.subscriptionRevenue || 0)).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">{overview?.overview?.activeSubscriptions || 0} active</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-medium">Addons</p>
              <p className="text-xl font-bold text-purple-600">
                ₹{((overview?.overview?.addonRevenue || 0)).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">Addon services</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={overview?.overview?.totalUsers || 0}
          icon={Users}
          color="text-blue-500"
          subtext="Active accounts"
        />
        <StatCard
          title="Total Views"
          value={overview?.overview?.totalViews || 0}
          icon={Eye}
          color="text-green-500"
          subtext={`${overview?.overview?.uniqueViewers || 0} unique viewers`}
        />
        <StatCard
          title="Conversions"
          value={overview?.overview?.totalRegistrations || 0}
          icon={TrendingUp}
          color="text-orange-500"
          subtext="New registrations"
        />
        <StatCard
          title="Revenue"
          value={`₹${((overview?.overview?.totalRevenue || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="text-emerald-500"
          subtext="Total earnings"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="snapshot" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="snapshot" className="space-y-4">
          {canExport && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportOverviewReport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Snapshot
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversion Funnel - Prominent */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  User Acquisition Funnel
                </CardTitle>
                <CardDescription>Guest visits turning into registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pt-4 pb-8">
                  <div className="flex items-center justify-between text-center relative z-10">
                    <div className="flex flex-col items-center bg-background p-2 rounded-lg border shadow-sm w-1/4">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Guest Visits</span>
                      <span className="text-2xl font-bold text-blue-600 my-2">{conversion?.guestViews || 0}</span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 h-1 bg-muted mx-2 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center bg-background p-2 rounded-lg border shadow-sm w-1/4">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Registrations</span>
                      <span className="text-2xl font-bold text-green-600 my-2">{conversion?.newRegistrations || 0}</span>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 h-1 bg-muted mx-2 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center bg-background p-2 rounded-lg border shadow-sm w-1/4">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Conversion Rate</span>
                      <span className="text-2xl font-bold text-purple-600 my-2">{conversion?.conversionRate || 0}%</span>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={conversion?.registrationsByDate || []}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34A853" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#34A853" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#34A853" fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Users by Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={overview?.usersByRole || []}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {(overview?.usersByRole || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional View Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Eye className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Total Views</p>
                  <p className="text-xl font-bold">{overview?.overview?.totalViews || 0}</p>
                  <p className="text-xs text-muted-foreground">{overview?.overview?.uniqueViewers || 0} unique viewers</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Registered vs Guest</p>
                  <p className="text-xl font-bold">{overview?.overview?.registeredViews || 0} / {overview?.overview?.guestViews || 0}</p>
                  <p className="text-xs text-muted-foreground">Registered / Guest</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center">
                  <MousePointer className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Total Interactions</p>
                  <p className="text-xl font-bold">{overview?.overview?.totalInteractions || 0}</p>
                  <p className="text-xs text-muted-foreground">Clicks & Shares</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center">
                  <BarChart3 className="h-6 w-6 mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Properties</p>
                  <p className="text-xl font-bold">{overview?.overview?.totalProperties || 0}</p>
                  <p className="text-xs text-muted-foreground">Total listings</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="text-center">
                  <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  <p className="text-xl font-bold">{conversion?.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Guest to user</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="space-y-4">
          {canExport && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportTrafficReport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Acquisition
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>Where your users are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(traffic?.trafficBySource || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No traffic data yet</p>
                      <p className="text-xs mt-1">Traffic will be tracked as users visit pages</p>
                    </div>
                  ) : (
                    (traffic?.trafficBySource || []).map((source: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-sm font-medium truncate">
                            {source._id || 'Direct'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${(source.count / (traffic?.trafficBySource[0]?.count || 1)) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }}
                            />
                          </div>
                          <div className="text-right min-w-[60px]">
                            <span className="text-sm font-bold">{source.count}</span>
                            {source.uniqueVisitors && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({source.uniqueVisitors} unique)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Device Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={traffic?.trafficByDevice || []}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(traffic?.trafficByDevice || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Peak Hours
                </CardTitle>
                <CardDescription>When users are most active (24h format)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBar data={traffic?.peakHours || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="_id"
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                      tickFormatter={(value) => `${value}:00`}
                    />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                    />
                    <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </RechartsBar>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Traffic by Country */}
            {traffic?.trafficByCountry && traffic.trafficByCountry.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Traffic by Country
                  </CardTitle>
                  <CardDescription>Geographic distribution of visitors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {traffic.trafficByCountry.map((country: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{country._id || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${(country.count / (traffic.trafficByCountry[0]?.count || 1)) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{country.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Traffic by Browser */}
            {traffic?.trafficByBrowser && traffic.trafficByBrowser.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Traffic by Browser
                  </CardTitle>
                  <CardDescription>Which browsers your visitors use</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={traffic.trafficByBrowser}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {traffic.trafficByBrowser.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {canExport && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportPropertyViewsReport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Engagement
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Property Views Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={propertyViews?.viewsByDate || []}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4285F4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="views" stroke="#4285F4" fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Top Viewed Properties
                  </CardTitle>
                  <CardDescription>Most popular listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(propertyViews?.viewsByProperty || []).slice(0, 5).map((prop: any, idx: number) => (
                      <div
                        key={prop.propertyId}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                        onClick={() => setSelectedProperty(prop.propertyId)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{prop.propertyTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {prop.uniqueViewers} unique viewers
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold">{prop.totalViews}</p>
                          <p className="text-xs text-muted-foreground">views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="h-5 w-5 text-primary" />
                    Interaction Types
                  </CardTitle>
                  <CardDescription>How users engage with properties</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded text-blue-600 dark:text-blue-300">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span>Phone Clicks</span>
                      </div>
                      <span className="font-bold text-lg">{propertyViews?.interactions?.phoneClicks || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded text-green-600 dark:text-green-300">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span>Message Clicks</span>
                      </div>
                      <span className="font-bold text-lg">{propertyViews?.interactions?.messageClicks || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded text-purple-600 dark:text-purple-300">
                          <ThumbsUp className="h-4 w-4" />
                        </div>
                        <span>Interest Clicks</span>
                      </div>
                      <span className="font-bold text-lg">{propertyViews?.interactions?.interestClicks || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          {canExport && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportEngagementReport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Retention
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily Active Users Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Daily Active Users
                </CardTitle>
                <CardDescription>Users who logged in by role (customers vs agents/vendors)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsLine data={engagement?.activeUsers || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]?.payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-bold text-sm mb-2">{label}</p>
                              <div className="space-y-1 text-sm">
                                <p className="text-blue-600">Customers: {data?.customers || 0}</p>
                                <p className="text-green-600">Agents/Vendors: {data?.vendors || 0}</p>
                                <p className="font-semibold">Total: {data?.count || 0}</p>
                              </div>
                              {data?.topUsers && data.topUsers.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">Active users:</p>
                                  <ul className="text-xs space-y-0.5">
                                    {data.topUsers.map((name: string, idx: number) => (
                                      <li key={idx}>{name}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="customers"
                      name="Customers"
                      stroke="#4285F4"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#4285F4' }}
                      activeDot={{ r: 6, fill: '#4285F4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendors"
                      name="Agents/Vendors"
                      stroke="#34A853"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#34A853' }}
                      activeDot={{ r: 6, fill: '#34A853' }}
                    />
                  </RechartsLine>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Active Users Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Active Users Summary
                </CardTitle>
                <CardDescription>Breakdown by role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customers */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Customers</span>
                    <span className="text-lg font-bold text-blue-600">{engagement?.activeUsersSummary?.customers?.count || 0}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(engagement?.activeUsersSummary?.customers?.users || []).slice(0, 5).map((user: any, idx: number) => (
                      <div key={idx} className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {user.name || user.email}
                      </div>
                    ))}
                    {(engagement?.activeUsersSummary?.customers?.users?.length || 0) > 5 && (
                      <p className="text-xs text-muted-foreground">+{(engagement?.activeUsersSummary?.customers?.users?.length || 0) - 5} more</p>
                    )}
                  </div>
                </div>

                {/* Vendors/Agents */}
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Agents/Vendors</span>
                    <span className="text-lg font-bold text-green-600">{engagement?.activeUsersSummary?.vendors?.count || 0}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(engagement?.activeUsersSummary?.vendors?.users || []).slice(0, 5).map((user: any, idx: number) => (
                      <div key={idx} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        {user.name || user.email}
                      </div>
                    ))}
                    {(engagement?.activeUsersSummary?.vendors?.users?.length || 0) > 5 && (
                      <p className="text-xs text-muted-foreground">+{(engagement?.activeUsersSummary?.vendors?.users?.length || 0) - 5} more</p>
                    )}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Active Users</span>
                    <span className="text-xl font-bold text-primary">
                      {(engagement?.activeUsersSummary?.customers?.count || 0) + (engagement?.activeUsersSummary?.vendors?.count || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <DetailedPropertyReport
            dateRange={dateRange}
            propertyId={selectedProperty}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminAnalytics;
