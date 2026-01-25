import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Home,
  User
} from "lucide-react";
import { isAdminUser, getOwnerDisplayName, getPropertyOwnerDisplayName } from "@/utils/propertyUtils";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { propertyService, Property } from "@/services/propertyService";
import { toast } from "@/hooks/use-toast";
import PropertySelectionDialog from "@/components/customer/PropertySelectionDialog";

const PropertyComparison = () => {
  const navigate = useNavigate();
  const { isConnected, lastEvent } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContactProperty, setSelectedContactProperty] = useState<Property | null>(null);
  const hasInitialized = useRef(false);

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
    if (selectedProperties.length === 0) return;
    setRefreshing(true);
    await loadProperties(selectedProperties);
    setRefreshing(false);
  }, [loadProperties, selectedProperties]);

  // Initialize from URL params or localStorage only once on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      const urlIds = searchParams.get('properties')?.split(',').filter(Boolean) || [];
      const storedIds = localStorage.getItem('compareProperties');
      const ids = urlIds.length > 0 ? urlIds : (storedIds ? JSON.parse(storedIds) : []);

      setSelectedProperties(ids);
      loadProperties(ids);
      hasInitialized.current = true;
    }
  }, []);

  // Persist selected properties to localStorage whenever they change
  useEffect(() => {
    if (hasInitialized.current) {
      localStorage.setItem('compareProperties', JSON.stringify(selectedProperties));
    }
  }, [selectedProperties]);

  // Listen to realtime events for property updates - stable callback
  const handlePropertyUpdate = useCallback((data: any) => {
    if (data.propertyId && selectedProperties.includes(data.propertyId)) {
      console.log("Property updated via realtime, refreshing comparison");
      loadProperties(selectedProperties);
    }
  }, [selectedProperties, loadProperties]);

  const handlePropertyFavorite = useCallback((data: any) => {
    if (data.propertyId) {
      setProperties(prev => prev.map(prop => 
        prop._id === data.propertyId 
          ? { ...prop, isFavorited: data.action === 'add' }
          : prop
      ));
    }
  }, []);

  useRealtimeEvent('property_updated', handlePropertyUpdate);
  useRealtimeEvent('property_favorited', handlePropertyFavorite);

  const formatPrice = useCallback((price: number, listingType: Property['listingType']) => {
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
  }, []);

  const formatArea = useCallback((area: Property['area']) => {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'N/A';
  }, []);

  const calculatePricePerSqft = useCallback((property: Property) => {
    const areaValue = property.area.builtUp || property.area.carpet || property.area.plot || 0;
    if (areaValue === 0) return 0;
    return Math.round(property.price / areaValue);
  }, []);

  const getPrimaryImage = useCallback((property: Property): string => {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || '/placeholder-property.jpg';
  }, []);

  const removeProperty = useCallback((propertyId: string) => {
    const newProperties = selectedProperties.filter(id => id !== propertyId);
    setSelectedProperties(newProperties);
    setProperties(prev => prev.filter(prop => prop._id !== propertyId));
    
    // Update URL
    if (newProperties.length > 0) {
      setSearchParams({ properties: newProperties.join(',') }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedProperties, setSearchParams]);

  const addProperty = useCallback(() => {
    const maxComparisons = 10;
    
    if (selectedProperties.length >= maxComparisons) {
      toast({
        title: "Comparison Limit Reached",
        description: `You can compare up to ${maxComparisons} properties at once. Remove a property to add another.`,
        variant: "destructive"
      });
      return;
    }
    
    setShowPropertyDialog(true);
  }, [selectedProperties.length]);

  const handleShareComparison = useCallback(async () => {
    // Use current URL's base path dynamically
    const currentPath = window.location.pathname;
    const compareIndex = currentPath.indexOf('/customer/compare');
    const basePath = compareIndex > 0 ? currentPath.substring(0, compareIndex) : '';
    const shareUrl = `${window.location.origin}${basePath}/customer/compare?properties=${selectedProperties.join(',')}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Property Comparison',
          text: `Compare ${properties.length} properties`,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link Copied",
            description: "Comparison link copied to clipboard",
          });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Comparison link copied to clipboard",
      });
    }
  }, [selectedProperties, properties.length]);

  const handlePropertySelect = useCallback(async (propertyId: string): Promise<void> => {
    try {
      // Check if property is already selected
      if (selectedProperties.includes(propertyId)) {
        toast({
          title: "Already Selected",
          description: "This property is already in your comparison list",
          variant: "destructive"
        });
        return;
      }

      // Load the new property
      const response = await propertyService.getProperty(propertyId);
      if (response.success) {
        const newPropertyIds = [...selectedProperties, propertyId];
        
        // Update state and URL together
        setSelectedProperties(newPropertyIds);
        setProperties(prev => [...prev, response.data.property]);
        setSearchParams({ properties: newPropertyIds.join(',') }, { replace: true });
        
        toast({
          title: "Property Added",
          description: `${response.data.property.title} has been added to comparison`,
        });
      } else {
        throw new Error('Failed to load property');
      }
    } catch (error) {
      console.error('Error adding property:', error);
      toast({
        title: "Error",
        description: "Failed to add property to comparison",
        variant: "destructive"
      });
      throw error;
    }
  }, [selectedProperties, setSearchParams]);

  const getComparisonValue = useCallback((value: any, isNumeric = false) => {
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
  }, [properties]);

  // Memoize unique amenities
  const uniqueAmenities = useMemo(() => {
    return Array.from(new Set(properties.flatMap(p => p.amenities)));
  }, [properties]);

  // Handle call button click
  const handleCallClick = useCallback((property: Property) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const contactNumber = property.owner?.profile?.phone || property.agent?.profile?.phone;

    if (!contactNumber) {
      toast({
        title: "Contact Unavailable",
        description: "Contact information is not available for this property",
        variant: "destructive"
      });
      return;
    }

    if (isMobile) {
      // On mobile, directly open dialer
      window.location.href = `tel:${contactNumber}`;
    } else {
      // On desktop, show popup with number
      setSelectedContactProperty(property);
      setShowContactDialog(true);
    }
  }, []);

  const getContactNumber = (property: Property) => {
    return property.owner?.profile?.phone || property.agent?.profile?.phone || null;
  };

  const getContactName = (property: Property) => {
    if (property.owner?.profile) {
      return getPropertyOwnerDisplayName(property);
    }
    if (property.agent?.profile) {
      return getOwnerDisplayName(property.agent);
    }
    return "Property Contact";
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Refresh Button */}
      <div className="flex justify-end">
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
            Side-by-side comparison of your selected properties ({properties.length}/10)
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/customer/favorites">
            <Button variant="outline">
              <Heart className="w-4 h-4 mr-2" />
              Back to Favorites
            </Button>
          </Link>
          <Button variant="outline" disabled={properties.length === 0} onClick={handleShareComparison}>
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      {property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}
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
            
            {properties.length < 10 && (
              <Card className="border-dashed border-2">
                <CardContent className="p-4 h-full flex items-center justify-center min-h-[300px]">
                  <Button 
                    variant="ghost" 
                    className="h-full w-full flex flex-col gap-2"
                    onClick={addProperty}
                  >
                    <Plus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add Property</span>
                    <span className="text-xs text-muted-foreground">
                      ({properties.length}/10)
                    </span>
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
                      <th className="text-left p-4 w-48 sticky left-0 bg-background z-10">Feature</th>
                      {properties.map((property) => (
                        <th key={property._id} className="text-left p-4 min-w-64">
                          <div className="truncate max-w-64">{property.title}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Price</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Price per sq.ft</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Area</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Bedrooms</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          {property.bedrooms} BHK
                        </td>
                      ))}
                    </tr>

                    {/* Bathrooms */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Bathrooms</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          {property.bathrooms}
                        </td>
                      ))}
                    </tr>

                    {/* Property Type */}
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Property Type</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Listing Type</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Status</td>
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
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">Location</td>
                      {properties.map((property) => (
                        <td key={property._id} className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{property.address.city}</div>
                            <div className="text-muted-foreground">
                              {property.address.district ? `${property.address.district}, ${property.address.state}` : property.address.state}
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
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="sticky left-0 z-10 bg-background p-4 text-left font-semibold min-w-[200px] border-r">
                        Amenity
                      </th>
                      {properties.map((property) => (
                        <th key={property._id} className="p-4 text-center font-medium min-w-[150px]">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm truncate" title={property.title}>
                              {property.title.length > 20 ? `${property.title.slice(0, 20)}...` : property.title}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueAmenities.map((amenity, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="sticky left-0 z-10 bg-background p-4 font-medium border-r">
                          {String(amenity)}
                        </td>
                        {properties.map((property) => (
                          <td key={property._id} className="p-4 text-center">
                            {property.amenities.includes(String(amenity)) ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-red-400 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      {property.owner && property.owner.profile && (
                        <div>
                          <p className="text-sm font-medium">
                            {isAdminUser(property.owner) ? 'Listed by' : 'Owner'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getPropertyOwnerDisplayName(property)}
                          </p>
                          {property.owner.profile.phone && !isAdminUser(property.owner) && (
                            <p className="text-sm text-muted-foreground">
                              {property.owner.profile.phone}
                            </p>
                          )}
                        </div>
                      )}
                      {property.agent && property.agent.profile && (
                        <div>
                          <p className="text-sm font-medium">
                            {isAdminUser(property.agent) ? 'Listed by' : 'Agent'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getOwnerDisplayName(property.agent)}
                          </p>
                          {property.agent.profile.phone && !isAdminUser(property.agent) && (
                            <p className="text-sm text-muted-foreground">
                              {property.agent.profile.phone}
                            </p>
                          )}
                        </div>
                      )}
                      {!property.owner?.profile && !property.agent?.profile && (
                        <div className="text-sm text-muted-foreground">
                          Contact information not available
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((property) => (
              <Card key={property._id} className="p-4">
                <div className="text-center space-y-2">
                  <h4 className="font-medium text-sm truncate" title={property.title}>
                    {property.title}
                  </h4>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCallClick(property)}
                      disabled={!getContactNumber(property)}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Link to={`/customer/property/${property._id}`}>
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

      {/* Property Selection Dialog */}
      <PropertySelectionDialog
        open={showPropertyDialog}
        onOpenChange={setShowPropertyDialog}
        onPropertySelect={handlePropertySelect}
        selectedPropertyIds={selectedProperties}
        maxSelections={10}
      />

      {/* Contact Number Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Information</DialogTitle>
            <DialogDescription>
              {selectedContactProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <User className="w-10 h-10 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {selectedContactProperty && getContactName(selectedContactProperty)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {selectedContactProperty?.owner && !isAdminUser(selectedContactProperty.owner) ? 'Owner' : 
                   selectedContactProperty?.agent && !isAdminUser(selectedContactProperty.agent) ? 'Agent' : 'Contact'}
                </p>
              </div>
            </div>
            
            {selectedContactProperty && getContactNumber(selectedContactProperty) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <span className="font-medium text-lg">
                      {getContactNumber(selectedContactProperty)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const number = getContactNumber(selectedContactProperty);
                      if (number) {
                        navigator.clipboard.writeText(number);
                        toast({
                          description: "Phone number copied to clipboard"
                        });
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    const number = getContactNumber(selectedContactProperty);
                    if (number) {
                      window.location.href = `tel:${number}`;
                    }
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyComparison;