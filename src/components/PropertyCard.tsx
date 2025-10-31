import { Heart, MapPin, Bed, Bath, Square } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Property, propertyService } from "@/services/propertyService";
import { DEFAULT_PROPERTY_IMAGE } from "@/utils/imageUtils";

interface PropertyCardProps {
  property: Property;
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const primaryImage = propertyService.getPrimaryImage(property);
  const formattedPrice = propertyService.formatPrice(property.price, property.listingType);
  const formattedArea = propertyService.formatArea(property.area);
  const location = `${property.address.city}, ${property.address.state}`;

  return (
    <Card className="group overflow-hidden hover:shadow-[var(--shadow-large)] transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={primaryImage} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
          }}
        />
        {property.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
        {property.verified && (
          <Badge className="absolute top-3 left-3 mt-8 bg-green-500 text-white">
            Verified
          </Badge>
        )}
        <Badge 
          className={`absolute top-3 right-12 ${
            property.status === 'available' ? 'bg-green-500' : 
            property.status === 'sold' ? 'bg-red-500' : 
            property.status === 'rented' ? 'bg-blue-500' : 
            'bg-yellow-500'
          } text-white`}
        >
          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
        </Badge>
        <Button 
          size="icon" 
          variant="ghost" 
          className="absolute top-3 right-3 bg-background/80 backdrop-blur hover:bg-background"
        >
          <Heart className="h-5 w-5" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
          <Badge variant="secondary">
            {property.listingType === 'sale' ? 'For Sale' : 
             property.listingType === 'rent' ? 'For Rent' : 'For Lease'}
          </Badge>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        <div className="text-xs text-muted-foreground mb-3 capitalize">
          {property.type.replace('_', ' ')}
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
        
        <div className="text-2xl font-bold text-primary">{formattedPrice}</div>
        
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
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button variant="outline" className="flex-1">
          Contact {property.agent ? 'Agent' : 'Owner'}
        </Button>
        <Button className="flex-1">View Details</Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
