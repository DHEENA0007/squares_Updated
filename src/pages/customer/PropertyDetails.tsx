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

  // Track view duration
  useEffect(() => {
    if (!property?._id) return;

    const startTime = Date.now();

    const sendDuration = () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (duration > 0) {
        propertyService.updateViewDuration(property._id, duration);
      }
    };

    // Send duration when component unmounts or property changes
    return () => {
      sendDuration();
    };
  }, [property?._id]);

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

  // Helper to generate dynamic specs
  const getKeySpecs = () => {
    const specs = [
      { label: 'Super Built-up Area', value: formatArea(property.area) },
      { label: 'Floor', value: property.floor ? `${property.floor}${property.totalFloors ? ' (Out of ' + property.totalFloors + ')' : ''}` : null },
      { label: 'Transaction Type', value: property.listingType === 'sale' ? 'Resale' : 'Rent', capitalize: true },
      { label: 'Status', value: property.status, capitalize: true },
      { label: 'Facing', value: property.facing, capitalize: true },
      { label: 'Furnished Status', value: property.furnishing ? property.furnishing.replace('-', ' ') : null, capitalize: true },
      { label: 'Car Parking', value: property.parkingSpaces ? `${property.parkingSpaces}` : null },
      { label: 'Bathroom', value: property.bathrooms ? `${property.bathrooms}` : null },
    ];
    return specs.filter(spec => spec.value);
  };

  const getMoreDetails = () => {
    const details = [
      { label: 'Price Breakup', value: formatPrice(property.price, property.listingType) },
      { label: 'Address', value: getLocationString(property) },
      { label: 'Furnishing', value: property.furnishing ? property.furnishing.replace('-', ' ') : null, capitalize: true },
      { label: 'Property Age', value: property.age ? `${property.age} Years` : null },
    ];
    return details.filter(detail => detail.value);
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-24 lg:pb-12 font-sans text-foreground">
      {/* Navigation Bar */}
      <div className="bg-card border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-primary pl-0 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
            <span className="cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => navigate('/')}>Home</span>
            <span>›</span>
            <span className="cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => navigate('/customer/search')}>Properties in {property.address?.city || 'City'}</span>
            <span className="hidden sm:inline">›</span>
            <span className="truncate max-w-[200px] font-medium text-foreground hidden sm:inline">{property.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header Card */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border/60">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-baseline gap-4 mb-1">
                    <h1 className="text-2xl font-bold text-foreground">
                      {formatPrice(property.price, property.listingType)}
                    </h1>
                    {calculatePricePerSqft(property) > 0 && (
                      <span className="text-sm text-muted-foreground">
                        @ {calculatePricePerSqft(property)} per sqft
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg text-muted-foreground font-medium">
                    {property.bedrooms} BHK {property.type} for {property.listingType === 'sale' ? 'Sale' : property.listingType} in {getLocationString(property)}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleShare} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button onClick={handleFavoriteToggle} className={`p-2 hover:bg-muted rounded-full transition-colors ${isFavorited ? 'text-red-500' : 'text-muted-foreground'}`}>
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Image Section */}
              <div className="mt-6 relative group cursor-pointer" onClick={() => openGallery(0)}>
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted border border-border/60">
                  <img
                    src={getPrimaryImage(property)}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.src = '/placeholder-property.jpg'; }}
                  />
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 backdrop-blur-sm">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{property.images.length} Photos</span>
                  </div>
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="flex border-b border-border mt-4">
                <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">Photos</button>
                {/* Only show other tabs if relevant data exists - placeholders for now */}
              </div>

              {/* Key Specs Grid */}
              <div className="bg-muted/30 p-5 mt-4 rounded-lg border border-border/60">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  {getKeySpecs().map((spec, index) => (
                    <div key={index}>
                      <p className="text-xs text-muted-foreground mb-1">{spec.label}</p>
                      <p className={`text-sm font-bold text-foreground ${spec.capitalize ? 'capitalize' : ''}`}>
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Removed duplicate Primary Actions buttons from here */}
            </div>

            {/* More Details Section */}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border/60">
              <h3 className="text-lg font-bold text-foreground mb-6">More Details</h3>

              <div className="space-y-4">
                {getMoreDetails().map((detail, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 border-b border-border/40">
                    <span className="text-sm text-muted-foreground">{detail.label}</span>
                    <span className={`text-sm font-medium text-foreground md:col-span-2 ${detail.capitalize ? 'capitalize' : ''}`}>
                      {detail.value}
                    </span>
                  </div>
                ))}

                {property.amenities && property.amenities.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 border-b border-border/40">
                    <span className="text-sm text-muted-foreground">Amenities</span>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      {property.amenities.map((amenity, i) => (
                        <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded border border-border">{amenity}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-primary mb-2 cursor-pointer hover:underline inline-flex items-center">
                  View all details <span className="ml-1">▾</span>
                </h4>
                <div className="mt-4 bg-muted/30 p-4 rounded-lg border border-border/60">
                  <h4 className="text-sm font-bold text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              </div>

              {/* Removed duplicate Contact button from here */}
            </div>

          </div>

          {/* Sidebar - Visible on Desktop */}
          <div className="space-y-6 hidden lg:block">
            <div className="bg-card p-5 rounded-lg shadow-sm border border-border/60 sticky top-24">
              <h3 className="text-lg font-bold text-foreground mb-4">Contact Owner</h3>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border border-border">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{getOwnerDisplayName(property.owner)}</p>
                </div>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 rounded-md mb-3 shadow-lg shadow-primary/20"
                onClick={() => setShowContactDialog(true)}
              >
                Get Phone No.
              </Button>
              <Button
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10 font-bold h-10 rounded-md"
                onClick={() => setShowMessageDialog(true)}
              >
                Contact Owner
              </Button>

              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Posted on {new Date(property.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-primary text-primary hover:bg-primary/10 font-bold"
          onClick={() => setShowMessageDialog(true)}
        >
          Contact Owner
        </Button>
        <Button
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
          onClick={() => setShowContactDialog(true)}
        >
          Get Phone No.
        </Button>
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
