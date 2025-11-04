import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Store, 
  Shield, 
  TrendingUp, 
  Users, 
  CheckCircle,
  Eye,
  EyeOff,
  Mail,
  Lock
} from "lucide-react";

const VendorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      // Clear any existing auth data first (silently)
      const { authService } = await import("@/services/authService");
      authService.clearAuthData();
      console.log('VendorLogin: Cleared existing auth data');
      
      const success = await login(email, password);
      console.log('VendorLogin: Login attempt result:', success);
      
      if (success) {
        // Check if user is a vendor and navigate accordingly
        // Get user from localStorage directly since getCurrentUser is async
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        console.log('VendorLogin: Current user after login:', user);
        
        if (user?.role === 'agent') {
          toast({
            title: "Login Successful",
            description: "Welcome to your vendor dashboard!",
          });
          navigate("/vendor/dashboard");
        } else {
          toast({
            title: "Access Denied",
            description: "This is a vendor-only portal. Please use the regular login.",
            variant: "destructive",
          });
          authService.clearAuthData();
        }
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Vendor login error:", error);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if it's a pending approval error
        if (errorMessage.includes("profile is under review") || 
            errorMessage.includes("pending approval") ||
            errorMessage.includes("awaiting admin approval")) {
          toast({
            title: "Account Pending Approval",
            description: errorMessage,
            variant: "default",
            duration: 5000,
          });
          return;
        }
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: TrendingUp,
      title: "Increase Sales",
      description: "Reach thousands of potential customers"
    },
    {
      icon: Shield,
      title: "Trusted Platform",
      description: "Secure and reliable business environment"
    },
    {
      icon: Users,
      title: "Customer Base",
      description: "Access to verified buyers and sellers"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="space-y-8">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Store className="w-4 h-4 mr-2" />
                Partner with Us
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Become a <span className="text-primary">Vendor</span> Partner
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Join our growing network of trusted vendors and expand your business reach in the real estate market.
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold">Why Choose Us?</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• No setup fees or hidden charges</li>
                <li>• 24/7 customer support</li>
                <li>• Real-time analytics dashboard</li>
                <li>• Marketing and promotional support</li>
              </ul>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="max-w-md mx-auto w-full">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Vendor Login</CardTitle>
                <CardDescription>
                  Sign in to your vendor dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="vendor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
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
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        New vendor?
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Link to="/vendor/register">
                      <Button variant="outline" className="w-full">
                        Register as Vendor
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-6 text-center text-sm">
                  <Link 
                    to="/vendor/forgot-password" 
                    className="text-primary hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VendorLogin;