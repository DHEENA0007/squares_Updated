import { Menu } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { useTheme } from "next-themes";
import ThemeToggle from "../ThemeToggle";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { Link } from "react-router-dom";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { theme } = useTheme();
  
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
              {/* Admin panel specific content can go here */}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;