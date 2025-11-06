import { Menu, Bell, User, Search, LogOut, Settings, CreditCard, HelpCircle, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";
import { VendorNotificationCenter } from "./VendorNotificationCenter";

interface VendorNavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const VendorNavbar = ({ setSidebarOpen }: VendorNavbarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your vendor account.",
      });
      navigate("/"); // Redirect to home page
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProfileClick = () => {
    console.log("Profile clicked");
    navigate("/vendor/profile");
  };

  const handleCompanyDetailsClick = () => {
    console.log("Company details clicked");
    navigate("/vendor/profile");
  };

  const handleBillingClick = () => {
    console.log("Billing clicked");
    navigate("/vendor/billing");
  };

  const handleSupportClick = () => {
    console.log("Support clicked");
    // Could navigate to support page or open help center
    toast({
      title: "Support",
      description: "Support feature coming soon. Please contact admin for assistance.",
    });
  };

  return (
    <>
      {/* Logo positioned outside container */}
      <Link to="/" className="fixed -top-6 left-4 z-[60] transition-transform hover:scale-105 duration-300">
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[220px] h-[100px] object-contain"
        />
      </Link>
      
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Empty space where logo was, navigation links moved */}
              <div className="ml-[200px]">
                {/* Vendor portal specific content can go here */}
              </div>
              
              {/* Search */}
              {/* <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search properties, leads..."
                  className="pl-10 w-64"
                />
              </div> */}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              <VendorNotificationCenter />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-sm font-medium">
                        {user?.profile?.firstName && user?.profile?.lastName
                          ? `${user.profile.firstName} ${user.profile.lastName}`
                          : "Vendor User"
                        }
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCompanyDetailsClick}>
                    <Building className="mr-2 h-4 w-4" />
                    Company Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBillingClick}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSupportClick}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile search for smaller screens */}
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search properties, leads..."
                className="pl-10 w-full"
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default VendorNavbar;