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
      {/* Logo - Responsive positioning */}
      <Link 
        to="/" 
        className="fixed -top-7 left-2 xs:left-3 sm:left-4 md:-top-6 md:left-4 lg:left-6 z-[60] transition-transform hover:scale-105 duration-300"
      >
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[140px] h-[70px] xs:w-[160px] xs:h-[80px] sm:w-[180px] sm:h-[90px] md:w-[200px] md:h-[95px] lg:w-[220px] lg:h-[100px] object-contain"
        />
      </Link>
      
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-2 xs:px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 xs:h-15 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 touch-manipulation"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4 xs:h-5 xs:w-5" />
              </Button>
              
              {/* Spacer for logo - Responsive */}
              <div className="ml-[130px] xs:ml-[150px] sm:ml-[170px] md:ml-[190px] lg:ml-[210px]">
                {/* Vendor portal specific content can go here */}
              </div>
              
              {/* Search - Hidden on mobile */}
              <div className="relative hidden md:block md:flex-1 md:max-w-xs lg:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search properties, leads..."
                  className="pl-10 h-8 md:h-9 text-sm w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
              <ThemeToggle />
              
              <VendorNotificationCenter />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 h-8 xs:h-9 sm:h-10 px-2 xs:px-3">
                    <div className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs sm:text-sm font-medium truncate max-w-[100px] lg:max-w-[150px]">
                        {user?.profile?.firstName && user?.profile?.lastName
                          ? `${user.profile.firstName} ${user.profile.lastName}`
                          : "Vendor User"
                        }
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56">
                  <DropdownMenuLabel className="text-xs sm:text-sm">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick} className="text-xs sm:text-sm">
                    <Settings className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCompanyDetailsClick} className="text-xs sm:text-sm">
                    <Building className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Company Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBillingClick} className="text-xs sm:text-sm">
                    <CreditCard className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSupportClick} className="text-xs sm:text-sm">
                    <HelpCircle className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive text-xs sm:text-sm">
                    <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile search for smaller screens */}
          <div className="md:hidden pb-3 sm:pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search properties, leads..."
                className="pl-10 w-full h-8 xs:h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default VendorNavbar;