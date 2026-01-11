import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle, Users, Star, MessageSquare } from "lucide-react";

interface DashboardStats {
  pendingPropertyReviews: number;
  approvedProperties: number;
  rejectedProperties: number;
  pendingSupportTickets: number;
  pendingPromotions: number;
  totalVendors: number;
  newContentReports: number;
}

const SubAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingPropertyReviews: 0,
    approvedProperties: 0,
    rejectedProperties: 0,
    pendingSupportTickets: 0,
    pendingPromotions: 0,
    totalVendors: 0,
    newContentReports: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/admin/subadmin/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: "Pending Reviews",
      value: stats.pendingPropertyReviews,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      description: "Properties awaiting review",
      link: "/admin/property-approvals"
    },
    {
      title: "Approved Properties",
      value: stats.approvedProperties,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      description: "Recently approved",
      link: "/admin/properties"
    },
    {
      title: "Support Tickets",
      value: stats.pendingSupportTickets,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Pending tickets",
      link: "/admin/support-tickets"
    },
    {
      title: "Content Reports",
      value: stats.newContentReports,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      description: "New moderation reports",
      link: "/admin/content-moderation"
    },
    {
      title: "Pending Promotions",
      value: stats.pendingPromotions,
      icon: Star,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      description: "Awaiting approval",
      link: "/admin/promotion-approval"
    },
    {
      title: "Active Vendors",
      value: stats.totalVendors,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      description: "Total vendors tracked",
      link: "/admin/vendor-approvals"
    }
  ];

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
          <h1 className="text-3xl font-bold text-foreground">Sub Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage property reviews, content moderation, and customer support
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Sub Admin Panel
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link}>
              <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/property-approvals">
              <div className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold">Review Properties</h3>
                <p className="text-sm text-muted-foreground">Review and verify new property listings</p>
              </div>
            </Link>
            <Link to="/admin/support-tickets">
              <div className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <MessageSquare className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Handle Support</h3>
                <p className="text-sm text-muted-foreground">Respond to customer support tickets</p>
              </div>
            </Link>
            <Link to="/admin/content-moderation">
              <div className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
                <h3 className="font-semibold">Moderate Content</h3>
                <p className="text-sm text-muted-foreground">Review reported content and images</p>
              </div>
            </Link>
            <Link to="/admin/promotion-approval">
              <div className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <Star className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold">Approve Promotions</h3>
                <p className="text-sm text-muted-foreground">Review featured property requests</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Property #1234 approved</span>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Support ticket #5678 closed</span>
              </div>
              <span className="text-xs text-muted-foreground">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm">Content report #9012 reviewed</span>
              </div>
              <span className="text-xs text-muted-foreground">6 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubAdminDashboard;
