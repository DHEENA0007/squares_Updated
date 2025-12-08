import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, Inbox, Archive } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedMessages = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.MESSAGES_VIEW)) {
            navigate('/rolebased');
        }
    }, [permissions]);

    if (!hasPermission(PERMISSIONS.MESSAGES_VIEW)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">
                    View and manage system messages
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">All messages</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unread</CardTitle>
                        <Inbox className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <p className="text-xs text-muted-foreground">New messages</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent</CardTitle>
                        <Send className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <p className="text-xs text-muted-foreground">Sent messages</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Archived</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Archived messages</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Messages</CardTitle>
                    <CardDescription>
                        View and manage messages • 
                        {hasPermission(PERMISSIONS.MESSAGES_SEND) && ' Can send messages •'}
                        {hasPermission(PERMISSIONS.MESSAGES_DELETE) && ' Can delete messages'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Message Management</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Message list will appear here
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedMessages;
