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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";

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
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        // If user doesn't have vendors.view permission, redirect to dashboard
        if (!hasPermission(PERMISSIONS.VENDORS_VIEW)) {
            navigate('/rolebased');
        } else {
            fetchVendorData();
        }
    }, [permissions, debouncedSearchTerm, statusFilter]);

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
            const queryParams = new URLSearchParams({
                limit: '50',
                status: statusFilter,
                search: debouncedSearchTerm
            });

            const vendorsResponse = await fetch(`${API_BASE_URL}/admin/vendor-approvals?${queryParams}`, {
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
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search vendors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Contact Person</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendors.map((vendor) => (
                                        <TableRow key={vendor._id}>
                                            <TableCell className="font-medium">{vendor.businessInfo?.companyName || 'N/A'}</TableCell>
                                            <TableCell>
                                                {vendor.user?.profile?.firstName} {vendor.user?.profile?.lastName}
                                            </TableCell>
                                            <TableCell>{vendor.user?.email}</TableCell>
                                            <TableCell>{vendor.user?.profile?.phone || 'N/A'}</TableCell>
                                            <TableCell>{getStatusBadge(vendor.approval?.status)}</TableCell>
                                            <TableCell>
                                                {new Date(vendor.approval?.submittedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/rolebased/vendor-details?vendorId=${vendor._id}`)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedVendors;
