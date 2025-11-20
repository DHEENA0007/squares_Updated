import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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

const PropertySearch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [listingType, setListingType] = useState<string>("all");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [bedrooms, setBedrooms] = useState<string>("any");
  const [priceRange, setPriceRange] = useState<number[]>([0, 20000000]); // 0 to 2Cr
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Common amenities list
  const amenitiesList = [
    "Swimming Pool",
    "Gym/Fitness Center",
    "Parking",
    "Security",
    "Garden/Park",
    "Playground",
    "Clubhouse",
    "Power Backup",
    "Elevator",
    "WiFi",
    "CCTV Surveillance",
    "Water Supply",
    "Fire Safety"
  ];

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
  }, [searchQuery, listingType, propertyType, bedrooms, priceRange, selectedAmenities, currentPage]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page: currentPage,
        limit: 12,
      };

      if (searchQuery.trim()) filters.search = searchQuery;
      if (listingType !== "all") filters.listingType = listingType;
      if (propertyType !== "all") filters.propertyType = propertyType;
      if (bedrooms !== "any") filters.bedrooms = bedrooms;
      
      // Price filters
      if (priceRange[0] > 0) {
        filters.minPrice = priceRange[0];
      }
      
      if (priceRange[1] < 20000000) {
        filters.maxPrice = priceRange[1];
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
    setListingType("all");
    setPropertyType("all");
    setBedrooms("any");
    setPriceRange([0, 20000000]);
    setSelectedAmenities([]);
    setCurrentPage(1);
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
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Location, property name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Listing Type */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Listing Type</label>
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale">For Sale</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                      <SelectItem value="lease">For Lease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="pg">PG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bedrooms */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger>
                      <SelectValue placeholder="BHK" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any BHK</SelectItem>
                      <SelectItem value="1">1 BHK</SelectItem>
                      <SelectItem value="2">2 BHK</SelectItem>
                      <SelectItem value="3">3 BHK</SelectItem>
                      <SelectItem value="4">4+ BHK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      min={0}
                      max={20000000}
                      step={100000}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Min Price</span>
                        <span className="font-semibold text-primary">
                          {formatPrice(priceRange[0])}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-muted-foreground text-xs">Max Price</span>
                        <span className="font-semibold text-primary">
                          {formatPrice(priceRange[1])}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Amenities</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                    {amenitiesList.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={selectedAmenities.includes(amenity)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAmenities([...selectedAmenities, amenity]);
                            } else {
                              setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
                            }
                          }}
                        />
                        <label
                          htmlFor={amenity}
                          className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {amenity}
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
                            className={`h-4 w-4 ${
                              favorites.has(property._id) ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                        </Button>

                        {/* Listing Type Badge */}
                        <Badge className="absolute top-2 left-2 capitalize">
                          {property.listingType}
                        </Badge>
                      </div>

                      <CardContent className="p-4" onClick={() => navigate(`/customer/property/${property._id}`)}>
                        <div className="mb-2">
                          <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="line-clamp-1">
                              {property.address.city}, {property.address.state}
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
