import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Search,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  Heart,
  Eye,
  Loader2,
  IndianRupee
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { propertyService, Property } from "@/services/propertyService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { favoriteService } from "@/services/favoriteService";
import { configurationService } from "@/services/configurationService";
import type { PropertyType as PropertyTypeConfig, FilterConfiguration, Amenity } from "@/types/configuration";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const LocationSearch = ({ value, onChange }: { value?: string, onChange: (value: string) => void }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(locaService.isReady());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    locaService.initialize().then(() => setIsReady(true));
  }, []);

  // Sync state with prop
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    // Don't trigger onChange here to prevent auto-refreshing properties

    if (newVal.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    // Small delay to allow UI update
    setTimeout(() => {
      const results = locaService.searchLocations(newVal);
      setSuggestions(results);
      setLoading(false);
      setShowSuggestions(true);
    }, 100);
  };

  const handleSelect = (suggestion: PincodeSuggestion) => {
    setQuery(suggestion.city);
    onChange(suggestion.city);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isReady ? "Search Location..." : "Loading..."}
          value={query}
          onChange={handleInputChange}
          className="pl-10"
          disabled={!isReady}
          onFocus={() => {
            if (query.length >= 2) setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onChange(query);
              setShowSuggestions(false);
            }
          }}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-y-auto bg-white dark:bg-slate-950">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.pincode}-${index}`}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.city}</div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.district}, {suggestion.state}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PropertySearch = () => {
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeConfig[]>([]);
  const [filterConfigurations, setFilterConfigurations] = useState<FilterConfiguration[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  // Filters - using dynamic state for all filter types
  const [listingType, setListingType] = useState<string>("all");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<number[]>([0, 20000000]); // 0 to 2Cr
  const [areaRange, setAreaRange] = useState<number[]>([0, 10000]); // 0 to 10000 sqft
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Dynamic filter state - will hold all filter values
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Get filters by filter type
  const getFiltersByType = (filterType: string) => {
    return filterConfigurations
      .filter(f => f.filterType === filterType && f.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  };

  // Get unique filter types
  const filterTypes = useMemo(() => {
    return Array.from(new Set(filterConfigurations.map(f => f.filterType)));
  }, [filterConfigurations]);

  const [priceLimits, setPriceLimits] = useState<{ min: number; max: number }>({ min: 0, max: 50000000 }); // Default fallback
  const [areaLimits, setAreaLimits] = useState<{ min: number; max: number }>({ min: 0, max: 10000 }); // Default fallback

  const [filterDependencies, setFilterDependencies] = useState<import('@/types/configuration').FilterDependency[]>([]);

  // Fetch property types and filter configurations on mount
  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        const [typesData, filtersData, dependenciesData] = await Promise.all([
          configurationService.getAllPropertyTypes(false),
          configurationService.getAllFilterConfigurations(false),
          configurationService.getFilterDependencies(),
        ]);
        setPropertyTypes(typesData);
        setFilterConfigurations(filtersData);
        setFilterDependencies(dependenciesData);

        // Calculate Price Limits from Budget filters
        const budgetFilters = filtersData.filter(f => f.filterType === 'budget');
        if (budgetFilters.length > 0) {
          const min = Math.min(...budgetFilters.map(f => f.minValue || 0));
          const max = Math.max(...budgetFilters.map(f => f.maxValue || 0));
          if (max > 0) {
            setPriceLimits({ min, max });
            setPriceRange([min, max]);
          }
        }

        // Calculate Area Limits from Area filters
        const areaFilters = filtersData.filter(f => f.filterType === 'area');
        if (areaFilters.length > 0) {
          const min = Math.min(...areaFilters.map(f => f.minValue || 0));
          const max = Math.max(...areaFilters.map(f => f.maxValue || 0));
          if (max > 0) {
            setAreaLimits({ min, max });
            setAreaRange([min, max]);
          }
        }

      } catch (error) {
        console.error('Error fetching configurations:', error);
      }
    };

    fetchConfigurations();
  }, []);

  // Helper to check if a filter should be shown
  const shouldShowFilter = (filterType: string) => {
    const dependency = filterDependencies.find(d => d.targetFilterType === filterType);
    if (!dependency) return true;

    let sourceValue;
    if (dependency.sourceFilterType === 'property_type') {
      sourceValue = propertyType;
    } else if (dependency.sourceFilterType === 'listing_type') {
      sourceValue = listingType;
    } else {
      sourceValue = dynamicFilters[dependency.sourceFilterType];
    }

    if (!sourceValue || sourceValue === 'all' || sourceValue === 'any') return false;
    return dependency.sourceFilterValues.includes(sourceValue);
  };

  // Fetch amenities based on selected property type
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        if (propertyType === 'all') {
          // If "All Properties" is selected, fetch all amenities
          const amenitiesData = await configurationService.getAllAmenities(false);
          setAmenities(amenitiesData);
        } else {
          // Fetch amenities for the specific property type
          const selectedPropertyType = propertyTypes.find(pt => pt.value === propertyType);
          if (selectedPropertyType) {
            const amenitiesData = await configurationService.getPropertyTypeAmenities(selectedPropertyType._id);
            setAmenities(amenitiesData);
          } else {
            setAmenities([]);
          }
        }
      } catch (error) {
        console.error('Error fetching amenities:', error);
        setAmenities([]);
      }
    };

    if (propertyTypes.length > 0) {
      fetchAmenities();
    }
  }, [propertyType, propertyTypes]);

  // Initialize search query and filters from URL params
  useEffect(() => {
    const queryParam = searchParams.get('q');
    const listingTypeParam = searchParams.get('listingType');
    const propertyTypeParam = searchParams.get('propertyType');

    if (queryParam) {
      setSearchQuery(queryParam);
    }

    if (listingTypeParam && listingTypeParam !== 'all') {
      setListingType(listingTypeParam);
    }

    if (propertyTypeParam && propertyTypeParam !== 'all') {
      setPropertyType(propertyTypeParam);
    }

    setCurrentPage(1);
  }, [searchParams]);

  // Load properties
  useEffect(() => {
    loadProperties();
  }, [searchQuery, locationQuery, listingType, propertyType, priceRange, areaRange, selectedAmenities, dynamicFilters, currentPage]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page: currentPage,
        limit: 12,
      };

      if (searchQuery.trim()) filters.search = searchQuery;
      if (locationQuery.trim()) filters.location = locationQuery;
      if (listingType !== "all") filters.listingType = listingType;
      if (propertyType !== "all") filters.propertyType = propertyType;

      // Add dynamic filters
      Object.entries(dynamicFilters).forEach(([key, value]) => {
        if (value && value !== "any") {
          filters[key] = value;
        }
      });

      // Price filters
      if (priceRange[0] > priceLimits.min) {
        filters.minPrice = priceRange[0];
      }

      if (priceRange[1] < priceLimits.max) {
        filters.maxPrice = priceRange[1];
      }

      // Area filters
      if (areaRange[0] > areaLimits.min) {
        filters.minArea = areaRange[0];
      }

      if (areaRange[1] < areaLimits.max) {
        filters.maxArea = areaRange[1];
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        filters.amenities = selectedAmenities;
      }

      const response = await propertyService.getProperties(filters);

      if (response.success) {
        setProperties(response.data.properties);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load favorites
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await favoriteService.getFavorites();
      if (response.success) {
        const favoriteIds = new Set(response.data.favorites.map((fav) => fav.property?._id).filter(Boolean) as string[]);
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    try {
      if (favorites.has(propertyId)) {
        await favoriteService.removeFromFavorites(propertyId);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
        toast({
          title: "Removed from favorites",
          description: "Property removed from your favorites",
        });
      } else {
        await favoriteService.addToFavorites(propertyId);
        setFavorites(prev => new Set(prev).add(propertyId));
        toast({
          title: "Added to favorites",
          description: "Property added to your favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setListingType("all");
    setPropertyType("all");
    setPriceRange([priceLimits.min, priceLimits.max]);
    setAreaRange([areaLimits.min, areaLimits.max]);
    setSelectedAmenities([]);
    setDynamicFilters({});
    setCurrentPage(1);
  };

  const getListingTypeLabel = (value: string) => {
    const config = filterConfigurations.find(c => c.value === value && (c.filterType === 'listing_type' || c.filterType === 'listingType'));
    return config ? (config.displayLabel || config.name) : value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L`;
    }
    return `₹${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Search Properties</h1>
          <p className="text-muted-foreground">Find your dream property from our verified listings</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className="lg:w-80 flex-shrink-0">
            <Card className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>

                {/* Location Search Bar */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <LocationSearch
                    value={locationQuery}
                    onChange={setLocationQuery}
                  />
                </div>

                {/* General Search Bar */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Keyword Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Property name, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Listing Type - Dynamic from Admin Configuration */}
                {getFiltersByType('listing_type').length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Listing Type</label>
                    <Select value={listingType} onValueChange={setListingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="all">All Types</SelectItem>
                        {getFiltersByType('listing_type').map((filter) => (
                          <SelectItem key={filter._id} value={filter.value}>
                            {filter.displayLabel?.trim() || filter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Property Type */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <Select value={propertyType} onValueChange={(value) => {
                    setPropertyType(value);
                    // Reset dynamic filters when property type changes
                    setDynamicFilters({});
                    setSelectedAmenities([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Property" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="all">All Properties</SelectItem>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Filters from Admin Configuration */}
                {filterTypes
                  .filter(type => !['listing_type', 'budget', 'area', 'property_type'].includes(type)) // Exclude handled types
                  .filter(type => shouldShowFilter(type)) // Check dependencies
                  .map((filterType) => {
                    const options = filterConfigurations
                      .filter(f => f.filterType === filterType)
                      .sort((a, b) => a.displayOrder - b.displayOrder);

                    if (options.length === 0) return null;

                    const label = filterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div key={filterType} className="space-y-2">
                        <Label>{label}</Label>
                        <Select
                          value={dynamicFilters[filterType] || 'any'}
                          onValueChange={(value) => {
                            setDynamicFilters(prev => ({
                              ...prev,
                              [filterType]: value
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any {label}</SelectItem>
                            {options.map((option) => (
                              <SelectItem key={option.id || option._id} value={option.value}>
                                {option.displayLabel || option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                {/* Price Range */}
                {priceLimits.max > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Min Price</label>
                        <Input
                          type="number"
                          defaultValue={priceRange[0]}
                          onBlur={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setPriceRange([Number(e.currentTarget.value), priceRange[1]]);
                            }
                          }}
                          min={priceLimits.min}
                          max={priceLimits.max}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(priceRange[0])}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Max Price</label>
                        <Input
                          type="number"
                          defaultValue={priceRange[1]}
                          onBlur={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setPriceRange([priceRange[0], Number(e.currentTarget.value)]);
                            }
                          }}
                          min={priceLimits.min}
                          max={priceLimits.max}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                          {formatPrice(priceRange[1])}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Amenities - Dynamic from Admin Configuration */}
                {amenities.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">Amenities</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                      {amenities.map((amenity) => (
                        <div key={amenity._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={amenity._id}
                            checked={selectedAmenities.includes(amenity.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAmenities([...selectedAmenities, amenity.name]);
                              } else {
                                setSelectedAmenities(selectedAmenities.filter(a => a !== amenity.name));
                              }
                            }}
                          />
                          <label
                            htmlFor={amenity._id}
                            className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {amenity.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedAmenities.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {selectedAmenities.length} selected
                      </div>
                    )}
                  </div>
                )}

                {/* Reset Button */}
                <Button variant="outline" onClick={resetFilters} className="w-full">
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Property Grid */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Available Properties</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading..." : `${properties.length} properties found`}
              </p>
            </div>

            {/* Property Grid */}
            {/* Property Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : properties.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search criteria
                  </p>
                  <Button onClick={resetFilters}>Clear Filters</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <Card
                      key={property._id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div
                        className="relative h-48 bg-muted"
                        onClick={() => navigate(`/property/${property._id}`)}
                      >
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-property.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Favorite Button */}
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(property._id);
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${favorites.has(property._id) ? "fill-red-500 text-red-500" : ""
                              }`}
                          />
                        </Button>
                      </div>

                      <CardContent className="p-4" onClick={() => navigate(`/customer/property/${property._id}`)}>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-100 capitalize">
                            {getListingTypeLabel(property.listingType).toLowerCase().startsWith('for ')
                              ? getListingTypeLabel(property.listingType)
                              : `For ${getListingTypeLabel(property.listingType)}`}
                          </Badge>
                          <Badge variant="outline" className="border-gray-200 text-gray-600 capitalize">
                            {property.type}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="line-clamp-1">
                              {property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}
                            </span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-2xl font-bold text-primary">
                            {formatPrice(property.price)}
                          </div>
                          {property.listingType === 'rent' && (
                            <span className="text-xs text-muted-foreground">/month</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {property.bedrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              <span>{property.bedrooms}</span>
                            </div>
                          )}
                          {property.bathrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              <span>{property.bathrooms}</span>
                            </div>
                          )}
                          {property.area?.builtUp && (
                            <div className="flex items-center gap-1">
                              <Square className="h-4 w-4" />
                              <span>{property.area.builtUp} sqft</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <Badge variant="outline" className="capitalize">
                            {property.type}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySearch;
