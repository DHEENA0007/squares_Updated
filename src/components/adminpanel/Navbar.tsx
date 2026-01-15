import { Menu, Home } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import UnifiedProfileDropdown from "@/components/shared/UnifiedProfileDropdown";
import { useTheme } from "next-themes";
import ThemeToggle from "../ThemeToggle";
import appLogo from "@/assets/app-logo.png";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { theme } = useTheme();

  return (
    <>
      {/* Logo - Responsive positioning */}
      <Link
        to="/"
        className="fixed -top-2 left-2 xs:left-3 sm:left-4 md:-top-6 md:left-4 lg:left-6 z-[60] transition-transform hover:scale-105 duration-300"
      >
        <img
          src={appLogo}
          alt="BuildHomeMart"
          className="w-[140px] h-[70px] xs:w-[160px] xs:h-[80px] sm:w-[180px] sm:h-[90px] md:w-[200px] md:h-[95px] lg:w-[220px] lg:h-[100px] object-contain"
        />
      </Link>

      <nav className="fixed top-0 left-0 right-0 h-14 xs:h-15 sm:h-16 bg-card border-b border-border z-50 px-2 xs:px-3 sm:px-4 lg:px-6 transition-colors duration-300">
        <div className="h-full flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
            {/* Spacer for logo - Responsive */}
            <div className="ml-[130px] xs:ml-[150px] sm:ml-[170px] md:ml-[190px] lg:ml-[210px]">
              {/* Home Button */}
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 mr-2 xs:mr-0">
            <NotificationCenter />
            <ThemeToggle />
            <UnifiedProfileDropdown />
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1.5 xs:p-2 hover:bg-accent/10 rounded-lg transition-colors touch-manipulation"
              aria-label="Toggle menu"
            >
              <Menu className="w-4 h-4 xs:w-5 xs:h-5" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;