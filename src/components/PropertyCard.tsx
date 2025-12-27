import { Heart, MapPin, Bed, Bath, Square, MessageSquare, Phone, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Property, propertyService } from "@/services/propertyService";
import { DEFAULT_PROPERTY_IMAGE } from "@/utils/imageUtils";
import { getPropertyListingLabel } from "@/utils/propertyUtils";
import { useState, useEffect } from "react";
import PropertyMessageDialog from "@/components/PropertyMessageDialog";
import PropertyContactDialog from "@/components/PropertyContactDialog";
import EnterprisePropertyContactDialog from "@/components/EnterprisePropertyContactDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { vendorService } from "@/services/vendorService";
import { favoriteService } from "@/services/favoriteService";

interface PropertyCardProps {
  property: Property;
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isVendor, isCustomer } = useAuth();
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [hasWhatsAppSupport, setHasWhatsAppSupport] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [checkingWhatsApp, setCheckingWhatsApp] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  const primaryImage = propertyService.getPrimaryImage(property);
  const formattedPrice = propertyService.formatPrice(property.price, property.listingType);
  const formattedArea = propertyService.formatArea(property.area);
  const location = property.address.district
    ? `${property.address.city}, ${property.address.district}, ${property.address.state}`
    : `${property.address.city}, ${property.address.state}`;

  // Check if vendor's plan has WhatsApp support enabled
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      if (property.vendor?._id || property.owner?._id) {
        try {
          setCheckingWhatsApp(true);
          const vendorId = property.vendor?._id || property.owner?._id;
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
      } else {
        setCheckingWhatsApp(false);
      }
    };

    checkWhatsAppStatus();
  }, [property.vendor?._id, property.owner?._id]);

  // Check if property is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // Only check favorite status for authenticated customer users
      if (isAuthenticated && isCustomer) {
        try {
          const favorited = await favoriteService.isFavorite(property._id);
          setIsFavorited(favorited);
        } catch (error) {
          console.error("Failed to check favorite status:", error);
        }
      }
    };

    checkFavoriteStatus();
  }, [isAuthenticated, isCustomer, property._id]);

  const handleViewDetails = () => {
    // Check if the current user is the vendor owner of this property
    if (isAuthenticated && isVendor && (property.owner?._id === user?.id || property.vendor?._id === user?.id)) {
      // Navigate to vendor property details page
      navigate(`/vendor/properties/details/${property._id}`);
    } else {
      // Navigate to public property preview - allows viewing basic details
      // If authenticated, will auto-redirect to customer property page with full features
      navigate(`/property/${property._id}`);
    }
  };

  const handleMessageClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${property._id}`, action: 'message' } });
      return;
    }
    if (hasWhatsAppSupport) {
      setShowWhatsAppDialog(true);
    } else {
      setShowMessageDialog(true);
    }
  };

  const handleContactClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${property._id}`, action: 'contact' } });
      return;
    }
    if (hasWhatsAppSupport) {
      setShowWhatsAppDialog(true);
    } else {
      setShowContactDialog(true);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/property/${property._id}`, action: 'favorite' } });
      return;
    }

    if (loadingFavorite) return;

    try {
      setLoadingFavorite(true);
      if (isFavorited) {
        await favoriteService.removeFromFavorites(property._id);
        setIsFavorited(false);
      } else {
        await favoriteService.addToFavorites(property._id);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleInterestClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <Card className="group overflow-hidden hover:shadow-[var(--shadow-large)] transition-all duration-300 flex flex-col h-full">
      <div className="relative h-44 md:h-48 overflow-hidden">
        <img
          src={primaryImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
          }}
        />
        {property.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs py-1 px-2">
            Featured
          </Badge>
        )}
        {property.verified && (
          <Badge className="absolute top-12 left-3 bg-green-500 text-white text-xs py-1 px-2">
            Verified
          </Badge>
        )}
        <Badge
          className={`absolute top-3 ${isAuthenticated && isCustomer ? 'right-12' : 'right-3'} text-xs py-1 px-2 ${property.status === 'available' ? 'bg-green-500' :
            property.status === 'sold' ? 'bg-red-500' :
              property.status === 'rented' ? 'bg-blue-500' :
                'bg-yellow-500'
            } text-white`}
        >
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </Badge>
        {/* Only show favorite button for authenticated customer users */}
        {isAuthenticated && isCustomer && (
          <Button
            size="icon"
            variant="ghost"
            className={`absolute top-3 right-3 bg-background/80 backdrop-blur hover:bg-background ${isFavorited ? 'text-red-500' : ''}`}
            onClick={handleFavoriteClick}
            disabled={loadingFavorite}
          >
            <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>
        )}
      </div>

      <CardContent className="p-3 flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base md:text-lg line-clamp-2">{property.title}</h3>
          <Badge variant="secondary" className="text-sm">
            {property.listingType === 'sale' ? 'For Sale' :
              property.listingType === 'rent' ? 'For Rent' : 'For Lease'}
          </Badge>
        </div>

        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        <div className="text-sm text-muted-foreground mb-2 capitalize">
          {property.type ? property.type.replace('_', ' ') : 'property'}
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {getPropertyListingLabel(property)}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} BHK</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} Bath</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>{formattedArea}</span>
          </div>
        </div>

        <div className="text-xl md:text-2xl font-bold text-primary">{formattedPrice}</div>

        {property.amenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {property.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{property.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-2 pt-0 flex gap-1 text-xs">
        {!checkingWhatsApp && !hasWhatsAppSupport && (
          <>
            <Button
              variant="outline"
              className="flex-1 h-8 px-1"
              onClick={handleMessageClick}
              title="Message"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              <span className="truncate">Message</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-8 px-1"
              onClick={handleContactClick}
              title="Contact"
            >
              <Phone className="w-3 h-3 mr-1" />
              <span className="truncate">Contact</span>
            </Button>
            {isAuthenticated && isCustomer && (
              <Button
                variant="outline"
                className="flex-1 h-8 px-1"
                onClick={handleInterestClick}
                title="Interest"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                <span className="truncate">Interest</span>
              </Button>
            )}
          </>
        )}

        {!checkingWhatsApp && hasWhatsAppSupport && (
          <Button
            variant="outline"
            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 py-2"
            onClick={() => setShowWhatsAppDialog(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp Contact
          </Button>
        )}

        <Button
          className="flex-1 py-2"
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </CardFooter>

      {/* Message Dialog */}
      <PropertyMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        property={property}
        onMessageSent={() => {
          console.log("Message sent for property:", property._id);
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
    </Card>
  );
};

export default PropertyCard;