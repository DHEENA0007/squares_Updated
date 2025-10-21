import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitCompare, 
  X, 
  Plus,
  MapPin, 
  Bed, 
  Bath, 
  Square,
  Calendar,
  Phone,
  Heart,
  Share,
  Check,
  Minus
} from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

const PropertyComparison = () => {
  const [searchParams] = useSearchParams();
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);

  // Mock property data - in real app, this would come from API
  const allProperties = [
    {
      id: 1,
      title: "Luxury 3BHK Apartment in Powai",
      location: "Powai, Mumbai, Maharashtra",
      price: 12000000,
      bedrooms: 3,
      bathrooms: 2,
      area: 1450,
      type: "apartment",
      yearBuilt: 2020,
      furnishing: "Semi-Furnished",
      parking: 2,
      floor: "12/25",
      facing: "North-East",
      amenities: ["Swimming Pool", "Gym/Fitness Center", "Parking", "Security", "Garden/Park", "WiFi"],
      nearbyPlaces: {
        "Metro Station": "0.5 km",
        "School": "0.8 km", 
        "Hospital": "1.2 km",
        "Shopping Mall": "0.3 km"
      },
      agent: {
        name: "Rahul Sharma",
        phone: "+91 98765 43210",
        verified: true
      },
      images: ["/api/placeholder/400/300"],
      listedDate: "2024-10-15",
      pricePerSqft: Math.round(12000000 / 1450),
      monthlyMaintenance: 3500,
      possession: "Ready to Move"
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
      yearBuilt: 2019,
      furnishing: "Unfurnished",
      parking: 3,
      floor: "Ground + 2",
      facing: "South",
      amenities: ["Garden/Park", "Parking", "Security", "Power Backup", "Swimming Pool"],
      nearbyPlaces: {
        "Tech Park": "2.0 km",
        "International School": "1.5 km",
        "Hospital": "3.0 km",
        "Airport": "15 km"
      },
      agent: {
        name: "Priya Patel",
        phone: "+91 87654 32109",
        verified: true
      },
      images: ["/api/placeholder/400/300"],
      listedDate: "2024-10-12",
      pricePerSqft: Math.round(25000000 / 2800),
      monthlyMaintenance: 8000,
      possession: "Ready to Move"
    },
    {
      id: 3,
      title: "Premium Penthouse with Terrace",
      location: "Koramangala, Bangalore, Karnataka",
      price: 18000000,
      bedrooms: 3,
      bathrooms: 3,
      area: 2100,
      type: "apartment",
      yearBuilt: 2021,
      furnishing: "Fully Furnished",
      parking: 2,
      floor: "15/15",
      facing: "West",
      amenities: ["Terrace", "Swimming Pool", "Gym", "Concierge", "Security", "Elevator", "WiFi"],
      nearbyPlaces: {
        "Metro Station": "1.0 km",
        "IT Hub": "0.5 km",
        "Restaurants": "0.2 km",
        "Park": "0.3 km"
      },
      agent: {
        name: "Sunita Reddy",
        phone: "+91 65432 10987",
        verified: true
      },
      images: ["/api/placeholder/400/300"],
      listedDate: "2024-10-08",
      pricePerSqft: Math.round(18000000 / 2100),
      monthlyMaintenance: 5500,
      possession: "Ready to Move"
    }
  ];

  useEffect(() => {
    // Get property IDs from URL params if coming from favorites
    const ids = searchParams.get('properties')?.split(',').map(Number) || [];
    setSelectedProperties(ids.slice(0, 3)); // Max 3 properties for comparison
  }, [searchParams]);

  const comparisonProperties = allProperties.filter(p => selectedProperties.includes(p.id));

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(0)} Lac`;
    }
    return `₹${price}`;
  };

  const removeProperty = (propertyId: number) => {
    setSelectedProperties(prev => prev.filter(id => id !== propertyId));
  };

  const addProperty = () => {
    // In real app, this would open a modal to select from favorites or search
    console.log("Add property to comparison");
  };

  const getComparisonValue = (value: any, isNumeric = false) => {
    if (!value) return { display: "-", color: "text-muted-foreground" };
    
    if (isNumeric && comparisonProperties.length > 1) {
      const values = comparisonProperties.map(p => {
        switch (typeof value) {
          case 'number': return value;
          default: return 0;
        }
      });
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      if (value === max && value !== min) {
        return { display: value, color: "text-green-600", isBest: true };
      } else if (value === min && value !== max) {
        return { display: value, color: "text-red-600", isWorst: true };
      }
    }
    
    return { display: value, color: "text-foreground" };
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitCompare className="w-8 h-8 text-primary" />
            Compare Properties
          </h1>
          <p className="text-muted-foreground mt-1">
            Side-by-side comparison of your selected properties
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/customer/favorites">
            <Button variant="outline">
              <Heart className="w-4 h-4 mr-2" />
              Back to Favorites
            </Button>
          </Link>
          <Button variant="outline">
            <Share className="w-4 h-4 mr-2" />
            Share Comparison
          </Button>
        </div>
      </div>

      {comparisonProperties.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties to compare</h3>
            <p className="text-muted-foreground mb-4">
              Add properties from your favorites or search results to start comparing
            </p>
            <div className="flex gap-2 justify-center">
              <Link to="/customer/favorites">
                <Button>
                  <Heart className="w-4 h-4 mr-2" />
                  View Favorites
                </Button>
              </Link>
              <Link to="/customer/search">
                <Button variant="outline">
                  Search Properties
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Property Cards Overview */}
          <div className={`grid gap-4 ${comparisonProperties.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : comparisonProperties.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {comparisonProperties.map((property) => (
              <Card key={property.id} className="relative">
                <button
                  onClick={() => removeProperty(property.id)}
                  className="absolute top-2 right-2 z-10 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted flex items-center justify-center mb-4 rounded-lg">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{property.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>
                  
                  <div className="text-lg font-bold text-primary mb-2">
                    {formatPrice(property.price)}
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{property.bedrooms} BHK</span>
                    <span>{property.area} sq.ft</span>
                    <span>₹{property.pricePerSqft}/sq.ft</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {comparisonProperties.length < 3 && (
              <Card className="border-dashed border-2">
                <CardContent className="p-4 h-full flex items-center justify-center">
                  <Button 
                    variant="ghost" 
                    className="h-full w-full flex flex-col gap-2"
                    onClick={addProperty}
                  >
                    <Plus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add Property</span>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 w-48">Feature</th>
                      {comparisonProperties.map((property) => (
                        <th key={property.id} className="text-left p-4 min-w-64">
                          <div className="truncate">{property.title}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Price</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.price, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {formatPrice(property.price)}
                              {comparison.isBest && <Badge variant="default" className="text-xs">Expensive</Badge>}
                              {comparison.isWorst && <Badge variant="secondary" className="text-xs">Affordable</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Price per sq.ft */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Price per sq.ft</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.pricePerSqft, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              ₹{property.pricePerSqft}
                              {comparison.isBest && <Badge variant="default" className="text-xs">Highest</Badge>}
                              {comparison.isWorst && <Badge variant="secondary" className="text-xs">Best Value</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Area */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Area</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.area, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {property.area} sq.ft
                              {comparison.isBest && <Badge variant="default" className="text-xs">Largest</Badge>}
                              {comparison.isWorst && <Badge variant="secondary" className="text-xs">Smallest</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Bedrooms */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Bedrooms</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          {property.bedrooms} BHK
                        </td>
                      ))}
                    </tr>

                    {/* Bathrooms */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Bathrooms</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          {property.bathrooms}
                        </td>
                      ))}
                    </tr>

                    {/* Floor */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Floor</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          {property.floor}
                        </td>
                      ))}
                    </tr>

                    {/* Facing */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Facing</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          {property.facing}
                        </td>
                      ))}
                    </tr>

                    {/* Year Built */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Year Built</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.yearBuilt, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {property.yearBuilt}
                              {comparison.isBest && <Badge variant="default" className="text-xs">Newest</Badge>}
                              {comparison.isWorst && <Badge variant="secondary" className="text-xs">Oldest</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Furnishing */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Furnishing</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          <Badge variant="outline">{property.furnishing}</Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Parking */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Parking Spaces</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.parking, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {property.parking}
                              {comparison.isBest && <Badge variant="default" className="text-xs">Most</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Monthly Maintenance */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Monthly Maintenance</td>
                      {comparisonProperties.map((property) => {
                        const comparison = getComparisonValue(property.monthlyMaintenance, true);
                        return (
                          <td key={property.id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              ₹{property.monthlyMaintenance}
                              {comparison.isBest && <Badge variant="default" className="text-xs">Highest</Badge>}
                              {comparison.isWorst && <Badge variant="secondary" className="text-xs">Lowest</Badge>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Possession */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Possession</td>
                      {comparisonProperties.map((property) => (
                        <td key={property.id} className="p-4">
                          <Badge variant="default" className="bg-green-500">
                            {property.possession}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Amenities Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Get all unique amenities */}
                {Array.from(new Set(comparisonProperties.flatMap(p => p.amenities))).map((amenity) => (
                  <div key={amenity} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">{amenity}</span>
                    <div className="flex gap-4">
                      {comparisonProperties.map((property) => (
                        <div key={property.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 truncate">
                            {property.title.slice(0, 15)}...
                          </span>
                          {property.amenities.includes(amenity) ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Minus className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nearby Places */}
          <Card>
            <CardHeader>
              <CardTitle>Nearby Places</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Array.from(new Set(comparisonProperties.flatMap(p => Object.keys(p.nearbyPlaces)))).map((place) => (
                  <div key={place} className="space-y-2">
                    <h4 className="font-medium">{place}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {comparisonProperties.map((property) => (
                        <div key={property.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm font-medium mb-1">{property.title.slice(0, 20)}...</div>
                          <div className="text-sm text-muted-foreground">
                            {property.nearbyPlaces[place] || "Not available"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {comparisonProperties.map((property) => (
              <Card key={property.id} className="p-4">
                <div className="text-center space-y-2">
                  <h4 className="font-medium text-sm">{property.title.slice(0, 25)}...</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyComparison;