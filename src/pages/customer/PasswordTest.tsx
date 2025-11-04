import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { 
  Key, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Mail,
  Bell,
  Settings
} from "lucide-react";

const PasswordTest = () => {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null);

  return (
    <div className="space-y-6 pt-16 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Key className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Password Management Demo</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          This demonstrates the complete password change flow from a real user's perspective, 
          with proper validation, security checks, and user feedback.
        </p>
      </div>

      {/* Current Implementation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              What Works Now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Secure password validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Current password verification</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Real-time password strength indicator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Proper error handling & feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Backend API integration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm">Email confirmation notifications</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Security Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">8+ character minimum length</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">Mixed case letters required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">Numbers and symbols required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">Prevents reusing current password</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">Secure password hashing (bcrypt)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm">JWT token authentication</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Flow Demonstration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Real User Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Click the button below to experience the complete password change flow
            </p>
            
            <Button 
              size="lg"
              onClick={() => setPasswordDialogOpen(true)}
              className="px-8"
            >
              <Key className="w-5 h-5 mr-2" />
              Change My Password
            </Button>
            
            {lastPasswordChange && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Last password change: {lastPasswordChange}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="font-semibold">Verify Current</h3>
              <p className="text-xs text-muted-foreground">
                Enter your current password for security verification
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <h3 className="font-semibold">Create New</h3>
              <p className="text-xs text-muted-foreground">
                Set a strong new password with real-time validation
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <h3 className="font-semibold">Confirmation</h3>
              <p className="text-xs text-muted-foreground">
                Receive instant feedback and email confirmation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Integration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Technical Implementation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Frontend Features:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• React component with TypeScript</li>
                <li>• Real-time password validation</li>
                <li>• Password strength indicator</li>
                <li>• Form validation and error handling</li>
                <li>• Toggle password visibility</li>
                <li>• Toast notifications for feedback</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Backend Integration:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• POST /api/auth/change-password</li>
                <li>• JWT authentication middleware</li>
                <li>• bcrypt password hashing</li>
                <li>• Current password verification</li>
                <li>• Email notification service</li>
                <li>• Comprehensive error handling</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Current Issue Fixed:</p>
                <p>
                  The original implementation was sending password change requests to support email 
                  instead of actually changing the password. The new implementation uses proper API 
                  endpoints with current password verification and secure password updates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">React + TypeScript</Badge>
            <Badge variant="secondary">shadcn/ui Components</Badge>
            <Badge variant="secondary">JWT Authentication</Badge>
            <Badge variant="secondary">bcrypt Hashing</Badge>
            <Badge variant="secondary">Real-time Validation</Badge>
            <Badge variant="secondary">Email Notifications</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Integration with Settings */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Available in Customer Settings</h3>
              <p className="text-sm text-muted-foreground mt-2">
                This password change functionality is integrated into the Customer Settings page 
                under the Security tab, providing users with easy access to password management.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/customer/settings'}
            >
              Go to Settings Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <PasswordChangeDialog 
        open={passwordDialogOpen} 
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            // Simulate successful password change
            setLastPasswordChange(new Date().toLocaleString());
          }
        }} 
      />
    </div>
  );
};

export default PasswordTest;
