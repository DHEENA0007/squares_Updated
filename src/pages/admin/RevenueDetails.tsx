import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, TrendingUp, Calendar, CheckCircle, XCircle, Clock, IndianRupee } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";

interface Subscription {
  _id: string;
  user: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  plan: {
    name: string;
    price: number;
  };
  amount: number;
  status: string;
  lastPaymentDate: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const RevenueDetails = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonthRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    averageRevenue: 0
  });

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/subscriptions/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch revenue data');

      const data = await response.json();
      if (data.success) {
        const subs = data.data.subscriptions;
        setSubscriptions(subs);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalRev = subs
          .filter((s: Subscription) => ['active', 'expired'].includes(s.status) && s.lastPaymentDate)
          .reduce((sum: number, s: Subscription) => sum + s.amount, 0);

        const thisMonthRev = subs
          .filter((s: Subscription) => 
            ['active', 'expired'].includes(s.status) && 
            s.lastPaymentDate && 
            new Date(s.lastPaymentDate) >= firstDayOfMonth
          )
          .reduce((sum: number, s: Subscription) => sum + s.amount, 0);

        setStats({
          totalRevenue: totalRev,
          thisMonthRevenue: thisMonthRev,
          activeSubscriptions: subs.filter((s: Subscription) => s.status === 'active').length,
          expiredSubscriptions: subs.filter((s: Subscription) => s.status === 'expired').length,
          averageRevenue: subs.length > 0 ? totalRev / subs.length : 0
        });
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Revenue Details</h1>
          <p className="text-muted-foreground">Complete revenue breakdown and subscription history</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.thisMonthRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expiredSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(Math.round(stats.averageRevenue))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No subscriptions found</p>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub._id} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium">{sub.user?.profile?.firstName} {sub.user?.profile?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{sub.user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium">{sub.plan?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(sub.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="text-sm">{sub.lastPaymentDate ? formatDate(sub.lastPaymentDate) : 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(sub.status)}
                      <span className="text-sm capitalize">{sub.status}</span>
                    </div>
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

export default RevenueDetails;
