import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity, Loader2, IndianRupee } from "lucide-react";
import { dashboardService, DashboardStats, RecentActivity } from "@/services/dashboardService";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await dashboardService.getDashboardData();
        if (response.success) {
          setStats(response.data.stats);
          setActivities(response.data.recentActivities);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );
  }

  // Calculate Today's Revenue
  const today = new Date().toISOString().split('T')[0];
  const todayData = stats.dailyRevenue?.find(item => item.date === today);
  const todayAmount = todayData ? todayData.amount : 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayData = stats.dailyRevenue?.find(item => item.date === yesterdayStr);
  const yesterdayAmount = yesterdayData ? yesterdayData.amount : 0;

  const revenueChange = yesterdayAmount === 0
    ? (todayAmount > 0 ? "+100%" : "0%")
    : `${((todayAmount - yesterdayAmount) / yesterdayAmount * 100).toFixed(1)}%`;

  const statsCards = [
    {
      title: "Total Revenue",
      value: dashboardService.formatRevenue(stats.totalRevenue),
      change: `+${dashboardService.formatRevenue(stats.revenueThisMonth)} this month`,
      icon: IndianRupee,
      color: "text-emerald-500 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      onClick: () => navigate('/admin/revenue-details'),
    },
    {
      title: "Today's Revenue",
      value: dashboardService.formatRevenue(todayAmount),
      change: `${revenueChange.startsWith('-') ? '' : '+'}${revenueChange} from yesterday`,
      icon: IndianRupee,
      color: "text-indigo-500 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      onClick: () => navigate('/admin/revenue-details'),
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      change: `+${stats.newUsersThisMonth} this month`,
      icon: Users,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      onClick: () => navigate('/admin/users-details'),
    },
    {
      title: "Total Properties",
      value: stats.totalProperties.toLocaleString(),
      change: `+${stats.newPropertiesThisMonth} this month`,
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => navigate('/admin/properties-details'),
    },
    {
      title: "Engagement Rate",
      value: `${stats.engagementRate}%`,
      change: "Favorites per property",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate('/admin/engagement-details'),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's an overview of your metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`hover:shadow-lg transition-all ${stat.onClick ? 'cursor-pointer hover:scale-105' : ''}`}
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>



      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest platform activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent activities</p>
            ) : (
              activities.map((activity) => (
                <div key={activity._id} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full ${activity.type === 'user_registered' ? 'bg-blue-500' :
                    activity.type === 'property_listed' ? 'bg-green-500' :
                      activity.type === 'property_sold' ? 'bg-emerald-500' :
                        activity.type === 'property_rented' ? 'bg-purple-500' :
                          activity.type === 'subscription_purchased' ? 'bg-yellow-500' :
                            'bg-primary'
                    }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {dashboardService.formatActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dashboardService.formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
