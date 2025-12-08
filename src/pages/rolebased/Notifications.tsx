import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Send, Settings, Eye } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedNotifications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)) {
            navigate('/rolebased');
        }
    }, [permissions]);

    if (!hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">
                    Manage system notifications
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">All notifications</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
                        <Send className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <p className="text-xs text-muted-foreground">Today's notifications</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Eye className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <p className="text-xs text-muted-foreground">Subscribers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Templates</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Active templates</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Notification Management</CardTitle>
                    <CardDescription>
                        {hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW) && 'View notifications • '}
                        {hasPermission(PERMISSIONS.NOTIFICATIONS_SEND) && 'Send notifications • '}
                        {hasPermission(PERMISSIONS.NOTIFICATIONS_MANAGE) && 'Manage settings'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Notification Center</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Notification management interface will appear here
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedNotifications;
