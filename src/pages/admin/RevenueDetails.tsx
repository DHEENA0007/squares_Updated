import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, TrendingUp, Calendar, CheckCircle, XCircle, Clock, IndianRupee } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";

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
    todayRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    averageRevenue: 0
  });

  const handleExportReport = () => {
    try {
      if (subscriptions.length === 0) {
        toast({
          title: "No Data",
          description: "No revenue data available to export",
          variant: "destructive"
        });
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formatCurrencyValue = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
      const formatDateValue = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };
      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Calculate comprehensive stats
      const activeCount = subscriptions.filter(s => s.status === 'active').length;
      const expiredCount = subscriptions.filter(s => s.status === 'expired').length;
      const cancelledCount = subscriptions.filter(s => s.status === 'cancelled').length;
      const pendingCount = subscriptions.filter(s => s.status === 'pending').length;

      const activeRevenue = subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
      const expiredRevenue = subscriptions.filter(s => s.status === 'expired').reduce((sum, s) => sum + s.amount, 0);
      const totalPaidRevenue = activeRevenue + expiredRevenue;

      const avgSubscriptionValue = subscriptions.length > 0 ? stats.totalRevenue / subscriptions.filter(s => ['active', 'expired'].includes(s.status)).length : 0;
      const highValueSubs = subscriptions.filter(s => s.amount > avgSubscriptionValue);
      const lowValueSubs = subscriptions.filter(s => s.amount <= avgSubscriptionValue && s.amount > 0);

      // Executive Summary
      const summaryData = [
        { 'Metric': 'Total Revenue (All Time)', 'Value': formatCurrencyValue(stats.totalRevenue), 'Details': 'Cumulative revenue from all paid subscriptions' },
        { 'Metric': 'This Month Revenue', 'Value': formatCurrencyValue(stats.thisMonthRevenue), 'Details': 'Revenue collected this calendar month' },
        { 'Metric': 'Today Revenue', 'Value': formatCurrencyValue(stats.todayRevenue), 'Details': 'Revenue collected today' },
        { 'Metric': 'Total Subscriptions', 'Value': subscriptions.length, 'Details': 'All subscriptions in the system' },
        { 'Metric': 'Active Subscriptions', 'Value': stats.activeSubscriptions, 'Details': 'Currently active subscriptions' },
        { 'Metric': 'Expired Subscriptions', 'Value': stats.expiredSubscriptions, 'Details': 'Subscriptions that have ended' },
        { 'Metric': 'Cancelled Subscriptions', 'Value': cancelledCount, 'Details': 'User/admin cancelled' },
        { 'Metric': 'Pending Subscriptions', 'Value': pendingCount, 'Details': 'Awaiting payment confirmation' },
        { 'Metric': 'Average Revenue per Subscription', 'Value': formatCurrencyValue(Math.round(stats.averageRevenue)), 'Details': 'Mean revenue per paid subscription' },
        { 'Metric': 'Median Subscription Value', 'Value': formatCurrencyValue(subscriptions.length > 0 ? subscriptions.map(s => s.amount).sort((a, b) => a - b)[Math.floor(subscriptions.length / 2)] : 0), 'Details': 'Middle value of all subscriptions' },
        { 'Metric': 'High Value Subscriptions', 'Value': highValueSubs.length, 'Details': 'Above average subscription value' },
        { 'Metric': 'Conversion Rate', 'Value': `${subscriptions.length > 0 ? ((activeCount / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Details': 'Active/Total subscriptions' },
        { 'Metric': 'Churn Rate', 'Value': `${subscriptions.length > 0 ? (((cancelledCount + expiredCount) / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Details': 'Cancelled + Expired / Total' }
      ];

      // Status breakdown with detailed revenue
      const statusBreakdown = [
        { 'Status': 'Active', 'Count': activeCount, 'Revenue': formatCurrencyValue(activeRevenue), 'Avg. Revenue': formatCurrencyValue(activeCount > 0 ? Math.round(activeRevenue / activeCount) : 0), 'Percentage': `${subscriptions.length > 0 ? ((activeCount / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Revenue Share': `${totalPaidRevenue > 0 ? ((activeRevenue / totalPaidRevenue) * 100).toFixed(1) : 0}%` },
        { 'Status': 'Expired', 'Count': expiredCount, 'Revenue': formatCurrencyValue(expiredRevenue), 'Avg. Revenue': formatCurrencyValue(expiredCount > 0 ? Math.round(expiredRevenue / expiredCount) : 0), 'Percentage': `${subscriptions.length > 0 ? ((expiredCount / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Revenue Share': `${totalPaidRevenue > 0 ? ((expiredRevenue / totalPaidRevenue) * 100).toFixed(1) : 0}%` },
        { 'Status': 'Cancelled', 'Count': cancelledCount, 'Revenue': 'N/A', 'Avg. Revenue': 'N/A', 'Percentage': `${subscriptions.length > 0 ? ((cancelledCount / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Revenue Share': 'N/A' },
        { 'Status': 'Pending', 'Count': pendingCount, 'Revenue': 'N/A', 'Avg. Revenue': 'N/A', 'Percentage': `${subscriptions.length > 0 ? ((pendingCount / subscriptions.length) * 100).toFixed(1) : 0}%`, 'Revenue Share': 'N/A' }
      ];

      // Plan breakdown with comprehensive metrics
      const planRevenue: Record<string, { count: number; revenue: number; active: number; expired: number; avgAmount: number; planPrice: number }> = {};
      subscriptions.forEach(sub => {
        const planName = sub.plan?.name || 'Unknown';
        if (!planRevenue[planName]) {
          planRevenue[planName] = { count: 0, revenue: 0, active: 0, expired: 0, avgAmount: 0, planPrice: sub.plan?.price || 0 };
        }
        planRevenue[planName].count += 1;
        if (sub.status === 'active') planRevenue[planName].active += 1;
        if (sub.status === 'expired') planRevenue[planName].expired += 1;
        if (['active', 'expired'].includes(sub.status)) {
          planRevenue[planName].revenue += sub.amount;
        }
      });

      const planBreakdown = Object.entries(planRevenue)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([plan, data]) => ({
          'Plan Name': plan,
          'Plan Price': formatCurrencyValue(data.planPrice),
          'Total Subscribers': data.count,
          'Active': data.active,
          'Expired': data.expired,
          'Total Revenue': formatCurrencyValue(data.revenue),
          'Avg. Revenue/Subscriber': formatCurrencyValue(data.count > 0 ? Math.round(data.revenue / data.count) : 0),
          'Revenue Share': `${stats.totalRevenue > 0 ? ((data.revenue / stats.totalRevenue) * 100).toFixed(1) : 0}%`,
          'Retention Rate': `${data.count > 0 ? ((data.active / data.count) * 100).toFixed(1) : 0}%`
        }));

      // Monthly revenue analysis (last 24 months)
      const monthlyRevenue: Record<string, { revenue: number; count: number; newSubs: number }> = {};
      subscriptions.forEach(sub => {
        if (sub.lastPaymentDate && ['active', 'expired'].includes(sub.status)) {
          const date = new Date(sub.lastPaymentDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = { revenue: 0, count: 0, newSubs: 0 };
          }
          monthlyRevenue[monthKey].revenue += sub.amount;
          monthlyRevenue[monthKey].count += 1;
        }
        // Track new subscriptions by creation month
        if (sub.createdAt) {
          const date = new Date(sub.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = { revenue: 0, count: 0, newSubs: 0 };
          }
          monthlyRevenue[monthKey].newSubs += 1;
        }
      });

      const monthlyAnalysis = Object.entries(monthlyRevenue)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 24)
        .map(([month, data]) => ({
          'Month': month,
          'Revenue': formatCurrencyValue(data.revenue),
          'Payments Received': data.count,
          'New Subscriptions': data.newSubs,
          'Avg. Payment Value': formatCurrencyValue(data.count > 0 ? Math.round(data.revenue / data.count) : 0)
        }));

      // Detailed subscription list with ALL fields
      const subscriptionDetails = subscriptions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((sub, index) => {
          const startDate = new Date(sub.startDate);
          const endDate = new Date(sub.endDate);
          const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const isExpiringSoon = sub.status === 'active' && endDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

          return {
            '#': index + 1,
            'Subscription ID': sub._id,
            'Customer Name': `${sub.user?.profile?.firstName || ''} ${sub.user?.profile?.lastName || ''}`.trim() || 'N/A',
            'Email': sub.user?.email || 'N/A',
            'User ID': sub.user?._id || 'N/A',
            'Plan': sub.plan?.name || 'Unknown',
            'Plan Base Price': formatCurrencyValue(sub.plan?.price || 0),
            'Amount Paid': formatCurrencyValue(sub.amount),
            'Discount Applied': sub.plan?.price && sub.amount < sub.plan.price ? formatCurrencyValue(sub.plan.price - sub.amount) : 'None',
            'Status': sub.status.charAt(0).toUpperCase() + sub.status.slice(1),
            'Start Date': formatDateValue(sub.startDate),
            'End Date': formatDateValue(sub.endDate),
            'Duration (Days)': durationDays,
            'Expiring Soon': isExpiringSoon ? 'Yes' : 'No',
            'Last Payment Date': formatDateValue(sub.lastPaymentDate),
            'Created At': formatDateTime(sub.createdAt),
            'Payment Status': sub.lastPaymentDate ? 'Paid' : 'Pending'
          };
        });

      // Active subscriptions (for quick reference)
      const activeSubs = subscriptions
        .filter(s => s.status === 'active')
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .map((sub, index) => {
          const daysRemaining = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            '#': index + 1,
            'Customer': `${sub.user?.profile?.firstName || ''} ${sub.user?.profile?.lastName || ''}`.trim() || 'N/A',
            'Email': sub.user?.email || 'N/A',
            'Plan': sub.plan?.name || 'Unknown',
            'Amount': formatCurrencyValue(sub.amount),
            'Start Date': formatDateValue(sub.startDate),
            'End Date': formatDateValue(sub.endDate),
            'Days Remaining': daysRemaining,
            'Urgency': daysRemaining <= 7 ? 'Expiring Soon' : daysRemaining <= 30 ? 'Renew Soon' : 'Good'
          };
        });

      // Expired/Cancelled (for win-back campaigns)
      const churned = subscriptions
        .filter(s => ['expired', 'cancelled'].includes(s.status))
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
        .map((sub, index) => ({
          '#': index + 1,
          'Customer': `${sub.user?.profile?.firstName || ''} ${sub.user?.profile?.lastName || ''}`.trim() || 'N/A',
          'Email': sub.user?.email || 'N/A',
          'Plan': sub.plan?.name || 'Unknown',
          'Last Amount': formatCurrencyValue(sub.amount),
          'Status': sub.status.charAt(0).toUpperCase() + sub.status.slice(1),
          'End Date': formatDateValue(sub.endDate),
          'Days Since Churn': Math.ceil((Date.now() - new Date(sub.endDate).getTime()) / (1000 * 60 * 60 * 24)),
          'Win-Back Priority': sub.amount > avgSubscriptionValue ? 'High' : 'Medium'
        }));

      const config = {
        filename: 'revenue_comprehensive_report',
        title: 'Comprehensive Revenue Analysis Report',
        metadata: {
          'Generated on': currentDate,
          'Report Type': 'Full Revenue & Subscription Analysis',
          'Total Revenue': formatCurrencyValue(stats.totalRevenue),
          'Active Subscriptions': stats.activeSubscriptions.toString(),
          'Total Subscriptions': subscriptions.length.toString(),
          'Report Generated By': 'Admin Dashboard'
        }
      };

      const sheets = [
        {
          name: 'Executive Summary',
          data: summaryData,
          columns: [{ wch: 35 }, { wch: 25 }, { wch: 45 }]
        },
        {
          name: 'Status Breakdown',
          data: statusBreakdown,
          columns: [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }]
        },
        {
          name: 'Plan Performance',
          data: planBreakdown,
          columns: [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'Monthly Trends',
          data: monthlyAnalysis,
          columns: [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
        },
        {
          name: 'Active Subscriptions',
          data: activeSubs,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'Churned Customers',
          data: churned,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        },
        {
          name: 'All Subscriptions',
          data: subscriptionDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 12 }]
        }
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: "Export Successful",
        description: `Comprehensive revenue report with ${sheets.length} sheets has been downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export revenue report. Please try again.",
        variant: "destructive"
      });
    }
  };

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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

        const todayRev = subs
          .filter((s: Subscription) =>
            ['active', 'expired'].includes(s.status) &&
            s.lastPaymentDate &&
            new Date(s.lastPaymentDate) >= today
          )
          .reduce((sum: number, s: Subscription) => sum + s.amount, 0);

        // Robust check for active/expired based on dates
        const activeCount = subs.filter((s: Subscription) => {
          if (s.status !== 'active') return false;
          if (!s.endDate) return true; // Assume active if no end date
          return new Date(s.endDate) > now;
        }).length;

        const expiredCount = subs.filter((s: Subscription) => {
          if (s.status === 'expired') return true;
          if (s.status === 'active' && s.endDate && new Date(s.endDate) <= now) return true;
          return false;
        }).length;

        const paidSubsCount = subs.filter((s: Subscription) => ['active', 'expired'].includes(s.status) && s.lastPaymentDate).length;

        setStats({
          totalRevenue: totalRev,
          thisMonthRevenue: thisMonthRev,
          todayRevenue: todayRev,
          activeSubscriptions: activeCount,
          expiredSubscriptions: expiredCount,
          averageRevenue: paidSubsCount > 0 ? totalRev / paidSubsCount : 0
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
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.todayRevenue)}</div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Average Revenue
              <div className="group relative">
                <Clock className="w-3 h-3 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50">
                  Total Revenue / Total Paid Subscriptions
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(Math.round(stats.averageRevenue))}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.totalRevenue)} / {subscriptions.filter(s => ['active', 'expired'].includes(s.status) && s.lastPaymentDate).length} subscriptions
            </p>
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
