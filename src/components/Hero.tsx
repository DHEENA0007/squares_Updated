import { Search, MapPin, Sparkles, Home, DollarSign, MapPinIcon, Bed, Bath, Maximize, Heart, Phone, Mail, Eye, Filter, X, Clock, TrendingUp, ChevronDown, Plus, Calculator, List, Settings } from "lucide-react";
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
import { useState, useEffect, useCallback, useRef } from "react";
import { propertyService, type Property, type PropertyFilters } from "@/services/propertyService";
import { DEFAULT_PROPERTY_IMAGE } from "@/utils/imageUtils";
import { useDebounce } from "../hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
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
    const [propertyType, setPropertyType] = useState<string | undefined>();
    
    // Increased debounce delay to reduce API calls and prevent rate limiting
    const debouncedSearchQuery = useDebounce(searchQuery, 800);

    // Selling options configuration
    const sellingOptions = [
      {
        id: "post-property",
        label: "Post Property",
        description: "List your property for sale or rent",
        icon: Plus,
        action: () => {
          // Check if user is authenticated as vendor, otherwise redirect to vendor login
          navigate("/vendor/add-property");
        }
      },
      {
        id: "property-valuation", 
        label: "Property Valuation",
        description: "Get your property valued by experts",
        icon: Calculator,
        action: () => {
          // For now, redirect to vendor properties or contact page
          navigate("/contact?service=valuation");
        }
      },
      {
        id: "quick-listing",
        label: "Quick Listing", 
        description: "Fast-track your property listing",
        icon: List,
        action: () => {
          navigate("/vendor/add-property?mode=quick");
        }
      },
      {
        id: "manage-properties",
        label: "Manage Properties",
        description: "View and manage your listings",
        icon: Settings,
        action: () => {
          navigate("/vendor/properties");
        }
      }
    ];
    
    // Mapping tabs to background images
    const backgroundImages: Record<string, string> = {
      buy: buyImage,
      rent: rentImage,
      lease: leaseImage,
      commercial: commercialImage,
    };

    // Map tabs to listing types
    const listingTypeMap: Record<string, string> = {
      buy: "sale",
      rent: "rent",
      lease: "lease",
      commercial: "sale", // Commercial can be both sale/rent, default to sale
    };

    // Dynamic content based on active tab
    const dynamicContent: Record<string, { title: string; description: string }> = {
      buy: {
        title: "Find Your Dream Home",
        description: "Discover the perfect property to purchase across India with our comprehensive platform"
      },
      rent: {
        title: "Discover Rental Properties",
        description: "Find comfortable and affordable rental homes across India's prime locations"
      },
      lease: {
        title: "Lease Properties with Ease",
        description: "Explore premium lease options for residential and commercial properties"
      },
      commercial: {
        title: "Commercial Real Estate Hub",
        description: "Find the ideal commercial space for your business across India's business districts"
      }
    };

    // Load recent searches from localStorage
    useEffect(() => {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    }, []);

    // Save search to recent searches
    const saveToRecentSearches = useCallback((query: string) => {
      if (!query.trim()) return;
      
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }, [recentSearches]);

    // Generate search suggestions
    const generateSuggestions = useCallback(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        return;
      }

      // Simple suggestion logic - can be enhanced with API call
      const locationSuggestions = [
        "Mumbai, Maharashtra",
        "Delhi, Delhi",
        "Bangalore, Karnataka",
        "Hyderabad, Telangana",
        "Chennai, Tamil Nadu",
        "Pune, Maharashtra",
        "Kolkata, West Bengal",
        "Gurgaon, Haryana",
        "Noida, Uttar Pradesh",
        "Ahmedabad, Gujarat"
      ].filter(location => 
        location.toLowerCase().includes(query.toLowerCase())
      );

      setSuggestions(locationSuggestions.slice(0, 5));
    }, []);

    // Search properties function with rate limiting and request cancellation
    const searchProperties = useCallback(async (query: string, additionalFilters: Partial<PropertyFilters> = {}) => {
      if (!query.trim() || query.length < 2) {
        setProperties([]);
        setShowResults(false);
        setError(null);
        return;
      }

      // Rate limiting: prevent searches within 1 second of each other
      const now = Date.now();
      const timeSinceLastSearch = now - lastSearchTimeRef.current;
      if (timeSinceLastSearch < 1000 && lastSearchRef.current === query) {
        return;
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Update tracking refs
      lastSearchRef.current = query;
      lastSearchTimeRef.current = now;

      setIsLoading(true);
      setError(null);
      setShowSuggestions(false);
      
      try {
        const filters: PropertyFilters = {
          search: query,
          listingType: listingTypeMap[activeTab] as 'sale' | 'rent' | 'lease',
          limit: 9, // Show more results
          page: 1,
          ...additionalFilters
        };

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
        
        if (response.success) {
          setProperties(response.data.properties);
          setShowResults(true);
          saveToRecentSearches(query);
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
    }, [activeTab, propertyType, bedrooms, priceRange, saveToRecentSearches]);

    // Effect to search when debounced query changes
    useEffect(() => {
      searchProperties(debouncedSearchQuery);
    }, [debouncedSearchQuery, searchProperties]);

    // Handle tab change
    const handleTabChange = (value: string) => {
      setActiveTab(value);
      if (searchQuery.trim()) {
        // Re-search with new tab filter but with a small delay to prevent rapid requests
        setTimeout(() => {
          searchProperties(searchQuery);
        }, 300);
      }
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
      if (!isAuthenticated) {
        // Redirect to login page for guest users
        navigate('/login', { 
          state: { 
            from: `/property/${propertyId}`,
            message: 'Please login to view property details' 
          }
        });
        return;
      }
      navigate(`/property/${propertyId}`);
    };

    // Handle view all results
    const handleViewAllResults = () => {
      const searchParams = new URLSearchParams({
        search: searchQuery,
        type: listingTypeMap[activeTab]
      });
      
      if (activeTab === 'commercial') {
        searchParams.set('propertyType', 'commercial');
      }
      
      navigate(`/properties?${searchParams.toString()}`);
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
              <div className="inline-block mb-4">
                <span className="bg-primary/20 dark:bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-primary/30 dark:border-primary/20 shadow-xl animate-pulse">
                  <Sparkles className="inline w-3 h-3 mr-1.5" />
                  India's Leading Property Platform
                </span>
              </div>
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
      <div className="relative -mt-20 z-30 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div 
              ref={searchContainerRef}
              className="bg-white/60 dark:bg-card/80 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-white/20 dark:border-border/30 transform hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex gap-2 mb-4">
                <Tabs defaultValue="buy" className="flex-1" onValueChange={handleTabChange}>
                  <TabsList className="grid w-full grid-cols-4 h-12 p-1">
                    <TabsTrigger 
                      value="buy" 
                      className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger 
                      value="rent" 
                      className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      Rent
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lease" 
                      className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      Lease
                    </TabsTrigger>
                    <TabsTrigger 
                      value="commercial" 
                      className="text-sm font-semibold h-10 rounded-lg transition-all duration-300 hover:scale-105"
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
                      className="h-12 px-4 bg-white/80 dark:bg-card/80 backdrop-blur-md border border-white/20 dark:border-border/30 hover:bg-white/90 dark:hover:bg-card/90 transition-all duration-300 hover:scale-105"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Sell
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    {sellingOptions.map((option) => {
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
              
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                  <Input 
                    placeholder="Search by locality, project, or landmark" 
                    className="pl-10 h-12 border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
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
                                searchProperties(search);
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
                      className="h-12 px-4 shadow-lg hover:shadow-xl transition-all duration-300"
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
                            setPropertyType(undefined);
                          }}
                        >
                          Clear All
                        </Button>
                      </div>
                      
                      {activeTab !== 'commercial' && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Property Type</label>
                          <Select value={propertyType} onValueChange={setPropertyType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="plot">Plot</SelectItem>
                              <SelectItem value="land">Land</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                        <Select value={bedrooms?.toString()} onValueChange={(value) => setBedrooms(value ? parseInt(value) : undefined)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 BHK</SelectItem>
                            <SelectItem value="2">2 BHK</SelectItem>
                            <SelectItem value="3">3 BHK</SelectItem>
                            <SelectItem value="4">4 BHK</SelectItem>
                            <SelectItem value="5">5+ BHK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Price Range</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={priceRange.min || ''}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value ? parseInt(e.target.value) : undefined }))}
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={priceRange.max || ''}
                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value ? parseInt(e.target.value) : undefined }))}
                          />
                        </div>
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
                  className="h-12 px-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  onClick={handleSearchClick}
                  disabled={!searchQuery.trim() || isLoading}
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search Properties
                </Button>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>10,000+ Properties</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>50,000+ Happy Customers</span>
                </div>
                <div className="w-0.5 h-0.5 bg-muted-foreground/50 rounded-full"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>Trusted Platform</span>
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
                                    `${property.address.city}, ${property.address.state}`
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