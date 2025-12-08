import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, clearAuthDataAndUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || location.state?.from || null;

  // Show message if redirected from protected route
  useEffect(() => {
    if (location.state?.message) {
      toast({
        title: "Portal Access",
        description: location.state.message,
        variant: "default",
      });
      // Clear the message from state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        // Vendor trying to login through default portal
        if (user.role === 'agent') {
          toast({
            title: "Incorrect Portal",
            description: "Please login through the Vendor Portal to access your vendor account.",
            variant: "destructive",
          });
          // Clear auth state and localStorage, then redirect after delay
          clearAuthDataAndUser();
          setTimeout(() => {
            navigate("/vendor/login");
          }, 2000);
          return;
        }

        // If user was trying to access a specific route, redirect there
        if (from) {
          // Convert public property route to customer property route
          if (from.startsWith('/property/')) {
            const propertyId = from.replace('/property/', '');
            console.log('Login: Redirecting to customer property view:', propertyId);
            navigate(`/customer/property/${propertyId}`, { replace: true });
          } else {
            console.log('Login: Redirecting to intended destination:', from);
            navigate(from, { replace: true });
          }
        } else {
          // Otherwise redirect based on user role
          // Otherwise redirect based on user role
          if (user.role === 'superadmin') {
            console.log('Login: Redirecting superadmin to admin dashboard');
            navigate("/admin/dashboard");
          } else if (user.role === 'subadmin') {
            console.log('Login: Redirecting subadmin to subadmin dashboard');
            navigate("/subadmin/dashboard");
          } else if (user.role === 'admin') {
            console.log('Login: Redirecting admin to admin dashboard');
            navigate("/admin/dashboard");
          } else if (user.role === 'agent') {
            // Should be handled by the check above, but just in case
            console.log('Login: Redirecting agent to vendor login');
            navigate("/vendor/login");
          } else if (user.role === 'customer') {
            console.log('Login: Redirecting customer to customer dashboard');
            navigate("/customer/dashboard");
          } else {
            // Custom role with permissions
            console.log(`Login: Redirecting custom role '${user.role}' to role-based dashboard`);
            navigate("/rolebased");
          }
        }
      } else {
        // Handle specific error cases
        if (result.isVendorPendingApproval || result.error?.includes('pending approval') || result.error?.includes('pending_approval')) {
          toast({
            title: "Vendor Profile Pending Approval",
            description: "Your vendor profile is under review. You will be notified once approved by our admin team. Please login through the Vendor Portal.",
            variant: "default",
            duration: 6000,
          });
          // Redirect to vendor login after showing message
          setTimeout(() => {
            navigate("/vendor/login");
          }, 3000);
        } else {
          // Show other login errors
          toast({
            title: "Login Failed",
            description: result.error || "Invalid email or password",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      // Handle API errors that might indicate vendor pending approval
      if (error.message?.includes('pending approval') || error.message?.includes('pending_approval')) {
        toast({
          title: "Vendor Profile Pending Approval",
          description: "Your vendor profile is under review. You will be notified once approved by our admin team. Please login through the Vendor Portal.",
          variant: "default",
          duration: 6000,
        });
        setTimeout(() => {
          navigate("/vendor/login");
        }, 3000);
      } else {
        toast({
          title: "Login Error",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
            <p className="text-center text-muted-foreground mb-8">
              Sign in to your BuildHomeMart account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            {/* <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                Or continue with
              </span>
            </div>

            <Button variant="outline" className="w-full">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button> */}

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
