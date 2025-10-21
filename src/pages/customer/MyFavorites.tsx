import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Heart, 
  X, 
  Share, 
  Phone, 
  MapPin, 
  Bed, 
  Bath, 
  Square,
  Search,
  Calendar,
  GitCompare,
  Filter,
  SortAsc
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

const MyFavorites = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterType, setFilterType] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);

  // Mock favorites data
  const favorites = [
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
      addedDate: "2024-10-15",
      priceDropped: true,
      newPrice: 11500000,
      status: "available",
      agent: {
        name: "Rahul Sharma",
        phone: "+91 98765 43210",
        verified: true
      }
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
      addedDate: "2024-10-12",
      priceDropped: false,
      status: "available",
      agent: {
        name: "Priya Patel",
        phone: "+91 87654 32109",
        verified: true
      }
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
      addedDate: "2024-10-10",
      priceDropped: false,
      status: "sold",
      agent: {
        name: "Amit Kumar",
        phone: "+91 76543 21098",
        verified: false
      }
    },
    {
      id: 4,
      title: "Premium Penthouse with Terrace",
      location: "Koramangala, Bangalore, Karnataka",
      price: 18000000,
      bedrooms: 3,
      bathrooms: 3,
      area: 2100,
      type: "apartment",
      images: ["/api/placeholder/400/300"],
      amenities: ["Terrace", "Swimming Pool", "Gym", "Concierge"],
      addedDate: "2024-10-08",
      priceDropped: false,
      status: "available",
      agent: {
        name: "Sunita Reddy",
        phone: "+91 65432 10987",
        verified: true
      }
    }
  ];

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(0)} Lac`;
    }
    return `₹${price}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const removeFavorite = (propertyId: number) => {
    // In real app, this would call API to remove from favorites
    console.log(`Removing property ${propertyId} from favorites`);
  };

  const toggleSelection = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const filteredFavorites = favorites.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || property.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500" />
            My Favorites
          </h1>
          <p className="text-muted-foreground mt-1">
            Properties you've saved for later
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/customer/compare" 
                className={selectedProperties.length >= 2 ? "" : "pointer-events-none opacity-50"}>
            <Button 
              variant="outline" 
              disabled={selectedProperties.length < 2}
              className="flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({selectedProperties.length})
            </Button>
          </Link>
          <Button variant="outline">
            <Share className="w-4 h-4 mr-2" />
            Share List
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search your favorites..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="house">House</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="area">Area: Large to Small</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{favorites.length}</p>
                <p className="text-sm text-muted-foreground">Total Favorites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <SortAsc className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {favorites.filter(f => f.priceDropped).length}
                </p>
                <p className="text-sm text-muted-foreground">Price Drops</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Filter className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {favorites.filter(f => f.status === "available").length}
                </p>
                <p className="text-sm text-muted-foreground">Still Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Favorites List */}
      <div className="space-y-4">
        {filteredFavorites.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No favorites found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType ? 
                  "No properties match your search criteria" : 
                  "Start adding properties to your favorites to see them here"
                }
              </p>
              <Link to="/customer/search">
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Search Properties
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredFavorites.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Property Image */}
                  <div className="md:w-80 h-64 md:h-48 bg-muted flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    
                    {/* Status badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {property.priceDropped && (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Price Drop!
                        </Badge>
                      )}
                      {property.status === "sold" && (
                        <Badge variant="destructive">Sold</Badge>
                      )}
                    </div>

                    {/* Selection checkbox */}
                    <div className="absolute top-2 right-2">
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleSelection(property.id)}
                        className="bg-white"
                      />
                    </div>
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
                          {property.priceDropped && property.newPrice ? 
                            formatPrice(property.newPrice) : 
                            formatPrice(property.price)
                          }
                        </div>
                        {property.priceDropped && property.newPrice && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(property.price)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatPrice(Math.round((property.newPrice || property.price) / property.area))} per sq.ft
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

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Added {formatDate(property.addedDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Agent: {property.agent.name}</span>
                        {property.agent.verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => removeFavorite(property.id)}>
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={property.status === "sold"}>
                          <Phone className="w-4 h-4 mr-1" />
                          Contact Agent
                        </Button>
                        <Button size="sm" disabled={property.status === "sold"}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions Footer */}
      {selectedProperties.length > 0 && (
        <Card className="fixed bottom-4 right-4 w-auto z-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedProperties.length} selected
              </span>
              <Button size="sm" variant="outline" onClick={() => setSelectedProperties([])}>
                Clear
              </Button>
              <Link to="/customer/compare">
                <Button size="sm" disabled={selectedProperties.length < 2}>
                  <GitCompare className="w-4 h-4 mr-1" />
                  Compare
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyFavorites;