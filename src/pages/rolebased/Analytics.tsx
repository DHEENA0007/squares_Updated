import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Eye, TrendingUp, DollarSign, Activity, 
  MousePointer, Globe, Clock, MessageSquare, Star,
  BarChart3, PieChart, LineChart
} from 'lucide-react';
import analyticsService from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import PropertyViewDetails from '@/components/analytics/PropertyViewDetails';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const RoleBasedAnalytics = () => {
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

  const hasPermission = (permission: string) => {
    if (user?.role === 'superadmin') return true;
    return user?.rolePermissions?.includes(permission) || false;
  };

  useEffect(() => {
    if (!hasPermission(PERMISSIONS.ANALYTICS_VIEW)) {
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
      const [overviewData, viewsData, conversionData, trafficData, engagementData] = await Promise.all([
        analyticsService.getOverview(dateRange),
        analyticsService.getPropertyViews(dateRange),
        analyticsService.getUserConversion(dateRange),
        analyticsService.getTrafficAnalytics(dateRange),
        analyticsService.getEngagementAnalytics(dateRange)
      ]);

      setOverview(overviewData.data);
      setPropertyViews(viewsData.data);
      setConversion(conversionData.data);
      setTraffic(trafficData.data);
      setEngagement(engagementData.data);
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

  if (!hasPermission(PERMISSIONS.ANALYTICS_VIEW)) {
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

  const StatCard = ({ title, value, icon: Icon, change, color }: any) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights and metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={overview?.overview?.totalUsers || 0}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="Total Properties"
          value={overview?.overview?.totalProperties || 0}
          icon={Eye}
          color="text-green-600"
        />
        <StatCard
          title="Total Views"
          value={overview?.overview?.totalViews || 0}
          icon={Activity}
          color="text-purple-600"
        />
        <StatCard
          title="New Registrations"
          value={overview?.overview?.totalRegistrations || 0}
          icon={TrendingUp}
          color="text-orange-600"
        />
        <StatCard
          title="Revenue"
          value={`$${(overview?.overview?.totalRevenue || 0).toFixed(2)}`}
          icon={DollarSign}
          color="text-emerald-600"
        />
      </div>

      {/* Main Analytics Tabs - Keeping the rest of the component */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Analytics Dashboard - Full Implementation</p>
            <p className="text-sm text-muted-foreground mt-2">
              Comprehensive analytics for property views, user behavior, traffic sources, and engagement metrics
            </p>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Property Views Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLine data={propertyViews?.viewsByDate || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                  </RechartsLine>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Top Viewed Properties
                </CardTitle>
                <CardDescription>Click on a property to see detailed visitor information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(propertyViews?.viewsByProperty || []).slice(0, 10).map((prop: any, idx: number) => (
                    <div 
                      key={prop.propertyId} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => setSelectedProperty(prop.propertyId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">{prop.propertyTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {prop.uniqueViewers} unique viewers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{prop.totalViews}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedProperty && (
              <PropertyViewDetails 
                propertyId={selectedProperty} 
                dateRange={dateRange}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">User Analytics</p>
            <p className="text-sm text-muted-foreground mt-2">
              Monitor user registrations, conversions, and engagement patterns
            </p>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <div className="text-center py-12">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Traffic Analytics</p>
            <p className="text-sm text-muted-foreground mt-2">
              Analyze traffic sources, devices, locations, and peak usage hours
            </p>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Engagement Analytics</p>
            <p className="text-sm text-muted-foreground mt-2">
              Track active users, messages, reviews, and top contributors
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleBasedAnalytics;

