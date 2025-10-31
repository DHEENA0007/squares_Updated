import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  MapPin, 
  Filter,
  Map,
  List,
  Heart,
  Share,
  Phone,
  Eye,
  Bed,
  Bath,
  Square,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useRealtime, usePropertyRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { propertyService, Property, PropertyFilters } from "@/services/propertyService";
import { favoriteService } from "@/services/favoriteService";
import { toast } from "@/hooks/use-toast";

const PropertySearch = () => {
  const { isConnected } = useRealtime();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [propertyType, setPropertyType] = useState("all");
  const [bedrooms, setBedrooms] = useState("any");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState("relevance");
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Amenities filter
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  const amenities = [
    "Swimming Pool",
    "Gym/Fitness Center", 
    "Parking",
    "Security",
    "Garden/Park",
    "Elevator",
    "Power Backup",
    "WiFi",
    "Club House",
    "Children's Play Area"
  ];

  // Use property realtime with refresh callback
  usePropertyRealtime({
    refreshProperties: () => {
      console.log("Properties updated via realtime, refreshing...");
      loadProperties();
    }
  });

  // Build filters object for API
  const buildFilters = useCallback((): PropertyFilters => {
    return {
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      propertyType: propertyType !== "all" ? propertyType : undefined,
      bedrooms: bedrooms !== "any" ? parseInt(bedrooms) : undefined,
      location: selectedCity !== "all" ? selectedCity : undefined,
      search: searchQuery || undefined
    };
  }, [priceRange, propertyType, bedrooms, selectedCity, searchQuery]);
    
  // Load properties from API
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const filters = buildFilters();
      const response = await propertyService.getProperties(filters);
      
      if (response.success) {
        setProperties(response.data.properties);
        setFilteredProperties(response.data.properties);
      } else {
        throw new Error('Failed to fetch properties');
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  // Handle real-time property updates
  useRealtimeEvent('property_updated', (data) => {
    setProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, ...data.updates } : p
    ));
    setFilteredProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, ...data.updates } : p
    ));
  });

  // Handle property favorites via realtime  
  useRealtimeEvent('property_favorited', (data) => {
    // Note: Property interface may not have favoriteCount field, 
    // but we update it for local state tracking
    setProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, favoriteCount: ((p as any).favoriteCount || 0) + 1 } : p
    ));
    setFilteredProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, favoriteCount: ((p as any).favoriteCount || 0) + 1 } : p
    ));
  });

  // Handle property views via realtime
  useRealtimeEvent('property_viewed', (data) => {
    setProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, views: (p.views || 0) + 1 } : p
    ));
    setFilteredProperties(prev => prev.map(p => 
      p._id === data.propertyId ? { ...p, views: (p.views || 0) + 1 } : p
    ));
  });

  // Initial load and reloading on filter changes
  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Client-side filtering and search
  const clientFilteredProperties = useMemo(() => {
    return filteredProperties.filter(property => {
      const location = `${property.address?.city || ''} ${property.address?.state || ''}`;
      const matchesSearch = property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           location.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [searchQuery, filteredProperties]);

  // Property interaction handlers
  const handlePropertyView = async (propertyId: string) => {
    // Property viewing is typically handled by navigation to the property detail page
    // For now, we just simulate the view increment via realtime
    console.log(`Viewing property: ${propertyId}`);
  };

  const handlePropertyFavorite = async (propertyId: string) => {
    try {
      await favoriteService.addToFavorites(propertyId);
      toast({
        title: "Success",
        description: "Property added to favorites",
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast({
        title: "Error",
        description: "Failed to add to favorites",
        variant: "destructive",
      });
    }
  };

  const handlePropertyContact = (property: Property) => {
    // This would typically open a contact modal or navigate to contact page
    toast({
      title: "Contact Information",
      description: `Contact details for ${property.title} would be shown here`,
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(0)} Lac`;
    }
    return `₹${price}`;
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Location */}
      <div>
        <label className="text-sm font-medium mb-2 block">City</label>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger>
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            <SelectItem value="Mumbai">Mumbai</SelectItem>
            <SelectItem value="Bangalore">Bangalore</SelectItem>
            <SelectItem value="Delhi">Delhi</SelectItem>
            <SelectItem value="Pune">Pune</SelectItem>
            <SelectItem value="Chennai">Chennai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
        </label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={50000000}
          min={0}
          step={100000}
          className="mt-2"
        />
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium mb-2 block">Property Type</label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="office">Office Space</SelectItem>
            <SelectItem value="pg">PG (Paying Guest)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="text-sm font-medium mb-2 block">Bedrooms</label>
        <Select value={bedrooms} onValueChange={setBedrooms}>
          <SelectTrigger>
            <SelectValue placeholder="Select bedrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1 BHK</SelectItem>
            <SelectItem value="2">2 BHK</SelectItem>
            <SelectItem value="3">3 BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amenities */}
      <div>
        <label className="text-sm font-medium mb-3 block">Amenities</label>
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={amenity}
                checked={selectedAmenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <label
                htmlFor={amenity}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {amenity}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => {
          setSearchQuery("");
          setSelectedCity("");
          setPriceRange([0, 10000000]);
          setPropertyType("");
          setBedrooms("");
          setSelectedAmenities([]);
        }}
      >
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Search Properties</h1>
          <p className="text-muted-foreground mt-1">
            Find your perfect home from thousands of listings
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by location, property name, or keywords..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="sm:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Properties</SheetTitle>
                  <SheetDescription>
                    Refine your search with these filters
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar - Desktop */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FilterContent />
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Realtime Status */}
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Real-time property updates active' : 'Offline mode'}
              </span>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading properties...
              </div>
            )}
          </div>

          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {filteredProperties.length} properties found
              </p>
              {(selectedAmenities.length > 0 || selectedCity || propertyType || bedrooms) && (
                <div className="flex flex-wrap gap-2">
                  {selectedCity && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCity}
                      <button className="ml-1" onClick={() => setSelectedCity("")}>×</button>
                    </Badge>
                  )}
                  {propertyType && (
                    <Badge variant="secondary" className="text-xs">
                      {propertyType}
                      <button className="ml-1" onClick={() => setPropertyType("")}>×</button>
                    </Badge>
                  )}
                  {bedrooms && (
                    <Badge variant="secondary" className="text-xs">
                      {bedrooms} BHK
                      <button className="ml-1" onClick={() => setBedrooms("")}>×</button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="area">Area: Large to Small</SelectItem>
                </SelectContent>
              </Select>
              
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "map")}>
                <TabsList>
                  <TabsTrigger value="list">
                    <List className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <Map className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Results Content */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "map")}>
            <TabsContent value="list" className="space-y-4">
              {clientFilteredProperties.map((property) => (
                <Card key={property._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Property Image */}
                      <div className="md:w-80 h-64 md:h-48 bg-muted flex items-center justify-center relative overflow-hidden">
                        {property.images && property.images.length > 0 ? (
                          <img 
                            src={property.images.find(img => img.isPrimary)?.url || property.images[0]?.url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        {property.featured && (
                          <Badge className="absolute top-2 left-2">Featured</Badge>
                        )}
                        {property.verified && (
                          <Badge variant="secondary" className="absolute top-2 right-2">
                            Verified
                          </Badge>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
                            <div className="flex items-center text-muted-foreground mb-2">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span className="text-sm">
                                {property.address?.city}, {property.address?.state}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Bed className="w-4 h-4" />
                                <span>{property.bedrooms} BHK</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="w-4 h-4" />
                                <span>{property.bathrooms} Bath</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="w-4 h-4" />
                                <span>{property.area?.builtUp || property.area?.carpet || property.area?.plot || 0} {property.area?.unit || 'sqft'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatPrice(property.price)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {property.area?.builtUp && formatPrice(Math.round(property.price / property.area.builtUp))} per {property.area?.unit || 'sqft'}
                            </div>
                          </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {property.amenities.slice(0, 3).map((amenity) => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {property.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{property.amenities.length - 3} more
                            </Badge>
                          )}
                        </div>

                        {/* Actions and Meta */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{property.views || 0} views</span>
                            </div>
                            <span>•</span>
                            <span>{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'Recently listed'}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePropertyFavorite(property._id)}
                            >
                              <Heart className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePropertyContact(property)}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handlePropertyView(property._id)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="map">
              <Card>
                <CardContent className="p-0">
                  <div className="h-96 bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Map className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Map view coming soon</p>
                      <p className="text-sm text-muted-foreground">
                        Interactive map with property markers will be displayed here
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PropertySearch;