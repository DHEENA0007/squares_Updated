import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RoleBasedMessages = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to dashboard - messages functionality has been removed
        navigate('/rolebased');
    }, [navigate]);

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        Messages & Communication
                    </CardTitle>
                    <CardDescription>
                        This feature has been deprecated
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Feature Removed</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Messages & Communication functionality has been removed from the role-based portal.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleBasedMessages;
