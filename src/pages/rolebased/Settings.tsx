import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Shield, Bell, Database, Palette } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedSettings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.SETTINGS_MANAGE)) {
            navigate('/rolebased');
        }
    }, [permissions]);

    if (!hasPermission(PERMISSIONS.SETTINGS_MANAGE)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">System Settings</h1>
                <p className="text-muted-foreground">
                    Manage system configuration and settings
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle>Security Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Configure authentication and security options
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Manage security policies, authentication methods, and access controls
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-primary" />
                            <CardTitle>Notification Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Configure notification preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Set up email templates, push notifications, and alert preferences
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-primary" />
                            <CardTitle>Data Management</CardTitle>
                        </div>
                        <CardDescription>
                            Manage data retention and backups
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Configure backup schedules, data retention policies, and storage options
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Palette className="h-5 w-5 text-primary" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>
                            Customize system appearance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Configure theme, branding, and UI customization options
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>Advanced settings and configurations</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Settings Management</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Detailed settings interface will appear here
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedSettings;
