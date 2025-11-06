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
      {/* Logo positioned outside container */}
      <Link to="/" className="fixed -top-6 left-4 z-[60] transition-transform hover:scale-105 duration-300">
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[220px] h-[100px] object-contain"
        />
      </Link>
      
      <nav className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4 lg:px-6 transition-colors duration-300">
        <div className="h-full flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-accent/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Empty space where logo was, navigation links moved */}
            <div className="ml-[200px]">
              {/* Customer portal specific content can go here */}
            </div>
          </div>

          {/* Search Bar */}
          {/* <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search properties, locations..."
                className="pl-10 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div> */}

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
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