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
      {/* Logo - Responsive positioning */}
      <Link 
        to="/" 
        className="fixed -top-5 -left-6 xs:top-0 xs:left-4 sm:left-6 md:-top-8 md:left-8 z-[60] transition-transform hover:scale-105 duration-300"
      >
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[160px] h-[80px] xs:w-[180px] xs:h-[85px] sm:w-[200px] sm:h-[90px] md:w-[220px] md:h-[100px] object-contain"
        />
      </Link>
      
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex h-14 xs:h-16 items-center justify-between">
            {/* Desktop Navigation */}
            <div className="flex items-center gap-4 md:gap-8 flex-1">
              <div className="hidden md:flex items-center gap-4 lg:gap-6 ml-[180px] lg:ml-[220px]">
                <Link
                  to="/products"
                  className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
                >
                  All Properties
                </Link>
                <Link
                  to="/contact"
                  className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
              <Link to="/vendor/login" className="hidden md:block">
                <Button
                  variant="ghost"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4"
                >
                  Post Property
                </Button>
              </Link>
              
              {isAuthenticated ? (
                <CustomerProfileDropdown />
              ) : (
                <Link to="/login" className="hidden xs:block">
                  <Button variant="ghost" className="hover:bg-accent/10 text-xs sm:text-sm px-2 sm:px-4">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline ml-2">Login / Register</span>
                    <span className="sm:hidden ml-1">Login</span>
                  </Button>
                </Link>
              )}
              
              <div className="hidden xs:block">
                <ThemeToggle />
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
          </div>

        {/* Mobile Menu - Responsive */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
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
                  className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Post Your Property
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="block xs:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-center hover:bg-accent/10">
                    <User className="h-5 w-5 mr-2" />
                    Login / Register
                  </Button>
                </Link>
              )}
              <div className="xs:hidden pt-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
};

export default Navbar;