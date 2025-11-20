import { Menu, X, User, ChevronDown, ChevronUp } from "lucide-react";
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
  const [buyExpanded, setBuyExpanded] = useState(false);
  const [rentExpanded, setRentExpanded] = useState(false);
  const [commercialExpanded, setCommercialExpanded] = useState(false);
  const { theme } = useTheme();
  const { user, isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  // Re-check authentication when component mounts to ensure auth state is fresh
  useEffect(() => {
    if (!user && localStorage.getItem('token')) {
      checkAuth();
    }
  }, []);

  // Property categories for dropdown - mapped to database values
  const residentialProperties = [
    { label: "Flat / Apartment", value: "apartment" },
    { label: "Residential House", value: "house" },
    { label: "Villa", value: "villa" },
    { label: "Builder Floor Apartment", value: "apartment" },
    { label: "Residential Land / Plot", value: "plot" },
    { label: "Penthouse", value: "apartment" },
    { label: "Studio Apartment", value: "apartment" },
    { label: "PG (Paying Guest)", value: "pg" },
  ];

  const commercialProperties = [
    { label: "Commercial Office Space", value: "office" },
    { label: "Office in IT Park / SEZ", value: "office" },
    { label: "Commercial Shop", value: "commercial" },
    { label: "Commercial Showroom", value: "commercial" },
    { label: "Commercial Land", value: "land" },
    { label: "Warehouse / Godown", value: "commercial" },
    { label: "Industrial Land", value: "land" },
    { label: "Industrial Building", value: "commercial" },
    { label: "Industrial Shed", value: "commercial" },
  ];

  const agriculturalProperties = [
    { label: "Agricultural Land", value: "land" },
    { label: "Farm House", value: "house" },
  ];

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

  const handlePropertyTypeClick = (listingType: string, propertyType?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('listingType', listingType);
    if (propertyType) {
      searchParams.set('propertyType', propertyType);
    }
    navigate(`/products?${searchParams.toString()}`);
  };

  return (
    <>
      {/* Logo - Responsive positioning */}
      <Link
        to="/"
        className="fixed top-0 left-0 xs:top-0 xs:left-4 sm:left-6 md:-top-8 md:left-8 z-[60] transition-transform hover:scale-105 duration-300"
      >
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[120px] h-[60px] xs:w-[140px] xs:h-[70px] sm:w-[160px] sm:h-[80px] md:w-[180px] md:h-[90px] lg:w-[200px] lg:h-[100px] object-contain"
        />
      </Link>
      
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex h-14 xs:h-16 items-center justify-between">
            {/* Desktop Navigation */}
            <div className="flex items-center gap-4 md:gap-8 flex-1">
              <div className="hidden md:flex items-center gap-4 lg:gap-6 ml-[180px] lg:ml-[220px]">
                {/* Buy Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1 outline-none">
                    Buy <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={() => handlePropertyTypeClick('sale')}>
                      All Properties for Sale
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Residential</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {residentialProperties.map((prop) => (
                          <DropdownMenuItem 
                            key={prop.value}
                            onClick={() => handlePropertyTypeClick('sale', prop.value)}
                          >
                            {prop.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Agricultural</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {agriculturalProperties.map((prop) => (
                          <DropdownMenuItem 
                            key={prop.value}
                            onClick={() => handlePropertyTypeClick('sale', prop.value)}
                          >
                            {prop.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Rent Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1 outline-none">
                    Rent <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={() => handlePropertyTypeClick('rent')}>
                      All Properties for Rent
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Residential</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {residentialProperties.map((prop) => (
                          <DropdownMenuItem 
                            key={prop.value}
                            onClick={() => handlePropertyTypeClick('rent', prop.value)}
                          >
                            {prop.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sell Dropdown */}
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

                {/* Commercial Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap flex items-center gap-1 outline-none">
                    Commercial <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem onClick={() => handlePropertyTypeClick('sale', 'commercial,office')}>
                      Buy Commercial Property
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePropertyTypeClick('rent', 'commercial,office')}>
                      Rent Commercial Property
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Commercial Types</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {commercialProperties.map((prop) => (
                          <DropdownMenuItem 
                            key={prop.value}
                            onClick={() => handlePropertyTypeClick('sale', prop.value)}
                          >
                            {prop.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
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
              {/* Buy Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setBuyExpanded(!buyExpanded)}
                  className="flex items-center justify-between w-full text-left py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Buy</span>
                  {buyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {buyExpanded && (
                  <div className="space-y-1 pl-4">
                    <button
                      onClick={() => {
                        handlePropertyTypeClick('sale');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                    >
                      All Properties for Sale
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Residential</p>
                      {residentialProperties.map((prop) => (
                        <button
                          key={prop.value}
                          onClick={() => {
                            handlePropertyTypeClick('sale', prop.value);
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full text-left py-1 pl-2 text-sm hover:text-primary transition-colors"
                        >
                          {prop.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Agricultural</p>
                      {agriculturalProperties.map((prop) => (
                        <button
                          key={prop.value}
                          onClick={() => {
                            handlePropertyTypeClick('sale', prop.value);
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full text-left py-1 pl-2 text-sm hover:text-primary transition-colors"
                        >
                          {prop.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rent Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setRentExpanded(!rentExpanded)}
                  className="flex items-center justify-between w-full text-left py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Rent</span>
                  {rentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {rentExpanded && (
                  <div className="space-y-1 pl-4">
                    <button
                      onClick={() => {
                        handlePropertyTypeClick('rent');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                    >
                      All Properties for Rent
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Residential</p>
                      {residentialProperties.map((prop) => (
                        <button
                          key={prop.value}
                          onClick={() => {
                            handlePropertyTypeClick('rent', prop.value);
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full text-left py-1 pl-2 text-sm hover:text-primary transition-colors"
                        >
                          {prop.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sell Section */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Sell</p>
                <button
                  onClick={() => {
                    handlePostPropertyClick();
                    setMobileMenuOpen(false);
                  }}
                  className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  Post Property for Free
                </button>
                {shouldShowPostPropertyButton() && (
                  <button
                    onClick={() => {
                      handlePostPropertyClick();
                      setMobileMenuOpen(false);
                    }}
                    className="block py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 rounded-md text-center w-full"
                  >
                    Post Property
                  </button>
                )}

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

              {/* Commercial Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setCommercialExpanded(!commercialExpanded)}
                  className="flex items-center justify-between w-full text-left py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Commercial</span>
                  {commercialExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {commercialExpanded && (
                  <div className="space-y-1 pl-4">
                    <button
                      onClick={() => {
                        handlePropertyTypeClick('sale', 'commercial,office');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                    >
                      Buy Commercial
                    </button>
                    <button
                      onClick={() => {
                        handlePropertyTypeClick('rent', 'commercial,office');
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 text-sm hover:text-primary transition-colors"
                    >
                      Rent Commercial
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Commercial Types</p>
                      {commercialProperties.map((prop) => (
                        <button
                          key={prop.value}
                          onClick={() => {
                            handlePropertyTypeClick('sale', prop.value);
                            setMobileMenuOpen(false);
                          }}
                          className="block w-full text-left py-1 pl-2 text-sm hover:text-primary transition-colors"
                        >
                          {prop.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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