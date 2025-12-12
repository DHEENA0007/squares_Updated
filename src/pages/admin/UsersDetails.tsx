import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Users, UserCheck, UserX, Search } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";

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
        <Button variant="outline">
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
