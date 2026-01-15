import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Users, UserCheck, UserX, Search } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";

interface User {
  _id: string;
  email: string;
  role: string;
  status: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  createdAt: string;
  lastLogin?: string;
}

const UsersDetails = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    thisMonthUsers: 0,
    activeUsers: 0,
    vendorUsers: 0,
    customerUsers: 0
  });

  const handleExportUsers = () => {
    try {
      if (users.length === 0) {
        toast({
          title: "No Data",
          description: "No user data available to export",
          variant: "destructive"
        });
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

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

      // Calculate comprehensive statistics
      const activeCount = users.filter(u => u.status === 'active').length;
      const pendingCount = users.filter(u => u.status === 'pending').length;
      const suspendedCount = users.filter(u => u.status === 'suspended').length;
      const inactiveCount = users.filter(u => u.status === 'inactive').length;

      // Users with recent activity (logged in within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentlyActiveUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin) > thirtyDaysAgo);
      const dormantUsers = users.filter(u => !u.lastLogin || new Date(u.lastLogin) <= thirtyDaysAgo);

      // Users registered this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekUsers = users.filter(u => new Date(u.createdAt) > oneWeekAgo);

      // Executive Summary
      const summaryData = [
        { 'Metric': 'Total Users', 'Value': stats.totalUsers, 'Details': 'All non-admin users in the system' },
        { 'Metric': 'New Users This Month', 'Value': stats.thisMonthUsers, 'Details': 'Registered in current month' },
        { 'Metric': 'New Users This Week', 'Value': thisWeekUsers.length, 'Details': 'Registered in last 7 days' },
        { 'Metric': 'Active Users', 'Value': stats.activeUsers, 'Details': 'Users with active status' },
        { 'Metric': 'Pending Verification', 'Value': pendingCount, 'Details': 'Awaiting email/phone verification' },
        { 'Metric': 'Suspended Users', 'Value': suspendedCount, 'Details': 'Temporarily suspended accounts' },
        { 'Metric': 'Inactive Users', 'Value': inactiveCount, 'Details': 'Deactivated accounts' },
        { 'Metric': 'Vendors (Agents)', 'Value': stats.vendorUsers, 'Details': 'Property vendor accounts' },
        { 'Metric': 'Customers', 'Value': stats.customerUsers, 'Details': 'Regular customer accounts' },
        { 'Metric': 'Recently Active (30 days)', 'Value': recentlyActiveUsers.length, 'Details': 'Logged in within last 30 days' },
        { 'Metric': 'Dormant Users', 'Value': dormantUsers.length, 'Details': 'No login in 30+ days' },
        { 'Metric': 'Vendor Percentage', 'Value': `${stats.totalUsers > 0 ? ((stats.vendorUsers / stats.totalUsers) * 100).toFixed(1) : 0}%`, 'Details': 'Vendors vs total users' },
        { 'Metric': 'Activity Rate', 'Value': `${users.length > 0 ? ((recentlyActiveUsers.length / users.length) * 100).toFixed(1) : 0}%`, 'Details': 'Recently active / Total' }
      ];

      // Role breakdown with detailed stats
      const roleBreakdown = [
        { 'Role': 'Vendor/Agent', 'Total Count': stats.vendorUsers, 'Active': users.filter(u => u.role === 'agent' && u.status === 'active').length, 'Inactive': users.filter(u => u.role === 'agent' && u.status !== 'active').length, 'Percentage': `${stats.totalUsers > 0 ? ((stats.vendorUsers / stats.totalUsers) * 100).toFixed(1) : 0}%` },
        { 'Role': 'Customer', 'Total Count': stats.customerUsers, 'Active': users.filter(u => u.role === 'customer' && u.status === 'active').length, 'Inactive': users.filter(u => u.role === 'customer' && u.status !== 'active').length, 'Percentage': `${stats.totalUsers > 0 ? ((stats.customerUsers / stats.totalUsers) * 100).toFixed(1) : 0}%` }
      ];

      // Status breakdown
      const statusBreakdown = [
        { 'Status': 'Active', 'Count': activeCount, 'Percentage': `${users.length > 0 ? ((activeCount / users.length) * 100).toFixed(1) : 0}%`, 'Description': 'Fully verified and active' },
        { 'Status': 'Pending', 'Count': pendingCount, 'Percentage': `${users.length > 0 ? ((pendingCount / users.length) * 100).toFixed(1) : 0}%`, 'Description': 'Awaiting verification' },
        { 'Status': 'Suspended', 'Count': suspendedCount, 'Percentage': `${users.length > 0 ? ((suspendedCount / users.length) * 100).toFixed(1) : 0}%`, 'Description': 'Temporarily disabled' },
        { 'Status': 'Inactive', 'Count': inactiveCount, 'Percentage': `${users.length > 0 ? ((inactiveCount / users.length) * 100).toFixed(1) : 0}%`, 'Description': 'Deactivated accounts' }
      ];

      // Monthly registration analysis (last 24 months)
      const monthlyRegistrations: Record<string, { vendors: number; customers: number; total: number }> = {};
      users.forEach(user => {
        if (user.createdAt) {
          const date = new Date(user.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyRegistrations[monthKey]) {
            monthlyRegistrations[monthKey] = { vendors: 0, customers: 0, total: 0 };
          }
          monthlyRegistrations[monthKey].total += 1;
          if (user.role === 'agent') monthlyRegistrations[monthKey].vendors += 1;
          if (user.role === 'customer') monthlyRegistrations[monthKey].customers += 1;
        }
      });

      const monthlyAnalysis = Object.entries(monthlyRegistrations)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 24)
        .map(([month, data]) => ({
          'Month': month,
          'Total Registrations': data.total,
          'New Vendors': data.vendors,
          'New Customers': data.customers,
          'Vendor %': `${data.total > 0 ? ((data.vendors / data.total) * 100).toFixed(1) : 0}%`
        }));

      // Detailed Vendor list with ALL fields
      const vendorDetails = users
        .filter(u => u.role === 'agent')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((user, index) => {
          const accountAgeDays = Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const lastLoginDays = user.lastLogin ? Math.ceil((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : null;

          return {
            '#': index + 1,
            'User ID': user._id,
            'First Name': user.profile.firstName || 'N/A',
            'Last Name': user.profile.lastName || 'N/A',
            'Full Name': `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'N/A',
            'Email': user.email,
            'Phone': user.profile.phone || 'N/A',
            'Role': 'Vendor/Agent',
            'Status': user.status.charAt(0).toUpperCase() + user.status.slice(1),
            'Registered On': formatDateValue(user.createdAt),
            'Account Age (Days)': accountAgeDays,
            'Last Login': formatDateTime(user.lastLogin || ''),
            'Days Since Login': lastLoginDays !== null ? lastLoginDays : 'Never',
            'Activity Status': lastLoginDays !== null && lastLoginDays <= 7 ? 'Active' : lastLoginDays !== null && lastLoginDays <= 30 ? 'Moderate' : 'Dormant'
          };
        });

      // Detailed Customer list with ALL fields
      const customerDetails = users
        .filter(u => u.role === 'customer')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((user, index) => {
          const accountAgeDays = Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const lastLoginDays = user.lastLogin ? Math.ceil((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : null;

          return {
            '#': index + 1,
            'User ID': user._id,
            'First Name': user.profile.firstName || 'N/A',
            'Last Name': user.profile.lastName || 'N/A',
            'Full Name': `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'N/A',
            'Email': user.email,
            'Phone': user.profile.phone || 'N/A',
            'Role': 'Customer',
            'Status': user.status.charAt(0).toUpperCase() + user.status.slice(1),
            'Registered On': formatDateValue(user.createdAt),
            'Account Age (Days)': accountAgeDays,
            'Last Login': formatDateTime(user.lastLogin || ''),
            'Days Since Login': lastLoginDays !== null ? lastLoginDays : 'Never',
            'Activity Status': lastLoginDays !== null && lastLoginDays <= 7 ? 'Active' : lastLoginDays !== null && lastLoginDays <= 30 ? 'Moderate' : 'Dormant'
          };
        });

      // All users with comprehensive details
      const allUserDetails = users
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((user, index) => {
          const accountAgeDays = Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const lastLoginDays = user.lastLogin ? Math.ceil((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : null;

          return {
            '#': index + 1,
            'User ID': user._id,
            'First Name': user.profile.firstName || 'N/A',
            'Last Name': user.profile.lastName || 'N/A',
            'Email': user.email,
            'Phone': user.profile.phone || 'N/A',
            'Role': user.role === 'agent' ? 'Vendor' : user.role.charAt(0).toUpperCase() + user.role.slice(1),
            'Status': user.status.charAt(0).toUpperCase() + user.status.slice(1),
            'Registered On': formatDateTime(user.createdAt),
            'Account Age (Days)': accountAgeDays,
            'Last Login': formatDateTime(user.lastLogin || ''),
            'Days Since Login': lastLoginDays !== null ? lastLoginDays : 'Never',
            'Activity Status': lastLoginDays !== null && lastLoginDays <= 7 ? 'Active' : lastLoginDays !== null && lastLoginDays <= 30 ? 'Moderate' : 'Dormant'
          };
        });

      // Recently registered users (last 30 days)
      const recentUsers = users
        .filter(u => new Date(u.createdAt) > thirtyDaysAgo)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((user, index) => ({
          '#': index + 1,
          'Full Name': `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'N/A',
          'Email': user.email,
          'Phone': user.profile.phone || 'N/A',
          'Role': user.role === 'agent' ? 'Vendor' : 'Customer',
          'Status': user.status.charAt(0).toUpperCase() + user.status.slice(1),
          'Registered On': formatDateTime(user.createdAt),
          'Has Logged In': user.lastLogin ? 'Yes' : 'No'
        }));

      // Dormant users (for re-engagement)
      const dormantUsersList = dormantUsers
        .sort((a, b) => {
          const aDate = a.lastLogin ? new Date(a.lastLogin).getTime() : new Date(a.createdAt).getTime();
          const bDate = b.lastLogin ? new Date(b.lastLogin).getTime() : new Date(b.createdAt).getTime();
          return aDate - bDate;
        })
        .map((user, index) => {
          const lastActivityDate = user.lastLogin || user.createdAt;
          const daysSinceActivity = Math.ceil((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24));

          return {
            '#': index + 1,
            'Full Name': `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'N/A',
            'Email': user.email,
            'Phone': user.profile.phone || 'N/A',
            'Role': user.role === 'agent' ? 'Vendor' : 'Customer',
            'Last Activity': formatDateValue(lastActivityDate),
            'Days Inactive': daysSinceActivity,
            'Re-engagement Priority': daysSinceActivity > 90 ? 'High' : daysSinceActivity > 60 ? 'Medium' : 'Low'
          };
        });

      const config = {
        filename: 'users_comprehensive_report',
        title: 'Comprehensive Users Analysis Report',
        metadata: {
          'Generated on': currentDate,
          'Report Type': 'Full User Analytics',
          'Total Users': stats.totalUsers.toString(),
          'Active Users': stats.activeUsers.toString(),
          'Total Vendors': stats.vendorUsers.toString(),
          'Total Customers': stats.customerUsers.toString(),
          'Report Generated By': 'Admin Dashboard'
        }
      };

      const sheets = [
        {
          name: 'Executive Summary',
          data: summaryData,
          columns: [{ wch: 30 }, { wch: 15 }, { wch: 40 }]
        },
        {
          name: 'Role Analysis',
          data: roleBreakdown,
          columns: [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
        },
        {
          name: 'Status Breakdown',
          data: statusBreakdown,
          columns: [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 30 }]
        },
        {
          name: 'Monthly Trends',
          data: monthlyAnalysis,
          columns: [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
        },
        {
          name: 'Vendors Detail',
          data: vendorDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }]
        },
        {
          name: 'Customers Detail',
          data: customerDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }]
        },
        {
          name: 'Recent Registrations',
          data: recentUsers,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 12 }]
        },
        {
          name: 'Dormant Users',
          data: dormantUsersList,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 18 }]
        },
        {
          name: 'All Users',
          data: allUserDetails,
          columns: [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }]
        }
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: "Export Successful",
        description: `Comprehensive users report with ${sheets.length} sheets has been downloaded`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export users report. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsersData = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users data');

      const data = await response.json();
      if (data.success) {
        // Exclude admin users
        const nonAdminUsers = data.data.users.filter((u: User) =>
          !['admin', 'superadmin', 'subadmin'].includes(u.role)
        );
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Filter to only include customers and vendors (agents)
        const customersAndVendors = nonAdminUsers.filter((u: User) =>
          u.role === 'customer' || u.role === 'agent'
        );

        const thisMonth = customersAndVendors.filter((u: User) =>
          new Date(u.createdAt) >= firstDayOfMonth
        ).length;

        setStats({
          totalUsers: customersAndVendors.length,
          thisMonthUsers: thisMonth,
          activeUsers: customersAndVendors.filter((u: User) => u.status === 'active').length,
          vendorUsers: nonAdminUsers.filter((u: User) => u.role === 'agent').length,
          customerUsers: nonAdminUsers.filter((u: User) => u.role === 'customer').length
        });
      }
    } catch (error) {
      console.error('Error fetching users data:', error);
      toast({
        title: "Error",
        description: "Failed to load users data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'vendor':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold">Users Details</h1>
          <p className="text-muted-foreground">Complete user list and statistics (excluding admins)</p>
        </div>
        <Button variant="outline" onClick={handleExportUsers}>
          <Download className="w-4 h-4 mr-2" />
          Export Users
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.thisMonthUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.vendorUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.customerUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user._id} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium">{user.profile.firstName} {user.profile.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.profile.phone && (
                        <p className="text-sm text-muted-foreground">{user.profile.phone}</p>
                      )}
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Joined</p>
                      <p className="text-sm">{formatDate(user.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.status === 'active' ? (
                        <>
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Inactive</span>
                        </>
                      )}
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

export default UsersDetails;
