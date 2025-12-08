import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users, Shield, Home, ShoppingBag, Activity,
    FileText, Settings, BarChart3, CheckCircle,
    AlertCircle, TrendingUp, Star, Eye
} from "lucide-react";
import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { roleService } from "@/services/roleService";
import { reviewsService } from "@/services/reviewsService";

interface DashboardStats {
    totalUsers?: number;
    totalRoles?: number;
    totalProperties?: number;
    totalVendors?: number;
    pendingApprovals?: number;
    activeReviews?: number;
}

const RoleBasedDashboard = () => {
    const { user } = useAuth();
    const permissions = user?.rolePermissions || [];
    const [stats, setStats] = useState<DashboardStats>({});
    const [loading, setLoading] = useState(true);

    const hasPermission = (permission: string) => permissions.includes(permission);

    // Check if user has any permission in a category
    const hasAnyUserPermission = () =>
        hasPermission(PERMISSIONS.USERS_VIEW) ||
        hasPermission(PERMISSIONS.USERS_CREATE) ||
        hasPermission(PERMISSIONS.USERS_EDIT) ||
        hasPermission(PERMISSIONS.USERS_DELETE);

    const hasAnyRolePermission = () =>
        hasPermission(PERMISSIONS.ROLES_VIEW) ||
        hasPermission(PERMISSIONS.ROLES_CREATE) ||
        hasPermission(PERMISSIONS.ROLES_EDIT) ||
        hasPermission(PERMISSIONS.ROLES_DELETE);

    const hasAnyPropertyPermission = () =>
        hasPermission(PERMISSIONS.PROPERTIES_VIEW) ||
        hasPermission(PERMISSIONS.PROPERTIES_CREATE) ||
        hasPermission(PERMISSIONS.PROPERTIES_EDIT) ||
        hasPermission(PERMISSIONS.PROPERTIES_DELETE) ||
        hasPermission(PERMISSIONS.PROPERTIES_APPROVE);

    const hasAnyVendorPermission = () =>
        hasPermission(PERMISSIONS.VENDORS_VIEW) ||
        hasPermission(PERMISSIONS.VENDORS_APPROVE) ||
        hasPermission(PERMISSIONS.VENDORS_MANAGE);

    const hasAnyReviewPermission = () =>
        hasPermission(PERMISSIONS.REVIEWS_VIEW) ||
        hasPermission(PERMISSIONS.REVIEWS_REPORT) ||
        hasPermission(PERMISSIONS.REVIEWS_DELETE);

    const hasAnySystemPermission = () =>
        hasPermission(PERMISSIONS.SETTINGS_MANAGE) ||
        hasPermission(PERMISSIONS.ANALYTICS_VIEW);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsData: DashboardStats = {};

                // Fetch user count if has permission
                if (hasPermission(PERMISSIONS.USERS_VIEW)) {
                    try {
                        const usersResponse = await userService.getUsers({ limit: 1, page: 1 });
                        statsData.totalUsers = usersResponse.data.pagination.totalUsers;
                    } catch (error) {
                        console.error("Failed to fetch users count:", error);
                    }
                }

                // Fetch roles count if has permission
                if (hasPermission(PERMISSIONS.ROLES_VIEW)) {
                    try {
                        const rolesResponse = await roleService.getRoles({ limit: 1, page: 1 });
                        statsData.totalRoles = rolesResponse.data.pagination.totalRoles;
                    } catch (error) {
                        console.error("Failed to fetch roles count:", error);
                    }
                }

                // You can add more API calls here for properties, vendors, etc.
                // For now, using placeholder data
                if (hasPermission(PERMISSIONS.PROPERTIES_VIEW)) {
                    statsData.totalProperties = 0; // TODO: Implement property count API
                }

                if (hasPermission(PERMISSIONS.VENDORS_VIEW)) {
                    statsData.totalVendors = 0; // TODO: Implement vendor count API
                }

                if (hasPermission(PERMISSIONS.VENDORS_APPROVE) || hasPermission(PERMISSIONS.PROPERTIES_APPROVE)) {
                    statsData.pendingApprovals = 0; // TODO: Implement pending approvals API
                }

                if (hasPermission(PERMISSIONS.REVIEWS_VIEW)) {
                    try {
                        const reviewStatsResponse = await reviewsService.getAdminReviewStats();
                        statsData.activeReviews = reviewStatsResponse.total || 0;
                    } catch (error) {
                        console.error("Failed to fetch review stats:", error);
                        statsData.activeReviews = 0;
                    }
                }

                setStats(statsData);
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [permissions]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.profile?.firstName || 'User'} • {user?.role || 'User'}
                </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {hasPermission(PERMISSIONS.USERS_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (stats.totalUsers || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Registered users</p>
                        </CardContent>
                    </Card>
                )}

                {hasPermission(PERMISSIONS.ROLES_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (stats.totalRoles || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Active roles</p>
                        </CardContent>
                    </Card>
                )}

                {hasPermission(PERMISSIONS.PROPERTIES_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Properties</CardTitle>
                            <Home className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (stats.totalProperties || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Listed properties</p>
                        </CardContent>
                    </Card>
                )}

                {hasPermission(PERMISSIONS.VENDORS_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (stats.totalVendors || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Active vendors</p>
                        </CardContent>
                    </Card>
                )}

                {(hasPermission(PERMISSIONS.VENDORS_APPROVE) || hasPermission(PERMISSIONS.PROPERTIES_APPROVE)) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-500">
                                {loading ? "..." : (stats.pendingApprovals || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                        </CardContent>
                    </Card>
                )}

                {hasPermission(PERMISSIONS.REVIEWS_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
                            <Star className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : (stats.activeReviews || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total reviews</p>
                        </CardContent>
                    </Card>
                )}

                {hasPermission(PERMISSIONS.ANALYTICS_VIEW) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">
                                <Eye className="h-8 w-8" />
                            </div>
                            <p className="text-xs text-muted-foreground">View detailed analytics</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Management Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* User Management */}
                {hasAnyUserPermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                User Management
                            </CardTitle>
                            <CardDescription>Manage system users and access</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.USERS_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View users</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.USERS_CREATE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Create users</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.USERS_EDIT) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Edit users</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.USERS_DELETE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Delete users</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.USERS_PROMOTE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Promote users</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.USERS_STATUS) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Change user status</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Role Management */}
                {hasAnyRolePermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Role Management
                            </CardTitle>
                            <CardDescription>Configure roles and permissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.ROLES_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View roles</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.ROLES_CREATE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Create roles</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.ROLES_EDIT) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Edit roles</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.ROLES_DELETE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Delete roles</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Property Management */}
                {hasAnyPropertyPermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Home className="h-5 w-5" />
                                Property Management
                            </CardTitle>
                            <CardDescription>Manage property listings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.PROPERTIES_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View properties</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.PROPERTIES_CREATE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Create properties</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.PROPERTIES_EDIT) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Edit properties</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.PROPERTIES_DELETE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Delete properties</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.PROPERTIES_APPROVE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Approve properties</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Vendor Management */}
                {hasAnyVendorPermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5" />
                                Vendor Management
                            </CardTitle>
                            <CardDescription>Manage vendor accounts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.VENDORS_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View vendors</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.VENDORS_APPROVE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Approve vendors</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.VENDORS_MANAGE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Manage vendors</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Review Management */}
                {hasAnyReviewPermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Review Management
                            </CardTitle>
                            <CardDescription>Manage and moderate reviews</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.REVIEWS_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View reviews</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.REVIEWS_REPORT) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Report & moderate reviews</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.REVIEWS_DELETE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Delete reviews</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* System & Settings */}
                {hasAnySystemPermission() && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                System & Settings
                            </CardTitle>
                            <CardDescription>System configuration and analytics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {hasPermission(PERMISSIONS.SETTINGS_MANAGE) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Manage settings</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.ANALYTICS_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View analytics</span>
                                    </div>
                                )}
                                {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>View dashboard</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* No Permissions Message */}
            {permissions.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-lg font-medium">No Permissions Assigned</p>
                            <p className="text-sm text-muted-foreground">
                                Contact your administrator to get permissions assigned to your role.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RoleBasedDashboard;
