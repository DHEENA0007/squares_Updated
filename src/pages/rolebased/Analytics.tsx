import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedAnalytics = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.ANALYTICS_VIEW)) {
            navigate('/rolebased');
        }
    }, [permissions]);

    if (!hasPermission(PERMISSIONS.ANALYTICS_VIEW)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics & Reports</h1>
                <p className="text-muted-foreground">
                    View system analytics and generate reports
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Page views</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">0%</div>
                        <p className="text-xs text-muted-foreground">vs last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>View detailed analytics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Analytics & Reports</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Analytics dashboard and reports will appear here
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedAnalytics;
