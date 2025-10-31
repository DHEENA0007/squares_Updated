import { useState, useEffect, useCallback } from "react";
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
  Minus,
  RefreshCw,
  Home
} from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { useRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { propertyService, Property } from "@/services/propertyService";
import { toast } from "@/hooks/use-toast";

const PropertyComparison = () => {
  const { isConnected, lastEvent } = useRealtime();
  const [searchParams] = useSearchParams();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load properties from API
  const loadProperties = useCallback(async (propertyIds: string[]) => {
    if (propertyIds.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const propertyPromises = propertyIds.map(id => 
        propertyService.getProperty(id).catch(error => {
          console.error(`Failed to load property ${id}:`, error);
          return null;
        })
      );

      const results = await Promise.all(propertyPromises);
      const loadedProperties = results
        .filter((result): result is NonNullable<typeof result> => result !== null && result.success)
        .map(result => result.data.property);

      setProperties(loadedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties for comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadProperties(selectedProperties);
    setRefreshing(false);
  }, [loadProperties, selectedProperties]);

  useEffect(() => {
    // Get property IDs from URL params if coming from favorites
    const ids = searchParams.get('properties')?.split(',').filter(Boolean) || [];
    const limitedIds = ids.slice(0, 3); // Max 3 properties for comparison
    setSelectedProperties(limitedIds);
    loadProperties(limitedIds);
  }, [searchParams, loadProperties]);

  // Listen to realtime events for property updates
  useRealtimeEvent('property_updated', (data) => {
    if (data.propertyId && selectedProperties.includes(data.propertyId)) {
      console.log("Property updated via realtime, refreshing comparison");
      refreshData();
    }
  });

  useRealtimeEvent('property_favorited', (data) => {
    if (data.propertyId && selectedProperties.includes(data.propertyId)) {
      // Update property in the list if it's favorited/unfavorited
      setProperties(prev => prev.map(prop => 
        prop._id === data.propertyId 
          ? { ...prop, isFavorited: data.action === 'add' }
          : prop
      ));
    }
  });

  const formatPrice = (price: number, listingType: Property['listingType']) => {
    if (listingType === 'rent') {
      return `₹${price.toLocaleString('en-IN')}/month`;
    } else if (listingType === 'lease') {
      return `₹${price.toLocaleString('en-IN')}/year`;
    } else {
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(1)} Lac`;
      } else {
        return `₹${price.toLocaleString('en-IN')}`;
      }
    }
  };

  const formatArea = (area: Property['area']) => {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'N/A';
  };

  const calculatePricePerSqft = (property: Property) => {
    const areaValue = property.area.builtUp || property.area.carpet || property.area.plot || 0;
    if (areaValue === 0) return 0;
    return Math.round(property.price / areaValue);
  };

  const getPrimaryImage = (property: Property): string => {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || '/placeholder-property.jpg';
  };

  const removeProperty = (propertyId: string) => {
    setSelectedProperties(prev => prev.filter(id => id !== propertyId));
    setProperties(prev => prev.filter(prop => prop._id !== propertyId));
  };

  const addProperty = () => {
    // In real app, this would open a modal to select from favorites or search
    toast({
      title: "Feature Coming Soon",
      description: "Property selection modal will be available soon",
    });
  };

  const getComparisonValue = (value: any, isNumeric = false) => {
    if (!value) return { display: "-", color: "text-muted-foreground" };
    
    if (isNumeric && properties.length > 1) {
      const values = properties.map(p => {
        // Extract numeric value based on the comparison context
        if (typeof value === 'number') return value;
        return 0;
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
      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time property updates active' : 'Offline mode'}
          </span>
          {lastEvent && (
            <Badge variant="secondary" className="text-xs">
              Last update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

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

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading properties for comparison...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && properties.length === 0 ? (
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
      ) : !loading && (
        <div className="space-y-6">
          {/* Property Cards Overview */}
          <div className={`grid gap-4 ${properties.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : properties.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {properties.map((property) => (
              <Card key={property._id} className="relative">
                <button
                  onClick={() => removeProperty(property._id)}
                  className="absolute top-2 right-2 z-10 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={getPrimaryImage(property)}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Home className="w-8 h-8 text-muted-foreground hidden" />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{property.title}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="line-clamp-1">
                      {property.address.city}, {property.address.state}
                    </span>
                  </div>
                  
                  <div className="text-lg font-bold text-primary mb-2">
                    {formatPrice(property.price, property.listingType)}
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{property.bedrooms} BHK</span>
                    <span>{formatArea(property.area)}</span>
                    <span>₹{calculatePricePerSqft(property)}/sq.ft</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {properties.length < 3 && (
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
                      {properties.map((property) => (
                        <th key={property._id} className="text-left p-4 min-w-64">
                          <div className="truncate">{property.title}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Price</td>
                      {properties.map((property) => {
                        const comparison = getComparisonValue(property.price, true);
                        return (
                          <td key={property._id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {formatPrice(property.price, property.listingType)}
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
                      {properties.map((property) => {
                        const pricePerSqft = calculatePricePerSqft(property);
                        const comparison = getComparisonValue(pricePerSqft, true);
                        return (
                          <td key={property._id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              ₹{pricePerSqft}
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
                      {properties.map((property) => {
                        const areaValue = property.area.builtUp || property.area.carpet || property.area.plot || 0;
                        const comparison = getComparisonValue(areaValue, true);
                        return (
                          <td key={property._id} className={`p-4 ${comparison.color}`}>
                            <div className="flex items-center gap-2">
                              {formatArea(property.area)}
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
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          {property.bedrooms} BHK
                        </td>
                      ))}
                    </tr>

                    {/* Bathrooms */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Bathrooms</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          {property.bathrooms}
                        </td>
                      ))}
                    </tr>

                    {/* Property Type */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Property Type</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          <Badge variant="outline" className="capitalize">
                            {property.type}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Listing Type */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Listing Type</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          <Badge variant="outline" className="capitalize">
                            {property.listingType}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Status */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Status</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          <Badge 
                            variant={property.status === 'available' ? 'default' : 'secondary'}
                            className={property.status === 'available' ? 'bg-green-500' : ''}
                          >
                            {property.status === 'available' ? 'Available' : property.status}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Location */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">Location</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{property.address.city}</div>
                            <div className="text-muted-foreground">
                              {property.address.state}
                            </div>
                          </div>
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
                {Array.from(new Set(properties.flatMap(p => p.amenities))).map((amenity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">{String(amenity)}</span>
                    <div className="flex gap-4">
                      {properties.map((property) => (
                        <div key={property._id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 truncate">
                            {property.title.slice(0, 15)}...
                          </span>
                          {property.amenities.includes(String(amenity)) ? (
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {properties.map((property) => (
                  <div key={property._id} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{property.title}</h4>
                    <div className="space-y-2">
                      {property.owner && (
                        <div>
                          <p className="text-sm font-medium">Owner</p>
                          <p className="text-sm text-muted-foreground">
                            {property.owner.profile.firstName} {property.owner.profile.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {property.owner.profile.phone}
                          </p>
                        </div>
                      )}
                      {property.agent && (
                        <div>
                          <p className="text-sm font-medium">Agent</p>
                          <p className="text-sm text-muted-foreground">
                            {property.agent.profile.firstName} {property.agent.profile.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {property.agent.profile.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {properties.map((property) => (
              <Card key={property._id} className="p-4">
                <div className="text-center space-y-2">
                  <h4 className="font-medium text-sm">{property.title.slice(0, 25)}...</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Link to={`/property/${property._id}`}>
                      <Button size="sm">
                        View Details
                      </Button>
                    </Link>
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