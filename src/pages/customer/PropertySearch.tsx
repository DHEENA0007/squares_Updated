import { useState, useMemo } from "react";
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
  SlidersHorizontal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const PropertySearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState("relevance");
  
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

  // Mock property data - in real app, this would come from API
  const properties = [
    {
      id: 1,
      title: "Luxury 3BHK Apartment in Powai",
      location: "Powai, Mumbai, Maharashtra",
      price: 12000000,
      originalPrice: 13500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 1450,
      type: "apartment",
      images: ["/api/placeholder/400/300"],
      amenities: ["Swimming Pool", "Gym/Fitness Center", "Parking", "Security"],
      rating: 4.5,
      views: 234,
      listedDate: "2 days ago",
      featured: true,
      verified: true,
    },
    {
      id: 2,
      title: "Modern Villa with Private Garden",
      location: "Whitefield, Bangalore, Karnataka",
      price: 25000000,
      bedrooms: 4,
      bathrooms: 3,
      area: 2800,
      type: "villa",
      images: ["/api/placeholder/400/300"],
      amenities: ["Garden/Park", "Parking", "Security", "Power Backup"],
      rating: 4.8,
      views: 156,
      listedDate: "1 week ago",
      featured: false,
      verified: true,
    },
    {
      id: 3,
      title: "Spacious 2BHK with City View",
      location: "Bandra West, Mumbai, Maharashtra",
      price: 8500000,
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      type: "apartment",
      images: ["/api/placeholder/400/300"],
      amenities: ["Elevator", "Parking", "WiFi", "Security"],
      rating: 4.3,
      views: 89,
      listedDate: "3 days ago",
      featured: false,
      verified: false,
    },
  ];

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           property.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = !selectedCity || property.location.includes(selectedCity);
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
      const matchesType = !propertyType || property.type === propertyType;
      const matchesBedrooms = !bedrooms || property.bedrooms.toString() === bedrooms;
      const matchesAmenities = selectedAmenities.length === 0 || 
                              selectedAmenities.every(amenity => property.amenities.includes(amenity));
      
      return matchesSearch && matchesCity && matchesPrice && matchesType && matchesBedrooms && matchesAmenities;
    });
  }, [searchQuery, selectedCity, priceRange, propertyType, bedrooms, selectedAmenities]);

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
            <SelectItem value="">All Cities</SelectItem>
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
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
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
            <SelectItem value="">Any</SelectItem>
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
              {filteredProperties.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Property Image */}
                      <div className="md:w-80 h-64 md:h-48 bg-muted flex items-center justify-center relative">
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
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
                              <span className="text-sm">{property.location}</span>
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
                                <span>{property.area} sq.ft</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatPrice(property.price)}
                            </div>
                            {property.originalPrice && property.originalPrice > property.price && (
                              <div className="text-sm text-muted-foreground line-through">
                                {formatPrice(property.originalPrice)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatPrice(Math.round(property.price / property.area))} per sq.ft
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
                              <span>{property.views} views</span>
                            </div>
                            <span>•</span>
                            <span>{property.listedDate}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Heart className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Phone className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                            <Button size="sm">
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