import { Property } from "@/services/propertyService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Home, Bed, Bath, Maximize, IndianRupee } from "lucide-react";
import { getOwnerDisplayName, isAdminUser } from "@/utils/propertyUtils";
import { VirtualTourViewer } from "@/components/property/VirtualTourViewer";

interface ViewPropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewPropertyDialog = ({ property, open, onOpenChange }: ViewPropertyDialogProps) => {
  if (!property) return null;

  const formatPrice = (price: number, listingType: string) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(price);
    
    return listingType === 'rent' ? `₹${formatted}/month` : `₹${formatted}`;
  };

  const formatArea = (area: any) => {
    if (area?.builtUp) {
      return `${area.builtUp} ${area.unit || 'sqft'}`;
    }
    if (area?.carpet) {
      return `${area.carpet} ${area.unit || 'sqft'}`;
    }
    if (area?.plot) {
      return `${area.plot} ${area.unit || 'sqft'}`;
    }
    return 'N/A';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.title}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              {property.address.street}, {property.address.city}, {property.address.state} - {property.address.pincode}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Type Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={property.status === 'available' ? 'default' : property.status === 'pending' ? 'outline' : 'destructive'}>
              Status: {property.status}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {property.type ? property.type.replace('_', ' ') : 'property'}
            </Badge>
            <Badge variant={property.listingType === 'sale' ? 'default' : 'outline'}>
              For {property.listingType === 'sale' ? 'Sale' : 'Rent'}
            </Badge>
            {property.featured && <Badge variant="default">Featured</Badge>}
            {property.verified && <Badge variant="default">Verified</Badge>}
          </div>

          {/* Price and Key Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-semibold">{formatPrice(property.price, property.listingType)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Maximize className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="font-semibold">{formatArea(property.area)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Bedrooms</p>
                <p className="font-semibold">{property.bedrooms || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Bathrooms</p>
                <p className="font-semibold">{property.bathrooms || 'N/A'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="capitalize">
                      {amenity.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Owner Information */}
          <Separator />
          <div>
            <h3 className="font-semibold mb-2">Owner Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">
                  {getOwnerDisplayName(property.owner)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{property.owner?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact Number</p>
                <p className="font-medium">{property.owner?.profile?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Images */}
          {property.images && property.images.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {property.images.map((image, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                      <img 
                        src={image.url} 
                        alt={image.caption || `Property ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.isPrimary && (
                        <Badge className="absolute top-2 left-2" variant="default">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Videos */}
          {property.videos && property.videos.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Videos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.videos.map((video, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
                        {video.url.includes('youtube.com') || video.url.includes('youtu.be') ? (
                          <iframe
                            src={video.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                            className="w-full h-full"
                            allowFullScreen
                            title={video.caption || `Video ${index + 1}`}
                          />
                        ) : (
                          <video
                            src={video.url}
                            controls
                            className="w-full h-full object-contain"
                            poster={video.thumbnail}
                          />
                        )}
                      </div>
                      {video.caption && (
                        <p className="text-sm text-muted-foreground">{video.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Virtual Tour */}
          {property.virtualTour && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Virtual Tour</h3>
                <VirtualTourViewer url={property.virtualTour} />
              </div>
            </>
          )}

          {/* Rejection Reason (if rejected) */}
          {property.status === 'rejected' && property.rejectionReason && (
            <>
              <Separator />
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-700 mb-2">Rejection Reason</h3>
                <p className="text-sm text-red-600">{property.rejectionReason}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
