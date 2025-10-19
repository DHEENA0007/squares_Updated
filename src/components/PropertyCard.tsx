import { Heart, MapPin, Bed, Bath, Square } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertyCardProps {
  title: string;
  location: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  type: string;
  image: string;
  featured?: boolean;
}

const PropertyCard = ({
  title,
  location,
  price,
  bedrooms,
  bathrooms,
  area,
  type,
  image,
  featured
}: PropertyCardProps) => {
  return (
    <Card className="group overflow-hidden hover:shadow-[var(--shadow-large)] transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
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
          <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
          <Badge variant="secondary">{type}</Badge>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{bedrooms} BHK</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{bathrooms} Bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>{area}</span>
          </div>
        </div>
        
        <div className="text-2xl font-bold text-primary">{price}</div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button variant="outline" className="flex-1">Contact Owner</Button>
        <Button className="flex-1">View Details</Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
