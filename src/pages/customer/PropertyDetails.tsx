import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useRealtime, useRealtimeEvent } from '@/contexts/RealtimeContext';
import { isAdminUser, getOwnerDisplayName, getPropertyListingLabel } from '@/utils/propertyUtils';
import { 
  ArrowLeft, 
  MapPin, 
  Heart, 
  Share2, 
  Phone, 
  MessageSquare, 
  Building2,
  Bed,
  Bath,
  Maximize,
  Car,
  Wifi,
  Shield,
  Calendar,
  Eye,
  Star,
  Home,
  User,
  Mail,
  GitCompare,
  ExternalLink
} from 'lucide-react';
import { propertyService, type Property } from '@/services/propertyService';
import { favoriteService } from '@/services/favoriteService';
import { messageService } from '@/services/messageService';
import { vendorService } from '@/services/vendorService';
import PropertyMessageDialog from '@/components/PropertyMessageDialog';
import PropertyContactDialog from '@/components/PropertyContactDialog';
import EnterprisePropertyContactDialog from '@/components/EnterprisePropertyContactDialog';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useRealtime();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Dialog states
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showEnterpriseDialog, setShowEnterpriseDialog] = useState(false);
  const [isEnterpriseProperty, setIsEnterpriseProperty] = useState(false);
  const [checkingEnterprise, setCheckingEnterprise] = useState(false);

  const loadProperty = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await propertyService.getProperty(id);
      
      if (response.success) {
        setProperty(response.data.property);
        
        // Check if property is favorited
        const favoriteStatus = await favoriteService.isFavorite(id);
        setIsFavorited(favoriteStatus);
        
        // Check if property is from enterprise vendor
        if (response.data.property.vendor?._id || response.data.property.owner?._id) {
          try {
            setCheckingEnterprise(true);
            const vendorId = response.data.property.vendor?._id || response.data.property.owner?._id;
            const isEnterprise = await vendorService.isVendorEnterpriseProperty(vendorId);
            setIsEnterpriseProperty(isEnterprise);
          } catch (error) {
            console.error("Failed to check enterprise status:", error);
            setIsEnterpriseProperty(false);
          } finally {
            setCheckingEnterprise(false);
          }
        }
        
        // Property view tracking would go here if needed
      } else {
        toast({
          title: "Error",
          description: "Property not found",
          variant: "destructive",
        });
        navigate('/customer/search');
      }
    } catch (error) {
      console.error('Error loading property:', error);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
      navigate('/customer/search');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  // Listen for real-time updates
  useRealtimeEvent('property_updated', useCallback((data) => {
    if (data.propertyId === id) {
      console.log('Property updated via realtime, refreshing...');
      loadProperty();
    }
  }, [id, loadProperty]));

  useRealtimeEvent('property_favorited', useCallback((data) => {
    if (data.propertyId === id) {
      setIsFavorited(data.action === 'add');
    }
  }, [id]));

  const handleFavoriteToggle = async () => {
    if (!property) return;
    
    try {
      setFavoriteLoading(true);
      
      if (isFavorited) {
        await favoriteService.removeFromFavorites(property._id);
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Property has been removed from your favorites",
        });
      } else {
        await favoriteService.addToFavorites(property._id);
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Property has been added to your favorites",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && property) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Property link has been copied to clipboard",
        });
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Property link has been copied to clipboard",
      });
    }
  };

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
    if (!area) return 'N/A';
    
    if (typeof area === 'object') {
      if (area.builtUp) {
        return `${area.builtUp} ${area.unit || 'sq ft'}`;
      } else if (area.plot) {
        return `${area.plot} ${area.unit || 'sq ft'}`;
      } else if (area.carpet) {
        return `${area.carpet} ${area.unit || 'sq ft'}`;
      }
    }
    
    if (typeof area === 'number') {
      return `${area} sq ft`;
    }
    
    return 'N/A';
  };

  const calculatePricePerSqft = (property: Property) => {
    const area = property.area;
    let areaValue = 0;
    
    if (typeof area === 'object' && area !== null) {
      areaValue = area.builtUp || area.carpet || area.plot || 0;
    } else if (typeof area === 'number') {
      areaValue = area;
    }
    
    if (areaValue === 0) return 0;
    return Math.round(property.price / areaValue);
  };

  const getPrimaryImage = (property: Property): string => {
    if (!property.images || property.images.length === 0) {
      return '/placeholder-property.jpg';
    }
    
    const primaryImage = property.images.find(img => 
      typeof img === 'object' && img.isPrimary
    );
    
    if (primaryImage && typeof primaryImage === 'object') {
      return primaryImage.url;
    }
    
    const firstImage = property.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    } else if (typeof firstImage === 'object') {
      return firstImage.url;
    }
    
    return '/placeholder-property.jpg';
  };

  const getLocationString = (property: Property) => {
    const address = property.address;
    if (typeof address === 'string') return address;
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.locationName) parts.push(address.locationName);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.pincode) parts.push(address.pincode);
    return parts.join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-600';
      case 'sold': return 'bg-red-600';
      case 'rented': return 'bg-blue-600';
      case 'pending': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
          <Link to="/customer/search">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Realtime Status */}
        <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time property updates active' : 'Offline mode'}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{property.title}</h1>
              <div className="flex items-center text-muted-foreground mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{getLocationString(property)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
              {isFavorited ? 'Favorited' : 'Add to Favorites'}
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={() => {
              const selected = [property._id];
              navigate(`/customer/compare?properties=${selected.join(',')}`);
            }}>
              <GitCompare className="w-4 h-4 mr-2" />
              Compare
            </Button>
          </div>
        </div>

        {/* Status and Price */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(property.status)} text-white`}>
              {property.status}
            </Badge>
            {property.featured && (
              <Badge variant="secondary">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {property.verified && (
              <Badge className="bg-green-600 text-white">Verified</Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {formatPrice(property.price, property.listingType)}
            </p>
            {calculatePricePerSqft(property) > 0 && (
              <p className="text-sm text-muted-foreground">
                ₹{calculatePricePerSqft(property)}/sq ft
              </p>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        {property.images && property.images.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={typeof property.images[selectedImageIndex] === 'string' 
                    ? property.images[selectedImageIndex] 
                    : (property.images[selectedImageIndex] as any).url
                  }
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-property.jpg';
                  }}
                />
              </div>
              {property.images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {property.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 ${
                        index === selectedImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={typeof image === 'string' ? image : image.url}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-property.jpg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Property Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {property.bedrooms && property.bedrooms > 0 && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{property.bedrooms}</p>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                    </div>
                  )}
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.bathrooms || 0}</p>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Maximize className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{formatArea(property.area).split(' ')[0]}</p>
                    <p className="text-sm text-muted-foreground">Sq Ft</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold capitalize">{property.type}</p>
                    <p className="text-sm text-muted-foreground">Type</p>
                  </div>
                </div>

                {property.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property Type:</span>
                      <span className="font-medium capitalize">{property.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listing Type:</span>
                      <span className="font-medium capitalize">{property.listingType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bedrooms:</span>
                      <span className="font-medium">{property.bedrooms || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bathrooms:</span>
                      <span className="font-medium">{property.bathrooms || 0}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area:</span>
                      <span className="font-medium">{formatArea(property.area)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium capitalize">{property.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listed On:</span>
                      <span className="font-medium">{new Date(property.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property ID:</span>
                      <span className="font-medium text-xs">{property._id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="font-medium">
                    {getOwnerDisplayName(property.owner)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getPropertyListingLabel(property)}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  {!checkingEnterprise && !isEnterpriseProperty && (
                    <>
                      <Button 
                        className="w-full" 
                        onClick={() => setShowContactDialog(true)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Owner
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowMessageDialog(true)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </>
                  )}
                  
                  {!checkingEnterprise && isEnterpriseProperty && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setShowEnterpriseDialog(true)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp Contact
                    </Button>
                  )}
                  
                  {checkingEnterprise && (
                    <Button disabled className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Loading...
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Property Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Views</span>
                  <span className="font-semibold">{property.views || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Listed</span>
                  <span className="font-semibold">
                    {Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {property.virtualTour && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open(property.virtualTour, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Virtual Tour
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const selected = [property._id];
                    navigate(`/customer/compare?properties=${selected.join(',')}`);
                  }}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare Property
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Property
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Message Dialog */}
      <PropertyMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        property={property}
        onMessageSent={() => {
          console.log("Message sent for property:", property._id);
          toast({
            title: "Message sent",
            description: "Your inquiry has been sent to the property owner",
          });
        }}
      />

      {/* Contact Dialog */}
      <PropertyContactDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        property={property}
      />

      {/* Enterprise Contact Dialog */}
      <EnterprisePropertyContactDialog
        open={showEnterpriseDialog}
        onOpenChange={setShowEnterpriseDialog}
        property={property}
      />
    </div>
  );
};

export default PropertyDetails;
