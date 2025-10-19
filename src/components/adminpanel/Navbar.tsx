import { Menu } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { useTheme } from "next-themes";
import ThemeToggle from "../ThemeToggle";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { theme } = useTheme();
  
  return (
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
          
          <div className="flex items-center gap-3">
            <img
              src={theme === "dark" ? logoDark : logoLight}
              alt="BuildHomeMart"
              className="w-[140px] h-[50px] object-contain transition-transform hover:scale-105 duration-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
