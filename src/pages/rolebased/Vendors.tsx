import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, CheckCircle, Clock, XCircle, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://app.buildhomemartsquares.com/api";

interface VendorStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  underReview: number;
}

interface Vendor {
  _id: string;
  user: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  businessInfo: {
    companyName: string;
  };
  approval: {
    status: string;
    submittedAt: string;
  };
}

const RoleBasedVendors = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const permissions = user?.rolePermissions || [];
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<VendorStats>({ 
        total: 0, 
        pending: 0, 
        approved: 0, 
        rejected: 0,
        underReview: 0 
    });
    const [vendors, setVendors] = useState<Vendor[]>([]);

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        // If user doesn't have vendors.view permission, redirect to dashboard
        if (!hasPermission(PERMISSIONS.VENDORS_VIEW)) {
            navigate('/rolebased');
        } else {
            fetchVendorData();
        }
    }, [permissions]);

    const fetchVendorData = async () => {
        try {
            setLoading(true);
            const currentUser = await authService.getCurrentUser();
            const token = localStorage.getItem('token');
            
            // Fetch vendor stats
            const statsResponse = await fetch(`${API_BASE_URL}/admin/vendor-approval-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                // Backend returns overview object with totalApplications, pendingApplications, etc.
                const overview = statsData.data.overview;
                setStats({
                    total: overview.totalApplications || 0,
                    pending: overview.pendingApplications || 0,
                    approved: overview.approvedApplications || 0,
                    rejected: overview.rejectedApplications || 0,
                    underReview: overview.underReviewApplications || 0
                });
            }

            // Fetch vendor list
            const vendorsResponse = await fetch(`${API_BASE_URL}/admin/vendor-approvals?limit=50&status=all`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (vendorsResponse.ok) {
                const vendorsData = await vendorsResponse.json();
                console.log('Vendor response:', vendorsData);
                setVendors(vendorsData.data.vendors || []);
            } else {
                console.error('Failed to fetch vendors:', vendorsResponse.status, vendorsResponse.statusText);
            }
        } catch (error) {
            console.error('Failed to fetch vendor data:', error);
            toast({
                title: "Error",
                description: "Failed to load vendor data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            pending: { variant: "outline", label: "Pending" },
            under_review: { variant: "secondary", label: "Under Review" },
            approved: { variant: "default", label: "Approved" },
            rejected: { variant: "destructive", label: "Rejected" },
        };
        const config = variants[status] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (!hasPermission(PERMISSIONS.VENDORS_VIEW)) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2 text-lg">Loading vendor data...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Vendor Management</h1>
                <p className="text-muted-foreground">
                    Manage vendor applications and approvals
                </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Total vendor applications
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting review
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
                        <p className="text-xs text-muted-foreground">
                            Being reviewed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved Vendors</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                        <p className="text-xs text-muted-foreground">
                            Active vendors
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                        <p className="text-xs text-muted-foreground">
                            Declined applications
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Vendor List */}
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Applications</CardTitle>
                    <CardDescription>
                        View and manage vendor applications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {vendors.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No Vendor Applications</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                There are no vendor applications at the moment
                            </p>
                            <p className="text-xs text-muted-foreground mt-4">
                                Your permissions: {hasPermission(PERMISSIONS.VENDORS_APPROVE) ? 'View & Approve' : 'View Only'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-4 font-medium">Business Name</th>
                                        <th className="text-left p-4 font-medium">Contact Person</th>
                                        <th className="text-left p-4 font-medium">Email</th>
                                        <th className="text-left p-4 font-medium">Phone</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-left p-4 font-medium">Submitted</th>
                                        <th className="text-left p-4 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendors.map((vendor) => (
                                        <tr key={vendor._id} className="border-b hover:bg-muted/50">
                                            <td className="p-4">{vendor.businessInfo?.companyName || 'N/A'}</td>
                                            <td className="p-4">
                                                {vendor.user?.profile?.firstName} {vendor.user?.profile?.lastName}
                                            </td>
                                            <td className="p-4">{vendor.user?.email}</td>
                                            <td className="p-4">{vendor.user?.profile?.phone || 'N/A'}</td>
                                            <td className="p-4">{getStatusBadge(vendor.approval?.status)}</td>
                                            <td className="p-4">
                                                {new Date(vendor.approval?.submittedAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/rolebased/vendor-details?vendorId=${vendor._id}`)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedVendors;
