import { Menu, X, User, ChevronDown, ChevronUp, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import newBadge from "@/assets/new-badge.gif";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import UnifiedProfileDropdown from "@/components/shared/UnifiedProfileDropdown";
import { toast } from "@/hooks/use-toast";
import { configurationService } from "@/services/configurationService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listingTypes, setListingTypes] = useState<Array<{ id: string; name: string; value: string; displayLabel?: string; queryParams?: any; children?: any[] }>>([]);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const { theme } = useTheme();
  const { user, isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  // Fetch listing types from Filter Management and their children from Navigation Management
  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        // Fetch listing types from Filter Management (e.g., For Sale, For Rent)
        const filterListingTypes = await configurationService.getFilterConfigurationsByType('listing_type', false);

        // Fetch navigation items from all categories
        const allNavItems = await configurationService.getAllNavigationItems(false);

        // Map listing types to parent structure with navigation children
        const typesWithChildren = filterListingTypes.map(listingType => {
          // Find navigation items whose parentId matches this listing type's value
          // This allows admins to assign property types to specific listing types
          const matchingPropertyTypes = allNavItems.filter(item =>
            item.parentId === listingType.value
          );

          return {
            id: listingType._id,
            name: listingType.name,
            displayLabel: listingType.displayLabel || listingType.name,
            value: listingType.value,
            queryParams: (listingType as any).queryParams,
            children: matchingPropertyTypes.map(propType => ({
              id: propType._id,
              label: propType.displayLabel || propType.name,
              value: propType.value,
              queryParams: (propType as any).queryParams,
            })),
          };
        });

        setListingTypes(typesWithChildren as any);

        // Initialize expanded states for each parent
        const initialStates: Record<string, boolean> = {};
        typesWithChildren.forEach(type => {
          initialStates[type.value] = false;
        });
        setExpandedStates(initialStates);
      } catch (error) {
        console.error('Error fetching navigation data:', error);
      }
    };
    fetchNavigationData();
  }, []);

  // Re-check authentication when component mounts to ensure auth state is fresh
  useEffect(() => {
    if (!user && localStorage.getItem('token')) {
      checkAuth();
    }
  }, []);

  const handlePostPropertyClick = async () => {
    console.log('Post Property clicked - Auth State:', {
      isAuthenticated,
      userRole: user?.role,
      user: user
    });

    // Re-check authentication to ensure fresh state
    await checkAuth();

    // Get fresh user data after auth check
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      console.log('Not authenticated, redirecting to vendor login');
      navigate('/vendor/login');
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.log('Invalid user data, redirecting to vendor login');
      navigate('/vendor/login');
      return;
    }

    console.log('Current user role:', currentUser.role);

    if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
      console.log('Admin user, redirecting to admin properties');
      navigate('/admin/properties');
      return;
    }

    if (currentUser.role === 'agent') {
      console.log('Vendor user, redirecting to vendor properties');
      navigate('/vendor/properties');
      return;
    }

    if (currentUser.role === 'customer') {
      toast({
        title: "Vendor Portal Required",
        description: "Contact the Squares team for vendor access to post properties",
        variant: "default",
      });
      return;
    }

    console.log('Unknown role or not authenticated, redirecting to vendor login');
    navigate('/vendor/login');
  };

  const handleMyListedPropertiesClick = async () => {
    // Re-check authentication to ensure fresh state
    await checkAuth();

    // Get fresh user data after auth check
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      console.log('Not authenticated, redirecting to vendor login');
      navigate('/vendor/login');
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.log('Invalid user data, redirecting to vendor login');
      navigate('/vendor/login');
      return;
    }

    console.log('My Listed Properties clicked - User role:', currentUser.role);

    if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
      console.log('Admin user, redirecting to admin properties');
      navigate('/admin/properties');
      return;
    }

    if (currentUser.role === 'agent') {
      console.log('Vendor user, redirecting to vendor properties');
      navigate('/vendor/properties');
      return;
    }

    if (currentUser.role === 'customer') {
      toast({
        title: "Vendor Portal Required",
        description: "Contact the Squares team for vendor access to view listed properties",
        variant: "default",
      });
      return;
    }

    console.log('Unknown role or not authenticated, redirecting to vendor login');
    navigate('/vendor/login');
  };

  const shouldShowPostPropertyButton = () => {
    if (!isAuthenticated) return true;
    return user?.role !== 'subadmin';
  };

  const handlePropertyTypeClick = (listingType: string, propertyType?: string, customQueryParams?: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    searchParams.set('listingType', listingType);

    // If custom query params are provided (from navigation items), use them
    if (customQueryParams) {
      Object.entries(customQueryParams).forEach(([key, value]) => {
        searchParams.set(key, value);
      });
    } else if (propertyType) {
      // Fallback to old behavior
      searchParams.set('propertyType', propertyType);
    }

    navigate(`/products?${searchParams.toString()}`);
  };

  return (
    <>


      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="relative flex h-20 xs:h-24 md:h-20 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="relative z-[60] flex items-center transition-transform hover:scale-105 duration-300 md:absolute md:-top-4 md:left-0"
            >
              <img
                src={theme === "dark" ? logoDark : logoLight}
                alt="BuildHomeMart"
                className="h-16 w-auto xs:h-20 sm:h-24 md:h-[90px] lg:h-[110px] object-contain"
              />
            </Link>
            {/* Desktop Navigation */}
            <div className="flex items-center gap-4 md:gap-8 flex-1">
              <div className="hidden md:flex items-center gap-4 lg:gap-6 ml-[180px] lg:ml-[220px]">
                {/* Dynamic Hierarchical Navigation */}
                {listingTypes.map((parent: any) => (
                  <DropdownMenu key={parent.id}>
                    <DropdownMenuTrigger className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1 outline-none">
                      {parent.displayLabel || parent.name} <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem onClick={() => handlePropertyTypeClick(parent.value, undefined, parent.queryParams)}>
                        All {parent.displayLabel || parent.name}
                      </DropdownMenuItem>
                      {parent.children && parent.children.length > 0 && parent.children.map((child: any) => (
                        <DropdownMenuItem
                          key={child.id}
                          onClick={() => handlePropertyTypeClick(parent.value, child.value, child.queryParams)}
                        >
                          {child.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}

                {/* Sell Dropdown - Static */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1 outline-none">
                    Sell <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={handlePostPropertyClick}>
                      Post Property for Free
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMyListedPropertiesClick}>
                      My Listed Properties
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link
                  to="/contact"
                  className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
                >
                  Support
                </Link>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 mr-2 xs:mr-0">
              {shouldShowPostPropertyButton() && (
                <Button
                  onClick={handlePostPropertyClick}
                  className="hidden md:block bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4"
                >
                  Post Property
                </Button>
              )}

              {isAuthenticated ? (
                <UnifiedProfileDropdown />
              ) : (
                <Link to="/login" className="hidden md:block">
                  <Button variant="ghost" className="hover:bg-accent/10 text-xs sm:text-sm px-2 sm:px-4">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline ml-2">Login / Register</span>
                    <span className="sm:hidden ml-1">Login</span>
                  </Button>
                </Link>
              )}

              <div className="hidden md:block">
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
                {/* Home Link */}
                <Link
                  to="/"
                  className="flex items-center gap-2 py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="h-4 w-4" /> Home
                </Link>

                {/* Dynamic Listing Type Sections */}
                {listingTypes.map((listingType) => (
                  <div key={listingType.id} className="space-y-1">
                    <button
                      onClick={() => setExpandedStates(prev => ({ ...prev, [listingType.value]: !prev[listingType.value] }))}
                      className="flex items-center justify-between w-full text-left py-2 text-sm font-medium hover:text-primary transition-colors"
                    >
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        {listingType.displayLabel || listingType.name}
                      </span>
                      {expandedStates[listingType.value] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedStates[listingType.value] && (
                      <div className="space-y-1 pl-4">
                        <button
                          onClick={() => {
                            handlePropertyTypeClick(listingType.value, undefined, listingType.queryParams);
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                        >
                          All {listingType.displayLabel || listingType.name}
                        </button>
                        {listingType.children && listingType.children.length > 0 && listingType.children.map((child: any) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              handlePropertyTypeClick(listingType.value, child.value, child.queryParams);
                              setMobileMenuOpen(false);
                            }}
                            className="block w-full text-left py-1 pl-2 text-sm hover:text-primary transition-colors"
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Sell Section */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Sell</p>
                  <button
                    onClick={() => {
                      handlePostPropertyClick();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                  >
                    Post Property for Free
                  </button>
                  <button
                    onClick={() => {
                      handleMyListedPropertiesClick();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                  >
                    My Listed Properties
                  </button>
                </div>

                <Link
                  to="/contact"
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Support
                </Link>

                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="block md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="ghost" className="w-full justify-center hover:bg-accent/10">
                      <User className="h-5 w-5 mr-2" />
                      Login / Register
                    </Button>
                  </Link>
                )}
                <div className="md:hidden pt-2 flex justify-center">
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