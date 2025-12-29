import { Search, MapPin, Sparkles, Home, MapPinIcon, Bed, Bath, Maximize, Heart, Phone, Mail, Eye, Filter, X, Clock, TrendingUp, ChevronDown, Plus, Calculator, List, Settings, IndianRupee, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import buyImage from "@/assets/Buy.jpg";
import rentImage from "@/assets/Rent.jpg";
import leaseImage from "@/assets/Lease.jpg";
import commercialImage from "@/assets/commercial.jpg";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { propertyService, type Property, type PropertyFilters } from "@/services/propertyService";
import { DEFAULT_PROPERTY_IMAGE } from "@/utils/imageUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { locaService } from "@/services/locaService";
import { heroContentService, type HeroSlide, type HeroSettings, type SellingOption } from "@/services/heroContentService";
import { configurationService } from "@/services/configurationService";
import type { FilterConfiguration } from "@/types/configuration";

// Icon mapping for dynamic selling options
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Calculator,
  List,
  Settings,
  Home,
  Building,
  MapPin,
};

const Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, checkAuth } = useAuth();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchRef = useRef<string>("");
  const lastSearchTimeRef = useRef<number>(0);

  const [activeTab, setActiveTab] = useState("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [bedrooms, setBedrooms] = useState<number | undefined>();
  // Keep select values as strings to avoid controlled/uncontrolled warnings
  const [propertyType, setPropertyType] = useState<string>("");

  // Location filters using locaService
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [locaInitialized, setLocaInitialized] = useState(false);

  // Dynamic hero content from backend
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings | null>(null);
  const [dynamicSellingOptions, setDynamicSellingOptions] = useState<SellingOption[]>([]);
  const [heroContentLoaded, setHeroContentLoaded] = useState(false);

  // Filter options from configuration
  const [bedroomOptions, setBedroomOptions] = useState<FilterConfiguration[]>([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<any[]>([]);
  const [budgetOptions, setBudgetOptions] = useState<FilterConfiguration[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [listingTypeOptions, setListingTypeOptions] = useState<FilterConfiguration[]>([]);


  // Handle post property navigation based on role
  const handlePostProperty = async () => {
    // Re-check authentication to ensure fresh state
    await checkAuth();

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      navigate('/vendor/login');
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      navigate('/vendor/login');
      return;
    }

    if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
      navigate('/admin/properties');
      return;
    }

    if (currentUser.role === 'agent') {
      navigate('/vendor/properties');
      return;
    }

    navigate('/vendor/login');
  };

  // Selling options configuration
  const sellingOptions = [
    {
      id: "post-property",
      label: "Post Property",
      description: "List your property for sale or rent",
      icon: Plus,
      action: handlePostProperty
    },
    {
      id: "property-valuation",
      label: "Property Valuation",
      description: "Get your property valued by experts",
      icon: Calculator,
      action: () => {
        navigate("/contact?service=valuation");
      }
    },
    {
      id: "quick-listing",
      label: "Quick Listing",
      description: "Fast-track your property listing",
      icon: List,
      action: handlePostProperty
    },
    {
      id: "manage-properties",
      label: "Manage Properties",
      description: "View and manage your listings",
      icon: Settings,
      action: async () => {
        await checkAuth();

        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
          navigate('/vendor/login');
          return;
        }

        let currentUser;
        try {
          currentUser = JSON.parse(storedUser);
        } catch (e) {
          navigate('/vendor/login');
          return;
        }

        if (currentUser.role === 'agent') {
          navigate('/vendor/properties');
        } else if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
          navigate('/admin/properties');
        } else {
          navigate('/vendor/login');
        }
      }
    }
  ];

  // Map tabs to listing types
  // Map tabs to listing types dynamically
  const getListingTypeForTab = (tab: string) => {
    if (tab === 'commercial') return 'sale'; // Default for commercial
    const option = listingTypeOptions.find(o => o.displayLabel?.toLowerCase() === tab.toLowerCase() || o.name.toLowerCase() === tab.toLowerCase() || o.value.toLowerCase() === tab.toLowerCase());
    return option?.value || 'sale';
  };

  // Fallback default content for when API hasn't loaded yet
  const defaultDynamicContent: Record<string, { title: string; description: string; badge?: { text: string; isVisible: boolean } }> = {
    buy: {
      title: "Find Your Dream Home",
      description: "Discover the perfect property to purchase across India with our comprehensive platform",
      badge: { text: "India's Leading Property Platform", isVisible: true }
    },
    rent: {
      title: "Discover Rental Properties",
      description: "Find comfortable and affordable rental homes across India's prime locations",
      badge: { text: "India's Leading Property Platform", isVisible: true }
    },
    lease: {
      title: "Lease Properties with Ease",
      description: "Explore premium lease options for residential and commercial properties",
      badge: { text: "India's Leading Property Platform", isVisible: true }
    },
    commercial: {
      title: "Commercial Real Estate Hub",
      description: "Find the ideal commercial space for your business across India's business districts",
      badge: { text: "India's Leading Property Platform", isVisible: true }
    }
  };

  // Dynamic content based on active tab - uses API data or defaults
  const dynamicContent = useMemo(() => {
    if (heroSlides.length > 0) {
      const content: Record<string, { title: string; description: string; badge?: { text: string; isVisible: boolean } }> = {};
      heroSlides.forEach(slide => {
        content[slide.tabKey] = {
          title: slide.title,
          description: slide.description,
          badge: slide.badge,
        };
      });
      return content;
    }
    return defaultDynamicContent;
  }, [heroSlides]);

  // Dynamic background images from API or defaults
  const backgroundImages = useMemo(() => {
    if (heroSlides.length > 0) {
      const images: Record<string, string> = {};
      heroSlides.forEach(slide => {
        // Handle both absolute URLs and relative paths
        if (slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('/uploads')) {
          images[slide.tabKey] = slide.imageUrl;
        } else if (slide.imageUrl.startsWith('/assets')) {
          // For asset paths, we need to use the imported images
          const assetMap: Record<string, string> = {
            '/assets/Buy.jpg': buyImage,
            '/assets/Rent.jpg': rentImage,
            '/assets/Lease.jpg': leaseImage,
            '/assets/commercial.jpg': commercialImage,
          };
          images[slide.tabKey] = assetMap[slide.imageUrl] || buyImage;
        } else {
          // Default to imported images
          const defaultMap: Record<string, string> = {
            buy: buyImage,
            rent: rentImage,
            lease: leaseImage,
            commercial: commercialImage,
          };
          images[slide.tabKey] = defaultMap[slide.tabKey] || buyImage;
        }
      });
      return images;
    }
    return {
      buy: buyImage,
      rent: rentImage,
      lease: leaseImage,
      commercial: commercialImage,
    };
  }, [heroSlides]);

  // Selling options from API or defaults
  const sellingOptionsToRender = useMemo(() => {
    if (dynamicSellingOptions.length > 0) {
      return dynamicSellingOptions.map(option => ({
        id: option.optionId,
        label: option.label,
        description: option.description,
        icon: iconMap[option.icon] || Plus,
        action: () => {
          switch (option.action) {
            case 'post-property':
            case 'quick-listing':
              handlePostProperty();
              break;
            case 'property-valuation':
              navigate("/contact?service=valuation");
              break;
            case 'manage-properties':
              (async () => {
                await checkAuth();
                const token = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');
                if (!token || !storedUser) {
                  navigate('/vendor/login');
                  return;
                }
                let currentUser;
                try {
                  currentUser = JSON.parse(storedUser);
                } catch (e) {
                  navigate('/vendor/login');
                  return;
                }
                if (currentUser.role === 'agent') {
                  navigate('/vendor/properties');
                } else if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
                  navigate('/admin/properties');
                } else {
                  navigate('/vendor/login');
                }
              })();
              break;
            case 'contact':
              navigate("/contact");
              break;
            default:
              handlePostProperty();
          }
        },
      }));
    }
    return sellingOptions;
  }, [dynamicSellingOptions, navigate, checkAuth]);

  // Load hero content from API
  useEffect(() => {
    const loadHeroContent = async () => {
      try {
        const content = await heroContentService.getAllHeroContent();
        setHeroSlides(content.slides);
        setHeroSettings(content.settings);
        setDynamicSellingOptions(content.sellingOptions);
        setHeroContentLoaded(true);
      } catch (error) {
        console.error('Failed to load hero content:', error);
        // Content will fall back to defaults
        setHeroContentLoaded(true);
      }
    };

    loadHeroContent();
  }, []);

  // Fetch filter options from configuration
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [bedroomOpts, propertyTypes, budgetOpts, listingTypes] = await Promise.all([
          configurationService.getFilterConfigurationsByType('bedroom', false),
          configurationService.getAllPropertyTypes(false),
          configurationService.getFilterConfigurationsByType('budget', false),
          configurationService.getFilterConfigurationsByType('listing_type', false),
        ]);

        // Sort bedroom options by display order and filter out 'any' option for display
        const sortedBedroomOptions = bedroomOpts
          .filter(o => o.value !== 'any')
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setBedroomOptions(sortedBedroomOptions);

        // Set property types
        setPropertyTypeOptions(propertyTypes);

        // Sort budget options by display order
        const sortedBudgetOptions = budgetOpts
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setBudgetOptions(sortedBudgetOptions);

        // Sort listing types
        const sortedListingTypes = listingTypes
          .filter(l => l.value !== 'all') // Exclude 'all' from tabs
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setListingTypeOptions(sortedListingTypes);
      } catch (error) {
        console.error('Failed to load filter options:', error);
        // Fallback to empty - will show defaults
      }
    };

    fetchFilterOptions();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Initialize loca service and load states on mount
  useEffect(() => {
    const initLocaService = async () => {
      try {
        if (!locaService.isReady()) {
          await locaService.initialize();
        }
        setLocaInitialized(true);
        const loadedStates = locaService.getStates();
        setStates(loadedStates);
      } catch (error) {
        console.error('Failed to initialize loca service:', error);
        setStates([]);
      }
    };

    initLocaService();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (selectedState && locaInitialized) {
      const loadedDistricts = locaService.getDistricts(selectedState);
      setDistricts(loadedDistricts);
      // reset dependent selects to empty string (controlled)
      setSelectedDistrict("");
      setSelectedCity("");
      setCities([]);
    } else {
      setDistricts([]);
      setSelectedDistrict("");
      setCities([]);
    }
  }, [selectedState, locaInitialized]);

  // Load cities when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict && locaInitialized) {
      const loadedCities = locaService.getCities(selectedState, selectedDistrict);
      setCities(loadedCities);
      setSelectedCity("");
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedState, selectedDistrict, locaInitialized]);

  // Save search to recent searches
  const saveToRecentSearches = useCallback((query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Generate search suggestions using locaService
  const generateSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await locaService.searchLocations(query, 50);
      // Convert PincodeSuggestion objects to display strings
      const suggestionStrings = results.map(suggestion =>
        `${suggestion.city}, ${suggestion.district}, ${suggestion.state}`
      );
      setSuggestions(suggestionStrings);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions([]);
    }
  }, [locaInitialized]);

  // Search properties function with rate limiting and request cancellation
  const searchProperties = useCallback(async (query: string, additionalFilters: Partial<PropertyFilters> = {}) => {
    // Allow search with either query or location filters
    const hasLocationFilter = selectedState || selectedDistrict || selectedCity;

    if (!query.trim() && !hasLocationFilter) {
      setProperties([]);
      setShowResults(false);
      setError(null);
      return;
    }

    // Build location search query
    let searchQuery = query.trim();

    // Parse location string if it contains commas (e.g., "Palladam SO, TIRUPPUR, TAMIL NADU")
    // Just use the first part (city/locality) for more accurate matching
    if (searchQuery.includes(',')) {
      const parts = searchQuery.split(',').map(p => p.trim());
      // Use just the city/locality (first part) for better results
      if (parts.length >= 1) {
        searchQuery = parts[0];
      }
    } else if (hasLocationFilter) {
      // Use the most specific location selected
      // Priority: City > District > State
      let locationFilter = '';
      if (selectedCity) {
        locationFilter = selectedCity;
      } else if (selectedDistrict) {
        locationFilter = selectedDistrict;
      } else if (selectedState) {
        locationFilter = selectedState;
      }

      // Append location filter to search query if we have one
      if (locationFilter) {
        if (searchQuery) {
          searchQuery = `${searchQuery} ${locationFilter}`;
        } else {
          searchQuery = locationFilter;
        }
      }
    }

    // Rate limiting: prevent searches within 1 second of each other
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    if (timeSinceLastSearch < 1000 && lastSearchRef.current === searchQuery) {
      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Update tracking refs
    lastSearchRef.current = searchQuery;
    lastSearchTimeRef.current = now;

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    console.log('Searching properties with query:', searchQuery);

    try {
      const filters: PropertyFilters = {
        search: searchQuery,
        listingType: getListingTypeForTab(activeTab) as 'sale' | 'rent' | 'lease',
        limit: 9, // Show more results
        page: 1,
        ...additionalFilters
      };

      console.log('Search filters:', filters);

      // Add property type filter for commercial
      if (activeTab === 'commercial') {
        filters.propertyType = 'commercial';
      }

      // Add additional filters
      if (propertyType && activeTab !== 'commercial') {
        filters.propertyType = propertyType;
      }

      if (bedrooms) {
        filters.bedrooms = bedrooms;
      }

      if (priceRange.min) {
        filters.minPrice = priceRange.min;
      }

      if (priceRange.max) {
        filters.maxPrice = priceRange.max;
      }

      const response = await propertyService.getProperties(filters);

      console.log('Search response:', {
        success: response.success,
        count: response.data?.properties?.length || 0,
        total: response.data?.pagination?.totalProperties || 0
      });

      if (response.success) {
        setProperties(response.data.properties);
        setShowResults(true);
        if (query.trim()) {
          saveToRecentSearches(query);
        }
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Error searching properties:', error);
      setProperties([]);

      // Better error handling for rate limiting
      let errorMessage = 'Failed to search properties';
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = 'Too many searches. Please wait a moment and try again.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      setShowResults(true); // Show error message
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [activeTab, propertyType, bedrooms, priceRange, selectedState, selectedDistrict, selectedCity, saveToRecentSearches]);

  // Trigger search when location filters change (state/district/city)
  useEffect(() => {
    if (!locaInitialized) return;

    const hasLocationFilter = selectedState || selectedDistrict || selectedCity;

    // Only update suggestions if there are location filters, don't auto-search
    if (hasLocationFilter && searchQuery.trim()) {
      generateSuggestions(searchQuery);
    }
  }, [selectedState, selectedDistrict, selectedCity, locaInitialized, searchQuery]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Remove automatic search on tab change
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim()) {
      setShowResults(false);
      setProperties([]);
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      // Show suggestions as user types
      generateSuggestions(value);
      setShowSuggestions(true);
    }
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      searchProperties(searchQuery);
    }
  };

  // Format property price
  const formatPrice = (property: Property) => {
    return propertyService.formatPrice(property.price, property.listingType);
  };

  // Get property image
  const getPropertyImage = (property: Property) => {
    return propertyService.getPrimaryImage(property);
  };

  // Handle property click
  const handlePropertyClick = (propertyId: string) => {
    // Allow viewing property details without login
    navigate(`/property/${propertyId}`);
  };

  // Handle view all results
  const handleViewAllResults = () => {
    const searchParams = new URLSearchParams({
      search: searchQuery,
      listingType: getListingTypeForTab(activeTab)
    });

    if (activeTab === 'commercial') {
      searchParams.set('propertyType', 'commercial');
    }

    navigate(`/products?${searchParams.toString()}`);
  };

  // Click outside to close results and suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowSuggestions(false);
      }
    };

    if (showResults || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults, showSuggestions]);

  // Cleanup: Cancel any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <>
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform"
          style={{
            backgroundImage: `url(${backgroundImages[activeTab]})`,
          }}
        >
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-background/60 dark:via-background/40 dark:to-background/20" />
          <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-background/50 dark:via-transparent dark:to-transparent" />
        </div>

        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              {/* Dynamic badge from API */}
              {(dynamicContent[activeTab]?.badge?.isVisible !== false) && (
                <div className="inline-block mb-4">
                  <span className="bg-primary/20 dark:bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-primary/30 dark:border-primary/20 shadow-xl animate-pulse">
                    <Sparkles className="inline w-3 h-3 mr-1.5" />
                    {dynamicContent[activeTab]?.badge?.text || "India's Leading Property Platform"}
                  </span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white leading-tight">
                {dynamicContent[activeTab]?.title || "Find Your Perfect Property"}
              </h1>
              <p className="text-base sm:text-lg text-white mb-6 max-w-2xl mx-auto font-medium">
                {dynamicContent[activeTab]?.description || "Discover the best properties across India with our comprehensive platform"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Search Box */}
      <div className="relative -mt-20 z-30 px-4 sm:px-6 md:px-8">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div
              ref={searchContainerRef}
              className="bg-white/60 dark:bg-card/80 backdrop-blur-lg rounded-xl p-4 sm:p-6 shadow-2xl border border-white/20 dark:border-border/30 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex gap-2 mb-4 flex-col xs:flex-row">
                <Tabs defaultValue="buy" className="flex-1" onValueChange={handleTabChange}>
                  <TabsList className="grid w-full h-10 xs:h-12 p-1" style={{ gridTemplateColumns: `repeat(${listingTypeOptions.length + 1}, minmax(0, 1fr))` }}>
                    {listingTypeOptions.map((type) => (
                      <TabsTrigger
                        key={type.id || type._id}
                        value={type.value}
                        className="text-xs sm:text-sm font-semibold h-8 xs:h-10 rounded-lg transition-all duration-300 hover:scale-105"
                      >
                        {type.displayLabel || type.name}
                      </TabsTrigger>
                    ))}
                    <TabsTrigger
                      value="commercial"
                      className="text-xs sm:text-sm font-semibold h-8 xs:h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      Commercial
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Sell Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 xs:h-12 px-3 xs:px-4 text-xs sm:text-sm bg-white/80 dark:bg-card/80 backdrop-blur-md border border-white/20 dark:border-border/30 hover:bg-white/90 dark:hover:bg-card/90 transition-all duration-300 hover:scale-105"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Sell
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    {sellingOptionsToRender.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <DropdownMenuItem
                          key={option.id}
                          onClick={option.action}
                          className="flex items-start gap-3 p-3 cursor-pointer rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>


              <div className="flex flex-col gap-3">
                {/* Location Dropdowns Row */}
                {/*
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedState} onValueChange={(value) => setSelectedState(value)}>
                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedDistrict}
                    onValueChange={(value) => setSelectedDistrict(value)}
                    disabled={!selectedState}
                  >
                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm">
                      <SelectValue placeholder="All Districts" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedCity}
                    onValueChange={(value) => setSelectedCity(value)}
                    disabled={!selectedDistrict}
                  >
                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                */}

                {/* Search Input and Buttons Row */}
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                    <Input
                      placeholder="Search by locality, project, or landmark"
                      className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && !isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setProperties([]);
                          setShowResults(false);
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {suggestions.length > 0 && (
                          <div className="p-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-1">
                              Suggestions
                            </div>
                            {suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
                                onClick={() => {
                                  setSearchQuery(suggestion);
                                  setShowSuggestions(false);
                                  // Auto-search when suggestion is clicked
                                  searchProperties(suggestion);
                                }}
                              >
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {recentSearches.length > 0 && (
                          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Recent Searches
                            </div>
                            {recentSearches.map((search, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
                                onClick={() => {
                                  setSearchQuery(search);
                                  setShowSuggestions(false);
                                }}
                              >
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{search}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Filters */}
                  <Popover open={showFilters} onOpenChange={setShowFilters}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Filter className="mr-2 h-5 w-5" />
                        Filters
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Quick Filters</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPriceRange({});
                              setBedrooms(undefined);
                              setPropertyType("");
                              setSelectedState("");
                              setSelectedDistrict("");
                              setSelectedCity("");
                              setSelectedBudget("");
                            }}
                          >
                            Clear All
                          </Button>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Property Type</label>
                          <Select value={propertyType || "all"} onValueChange={(v) => setPropertyType(v === "all" ? "" : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Properties" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Properties</SelectItem>
                              {propertyTypeOptions.map((type) => (
                                <SelectItem key={type.id || type._id} value={type.value}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                          <Select value={bedrooms?.toString() ?? "any"} onValueChange={(value) => setBedrooms(value === "any" ? undefined : parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Any BHK" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any BHK</SelectItem>
                              {bedroomOptions.map((option) => (
                                <SelectItem key={option.id || option._id} value={option.value}>
                                  {option.displayLabel || option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Budget</label>
                          <Select
                            value={selectedBudget}
                            onValueChange={(value) => {
                              setSelectedBudget(value);
                              if (value === 'any-budget' || value === '') {
                                setPriceRange({});
                              } else {
                                const selectedOption = budgetOptions.find(b => (b.id || b._id) === value);
                                if (selectedOption) {
                                  setPriceRange({
                                    min: selectedOption.minValue,
                                    max: selectedOption.maxValue
                                  });
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Budget" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any-budget">Any Budget</SelectItem>
                              {budgetOptions.filter(b => b.value !== 'any-budget').map((option) => (
                                <SelectItem key={option.id || option._id} value={option.id || option._id}>
                                  {option.displayLabel || option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            setShowFilters(false);
                            if (searchQuery.trim()) {
                              searchProperties(searchQuery);
                            }
                          }}
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="lg"
                    className="h-10 sm:h-12 px-4 sm:px-8 text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                    onClick={handleSearchClick}
                    disabled={isLoading}
                  >
                    <Search className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Search Properties</span>
                    <span className="xs:hidden">Search</span>
                  </Button>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-[10px] xs:text-xs">10,000+ Properties</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full hidden xs:block"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="text-[10px] xs:text-xs">50,000+ Customers</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full hidden xs:block"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span className="text-[10px] xs:text-xs">Trusted Platform</span>
                </div>
              </div>

              {/* Search Results */}
              {showResults && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Search Results ({properties.length})
                    </h3>
                    {properties.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResults(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Hide Results
                      </Button>
                    )}
                  </div>

                  {error ? (
                    <div className="text-center py-8">
                      <div className="mx-auto h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Search Error
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {error}
                      </p>
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No properties found for "{searchQuery}"
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your search terms or browse all properties
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {properties.map((property) => (
                        <Card
                          key={property._id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
                          onClick={() => handlePropertyClick(property._id)}
                        >
                          <div className="relative">
                            <img
                              src={getPropertyImage(property)}
                              alt={property.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = DEFAULT_PROPERTY_IMAGE;
                              }}
                            />
                            <div className="absolute top-2 left-2">
                              <Badge
                                variant={property.listingType === 'sale' ? 'default' : 'secondary'}
                                className="bg-white/90 dark:bg-black/90 text-black dark:text-white"
                              >
                                {property.listingType === 'sale' ? 'For Sale' :
                                  property.listingType === 'rent' ? 'For Rent' : 'For Lease'}
                              </Badge>
                            </div>
                            <div className="absolute top-2 right-2">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black">
                                <Heart className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </div>
                            {property.featured && (
                              <div className="absolute bottom-2 left-2">
                                <Badge className="bg-yellow-500 text-yellow-900">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4">
                            <div className="mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                {property.title}
                              </h4>
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                <span className="truncate">
                                  {property.address.locationName ?
                                    `${property.address.locationName}, ${property.address.city}` :
                                    property.address.district
                                      ? `${property.address.city}, ${property.address.district}, ${property.address.state}`
                                      : `${property.address.city}, ${property.address.state}`
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(property)}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Eye className="h-3 w-3" />
                                <span>{property.views || 0}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                              {property.bedrooms > 0 && (
                                <div className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  <span>{property.bedrooms} Bed</span>
                                </div>
                              )}
                              {property.bathrooms > 0 && (
                                <div className="flex items-center gap-1">
                                  <Bath className="h-3 w-3" />
                                  <span>{property.bathrooms} Bath</span>
                                </div>
                              )}
                              {(property.area.builtUp || property.area.plot) && (
                                <div className="flex items-center gap-1">
                                  <Maximize className="h-3 w-3" />
                                  <span>
                                    {propertyService.formatArea(property.area)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePropertyClick(property._id);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {properties.length > 0 && !error && (
                    <div className="mt-6 text-center">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleViewAllResults}
                      >
                        View All Results (+)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Hero;