import { Menu, Bell, User, Search, LogOut, Settings, CreditCard, HelpCircle, Building, X, MapPin, Home, LucideIcon, BarChart3, Crown, Star, MessageSquare, Users } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "next-themes";
import { VendorNotificationCenter } from "./VendorNotificationCenter";
import { useDebounce } from "@/hooks/use-debounce";
import UnifiedProfileDropdown from "@/components/shared/UnifiedProfileDropdown";

interface SearchSuggestion {
  type: 'location' | 'property' | 'portal';
  title: string;
  subtitle?: string;
  icon: string;
  query: string;
  propertyId?: string;
}

// Map icon names to icon components
const iconMap: Record<string, LucideIcon> = {
  MapPin,
  Home,
  Search,
  BarChart3,
  Crown,
  Star,
  MessageSquare,
  Users,
  CreditCard,
  Settings
};

interface VendorNavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

const VendorNavbar = ({ setSidebarOpen }: VendorNavbarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Fetch suggestions when debounced search changes
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const url = `${import.meta.env.VITE_API_URL}/vendors/search/suggestions?q=${encodeURIComponent(debouncedSearch)}`;
        console.log('Fetching vendor suggestions from:', url);
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('Received vendor suggestions:', data);
          setSuggestions(data.data?.suggestions || []);
          setShowSuggestions(true);
        } else {
          console.error('Failed to fetch vendor suggestions:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch vendor suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node) &&
          mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent, query?: string) => {
    e.preventDefault();
    const finalQuery = query || searchQuery;
    if (finalQuery.trim()) {
      navigate(`/vendor/properties?search=${encodeURIComponent(finalQuery.trim())}`);
      setShowSuggestions(false);
      setSearchQuery("");
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'portal') {
      // Navigate to portal page
      const portalRoutes: Record<string, string> = {
        'dashboard': '/vendor/dashboard',
        'properties': '/vendor/properties',
        'analytics': '/vendor/analytics',
        'subscription': '/vendor/subscription-manager',
        'billing': '/vendor/billing',
        'reviews': '/vendor/reviews',
        'messages': '/vendor/messages',
        'leads': '/vendor/leads',
        'profile': '/vendor/profile'
      };
      const route = portalRoutes[suggestion.query.toLowerCase()];
      if (route) {
        navigate(route);
      }
    } else if (suggestion.type === 'property' && suggestion.propertyId) {
      // Navigate directly to property details page
      navigate(`/vendor/properties/details/${suggestion.propertyId}`);
    } else {
      // For location searches, go to properties page with search
      navigate(`/vendor/properties?search=${encodeURIComponent(suggestion.query)}`);
    }
    setShowSuggestions(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <>
      {/* Logo - Responsive positioning */}
      <Link
        to="/"
        className="fixed -top-4 left-2 xs:left-3 sm:left-4 md:-top-6 md:left-4 lg:left-6 z-[60] transition-transform hover:scale-105 duration-300"
      >
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="BuildHomeMart"
          className="w-[140px] h-[70px] xs:w-[160px] xs:h-[80px] sm:w-[180px] sm:h-[90px] md:w-[200px] md:h-[95px] lg:w-[220px] lg:h-[100px] object-contain"
        />
      </Link>
      
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-300">
        <div className="container mx-auto px-2 xs:px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 xs:h-15 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 flex-1">
              {/* Spacer for logo - Responsive */}
              <div className="ml-[130px] xs:ml-[150px] sm:ml-[170px] md:ml-[190px] lg:ml-[210px]">
                {/* Vendor portal specific content can go here */}
              </div>
              
              {/* Search - Hidden on mobile */}
              <div className="relative hidden md:block md:flex-1 md:max-w-xs lg:max-w-md" ref={searchRef}>
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search portal, properties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                      className="pl-10 pr-10 h-8 md:h-9 text-sm w-full bg-accent/50 border-accent focus:border-primary transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                      {suggestions.map((suggestion, index) => {
                        const Icon = iconMap[suggestion.icon] || Search;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0 ${
                              index === selectedIndex ? 'bg-accent/50' : ''
                            }`}
                          >
                            <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{suggestion.title}</div>
                              {suggestion.subtitle && (
                                <div className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 mr-2 xs:mr-0">
              <ThemeToggle />

              <VendorNotificationCenter />

              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 xs:p-2 hover:bg-accent/10 rounded-lg transition-colors touch-manipulation"
                aria-label="Toggle menu"
              >
                <Menu className="w-4 h-4 xs:w-5 xs:h-5" />
              </button>

              <UnifiedProfileDropdown />
            </div>
          </div>

          {/* Mobile search for smaller screens */}
          <div className="md:hidden pb-3 sm:pb-4" ref={mobileSearchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search properties, leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                  className="pl-10 pr-10 w-full h-8 xs:h-9 text-sm bg-accent/50 border-accent focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  {suggestions.map((suggestion, index) => {
                    const Icon = iconMap[suggestion.icon] || Search;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0 ${
                          index === selectedIndex ? 'bg-accent/50' : ''
                        }`}
                      >
                        <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{suggestion.title}</div>
                          {suggestion.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </form>
          </div>
        </div>
      </header>
    </>
  );
};

export default VendorNavbar;