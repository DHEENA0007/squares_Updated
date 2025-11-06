import { Menu, Bell, Search } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import CustomerProfileDropdown from "./CustomerProfileDropdown";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { Link } from "react-router-dom";

interface CustomerNavbarProps {
  onMenuClick: () => void;
}

const CustomerNavbar = ({ onMenuClick }: CustomerNavbarProps) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  
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
      
      <nav className="fixed top-0 left-0 right-0 h-14 xs:h-15 sm:h-16 bg-card border-b border-border z-50 px-2 xs:px-3 sm:px-4 lg:px-6 transition-colors duration-300">
        <div className="h-full flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1.5 xs:p-2 hover:bg-accent/10 rounded-lg transition-colors touch-manipulation"
              aria-label="Toggle menu"
            >
              <Menu className="w-4 h-4 xs:w-5 xs:h-5" />
            </button>
            
            {/* Spacer for logo - Responsive */}
            <div className="ml-[130px] xs:ml-[150px] sm:ml-[170px] md:ml-[190px] lg:ml-[210px]">
              {/* Customer portal specific content can go here */}
            </div>

            {/* Search Bar - Hidden on mobile, visible on larger screens */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search properties, locations..."
                  className="pl-10 h-8 md:h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10">
              <Bell className="h-4 w-4 xs:h-5 xs:w-5" />
            </Button>
            <ThemeToggle />
            <CustomerProfileDropdown />
          </div>
        </div>
      </nav>
    </>
  );
};

export default CustomerNavbar;