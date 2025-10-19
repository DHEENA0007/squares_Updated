import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import newBadge from "@/assets/new-badge.gif";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useState } from "react";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="transition-transform hover:scale-105 duration-300">
              <img
                src={theme === "dark" ? logoDark : logoLight}
                alt="BuildHomeMart"
                className="w-[180px] h-[60px] object-contain"
              />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/products"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Products
              </Link>
              <Link
                to="/subscription-plans"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Subscription Plans
              </Link>
              <Link
                to="/contact"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="hover:bg-accent/10">
                <User className="h-5 w-5" /> <span>Login / Register</span>
              </Button>
            </Link>
            <Link to="/post-property">
              <Button
                variant="accent"
                className="hidden sm:flex items-center gap-2 px-4 py-2"
              >
                <span>Post Property</span>
                <img
                  src={newBadge}
                  alt="Post Property GIF"
                  className="w-7 h-7"
                  style={{ display: "inline-block" }}
                />
              </Button>
            </Link>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/products"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                to="/subscription-plans"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Subscription Plans
              </Link>
              <Link
                to="/contact"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                to="/post-property"
                className="block"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="accent"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <span>Post Property</span>
                  <img
                    src={newBadge}
                    alt="Post Property GIF"
                    className="w-7 h-7"
                  />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
