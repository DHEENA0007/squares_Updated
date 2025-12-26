import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Eye, TrendingUp, DollarSign, Activity,
  MousePointer, Globe, Clock, MessageSquare, Star,
  BarChart3, PieChart, LineChart, FileText, ArrowRight, User, Phone,
  MapPin, Monitor
} from 'lucide-react';
import analyticsService from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area } from 'recharts';

import DetailedPropertyReport from '@/components/analytics/DetailedPropertyReport';

const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8884d8', '#82ca9d'];

const Analytics = () => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Reports snapshot and detailed insights
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
          <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshot" className="space-y-4">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
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
                  <Clock className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Avg. Duration</p>
                  <p className="text-xl font-bold">{overview?.overview?.avgViewDuration || 0}s</p>
                  <p className="text-xs text-muted-foreground">Per view</p>
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
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
          <DetailedPropertyReport dateRange={dateRange} propertyId={selectedProperty} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
