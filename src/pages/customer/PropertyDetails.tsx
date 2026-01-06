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
  ExternalLink,
  ThumbsUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService, type Property } from '@/services/propertyService';
import { favoriteService } from '@/services/favoriteService';
import { messageService } from '@/services/messageService';
import { vendorService } from '@/services/vendorService';
import PropertyMessageDialog from '@/components/PropertyMessageDialog';
import PropertyContactDialog from '@/components/PropertyContactDialog';

import EnterprisePropertyContactDialog from '@/components/EnterprisePropertyContactDialog';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { X } from "lucide-react";

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useRealtime();
  const { user, isAuthenticated } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Dialog states
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [hasWhatsAppSupport, setHasWhatsAppSupport] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  const [checkingWhatsApp, setCheckingWhatsApp] = useState(false);

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Update carousel when api is available or selected index changes
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    carouselApi.scrollTo(selectedImageIndex);
  }, [carouselApi, selectedImageIndex, showGallery]);

  const openGallery = (index: number) => {
    setSelectedImageIndex(index);
    setShowGallery(true);
  };

  const loadProperty = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await propertyService.getProperty(id);

      if (response.success) {
        console.log('Property data received:', response.data.property);
        console.log('Owner data:', response.data.property.owner);
        console.log('Owner profile:', response.data.property.owner?.profile);
        console.log('Owner phone:', response.data.property.owner?.profile?.phone);
        setProperty(response.data.property);

        // Check if property is favorited
        const favoriteStatus = await favoriteService.isFavorite(id);
        setIsFavorited(favoriteStatus);

        // Check if vendor's plan has WhatsApp support enabled
        if (response.data.property.vendor?._id || response.data.property.owner?._id) {
          try {
            setCheckingWhatsApp(true);
            const vendorId = response.data.property.vendor?._id || response.data.property.owner?._id;
            const whatsappData = await vendorService.checkVendorWhatsAppSupport(vendorId);
            setHasWhatsAppSupport(whatsappData.whatsappEnabled);
            setWhatsappNumber(whatsappData.whatsappNumber);
          } catch (error) {
            console.error("Failed to check WhatsApp support:", error);
            setHasWhatsAppSupport(false);
            setWhatsappNumber(null);
          } finally {
            setCheckingWhatsApp(false);
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

  // Listen for updates
  useRealtimeEvent('property_updated', useCallback((data) => {
    if (data.propertyId === id) {
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
    const publicUrl = `${window.location.origin}/v3/property/${id}`;

    // Track share interaction
    if (id) {
      propertyService.trackInteraction(id, 'sharedProperty');
    }

    if (navigator.share && property) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: publicUrl
        });
      } catch (error) {
        // Fallback to copying URL
        navigator.clipboard.writeText(publicUrl);
        toast({
          title: "Link copied",
          description: "Property link has been copied to clipboard",
        });
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copied",
        description: "Property link has been copied to clipboard",
      });
    }
  };



  const handleInterestClick = async () => {
    if (!property) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${property._id}`, action: 'interest' } });
      return;
    }

    try {
      await propertyService.registerInterest(property._id);
    } catch (error) {
      console.error("Failed to register interest:", error);
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

  const hasValidArea = (area: Property['area']): boolean => {
    if (!area) return false;
    if (typeof area === 'object') {
      return !!(area.builtUp || area.plot || area.carpet);
    }
    if (typeof area === 'number') {
      return area > 0;
    }
    return false;
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
    if (address.district) parts.push(address.district);
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
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Navigation Bar / Breadcrumb Placeholder */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" size="sm" onClick={handleFavoriteToggle} className={isFavorited ? "text-red-500" : ""}>
              <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
              {isFavorited ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header Section: Title & Price */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {property.bedrooms > 0 ? `${property.bedrooms} BHK ` : ''}
                {property.type} for {property.listingType === 'sale' ? 'Sale' : property.listingType}
              </h1>
              <Badge variant="outline" className={`${getStatusColor(property.status)} text-white border-0`}>
                {property.status}
              </Badge>
            </div>
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="text-base">{getLocationString(property)}</span>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-3xl font-bold text-gray-900">
              {formatPrice(property.price, property.listingType)}
            </div>
            {calculatePricePerSqft(property) > 0 && (
              <div className="text-sm text-muted-foreground font-medium">
                ₹{calculatePricePerSqft(property)} / sq ft
              </div>
            )}
          </div>
        </div>

        {/* Image Gallery - Grid Layout */}
        {property.images && property.images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[400px] rounded-xl overflow-hidden">
            {/* Main Image */}
            <div className="md:col-span-2 h-full relative cursor-pointer group overflow-hidden" onClick={() => openGallery(0)}>
              <img
                src={typeof property.images[0] === 'string' ? property.images[0] : (property.images[0] as any).url}
                alt="Property Main"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => { e.currentTarget.src = '/placeholder-property.jpg'; }}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>

            {/* Secondary Images */}
            <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-full">
              {[1, 2, 3, 4].map((offset) => {
                const img = property.images[offset];
                if (!img) return null;
                return (
                  <div key={offset} className="relative h-full overflow-hidden cursor-pointer group" onClick={() => openGallery(offset)}>
                    <img
                      src={typeof img === 'string' ? img : (img as any).url}
                      alt={`Property ${offset}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = '/placeholder-property.jpg'; }}
                    />
                    {/* Overlay for the last image if there are more */}
                    {offset === 4 && property.images.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium text-lg">
                        +{property.images.length - 5} more
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Fallback if fewer images */}
              {property.images.length < 5 && property.images.length > 1 && (
                property.images.slice(1).map((img, idx) => (
                  <div key={idx} className="relative h-full overflow-hidden cursor-pointer group" onClick={() => openGallery(idx + 1)}>
                    <img
                      src={typeof img === 'string' ? img : (img as any).url}
                      alt={`Property ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = '/placeholder-property.jpg'; }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-[300px] bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No images available</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">

            {/* Key Highlights Bar */}
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                      <Bed className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold text-gray-900">{property.bedrooms || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                      <Bath className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold text-gray-900">{property.bathrooms || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                      <Maximize className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-semibold text-gray-900">{formatArea(property.area)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Furnishing</p>
                      <p className="font-semibold text-gray-900 capitalize">{property.furnishing ? property.furnishing.replace('-', ' ') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">About this Property</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            <Separator />

            {/* Property Details Grid */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Property Type', value: property.type, capitalize: true },
                  { label: 'Listing Type', value: property.listingType, capitalize: true },
                  { label: 'Floor', value: property.floor },
                  { label: 'Total Floors', value: property.totalFloors },
                  { label: 'Facing', value: property.facing, capitalize: true },
                  { label: 'Parking', value: property.parkingSpaces },
                  { label: 'Age of Building', value: property.age ? `${property.age} Years` : null },
                  { label: 'Status', value: property.status, capitalize: true },
                ].map((item, i) => (
                  item.value ? (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-500">{item.label}</span>
                      <span className={`font-medium text-gray-900 ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>

            <Separator />

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-3 text-gray-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Contact Card */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <Card className="border shadow-lg overflow-hidden">
                <div className="bg-primary/5 p-4 border-b">
                  <h3 className="font-semibold text-lg flex items-center">
                    Contact Seller
                    {property.verified && <Badge className="ml-2 bg-green-600 h-5">Verified</Badge>}
                  </h3>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{getOwnerDisplayName(property.owner)}</p>
                      <p className="text-sm text-muted-foreground">{getPropertyListingLabel(property)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!checkingWhatsApp && !hasWhatsAppSupport && (
                      <>
                        <Button
                          className="w-full h-12 text-base font-semibold shadow-md"
                          onClick={() => {
                            if (id) propertyService.trackInteraction(id, 'clickedPhone');
                            setShowContactDialog(true);
                          }}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          View Phone Number
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-base border-primary text-primary hover:bg-primary/5"
                          onClick={() => {
                            if (id) propertyService.trackInteraction(id, 'clickedMessage');
                            setShowMessageDialog(true);
                          }}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                      </>
                    )}

                    {!checkingWhatsApp && hasWhatsAppSupport && (
                      <Button
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                        onClick={() => setShowWhatsAppDialog(true)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat on WhatsApp
                      </Button>
                    )}

                    {isAuthenticated && isCustomer && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleInterestClick}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        I'm Interested
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-center text-muted-foreground">
                    By contacting, you agree to our Terms & Privacy Policy.
                  </div>
                </CardContent>
              </Card>

              {/* Quick Summary Card */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Property ID</span>
                    <span className="font-mono text-sm">{property._id.slice(-8).toUpperCase()}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posted</span>
                    <span className="text-sm font-medium">{new Date(property.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Views</span>
                    <span className="text-sm font-medium">{property.views || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Message Dialog */}
      <PropertyMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        property={property}
        onMessageSent={() => {
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

      {/* WhatsApp Contact Dialog */}
      <EnterprisePropertyContactDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
        property={property}
        whatsappNumber={whatsappNumber}
      />

      {/* Full Screen Image Gallery */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-screen-xl w-full h-screen md:h-[90vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <DialogClose className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 hover:bg-white/20 text-white transition-colors">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <Carousel setApi={setCarouselApi} className="w-full max-w-5xl">
              <CarouselContent>
                {property.images.map((image, index) => (
                  <CarouselItem key={index} className="flex items-center justify-center h-[80vh]">
                    <img
                      src={typeof image === 'string' ? image : (image as any).url}
                      alt={`Property image ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { e.currentTarget.src = '/placeholder-property.jpg'; }}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 bg-white/10 hover:bg-white/20 text-white border-none" />
              <CarouselNext className="right-4 bg-white/10 hover:bg-white/20 text-white border-none" />
            </Carousel>

            <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
              Image {selectedImageIndex + 1} of {property.images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetails;
