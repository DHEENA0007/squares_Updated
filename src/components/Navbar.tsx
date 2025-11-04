import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import newBadge from "@/assets/new-badge.gif";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useState } from "react";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import CustomerProfileDropdown from "@/components/customer/CustomerProfileDropdown";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();

  // Debug logging
  console.log('Navbar: isAuthenticated:', isAuthenticated);
  console.log('Navbar: user:', user);

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
      
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Empty space where logo was, navigation links moved */}
              <div className="hidden md:flex items-center gap-6 ml-[200px]">
                <Link
                  to="/products"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  All Properties
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
              <Link to="/vendor/login">
                <Button
                  variant="ghost"
                  className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Post Your Property
                </Button>
              </Link>
              
              {isAuthenticated ? (
                <CustomerProfileDropdown />
              ) : (
                <Link to="/login">
                  <Button variant="ghost" className="hover:bg-accent/10">
                    <User className="h-5 w-5" /> <span>Login / Register</span>
                  </Button>
                </Link>
              )}
              
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
                All Properties
              </Link>
              <Link
                to="/contact"
                className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                to="/vendor/login"
                className="block"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className="w-full mb-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Post Your Property
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
};

export default Navbar;