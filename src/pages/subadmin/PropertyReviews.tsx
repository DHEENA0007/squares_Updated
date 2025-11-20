import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Eye, MapPin, Calendar, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { DEFAULT_PROPERTY_IMAGE } from "@/utils/imageUtils";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";
import { VirtualTourViewer } from "@/components/property/VirtualTourViewer";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

const getImageUrl = (image: string | { url?: string } | undefined): string => {
  if (!image) return DEFAULT_PROPERTY_IMAGE;
  
  // Handle object format {url: "...", caption: "...", isPrimary: false}
  const imagePath = typeof image === 'object' ? image.url : image;
  
  if (!imagePath || typeof imagePath !== 'string') return DEFAULT_PROPERTY_IMAGE;
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Remove /api prefix if present and construct full URL
  const cleanPath = imagePath.startsWith('/api') ? imagePath.substring(4) : imagePath;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${cleanPath}`;
};

interface Property {
  _id: string;
  title: string;
  description: string;
  type: string;
  listingType: string;
  price: number;
  area: {
    builtUp?: number;
    carpet?: number;
    plot?: number;
    unit: 'sqft' | 'sqm' | 'acre';
  };
  bedrooms: number;
  bathrooms: number;
  status: 'pending' | 'available' | 'rejected';
  images: Array<{ url?: string; caption?: string; isPrimary?: boolean } | string>;
  videos?: Array<{ url?: string; caption?: string; thumbnail?: string }>;
  virtualTour?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  address: {
    city: string;
    state: string;
    street: string;
    zipCode: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

const PropertyReviews = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, [currentPage, searchTerm]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/properties/pending?page=${currentPage}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { properties: Property[], totalPages: number } }>(response);
      
      setProperties(data.data.properties || []);
      setTotalPages(data.data.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching properties",
        variant: "destructive",
      });
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  useRealtimeEvent('property_created', (data) => {
    toast({
      title: "New Property",
      description: "A new property has been submitted for review",
    });
    fetchProperties();
  });

  useRealtimeEvent('property_updated', (data) => {
    fetchProperties();
  });

  const handleApprove = async (propertyId: string) => {
    try {
      setActionLoading({ ...actionLoading, [propertyId]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${propertyId}/approve`, {
        method: 'POST',
      });
      
      await handleApiResponse(response);
      
      toast({
        title: "Success",
        description: "Property approved successfully",
      });
      fetchProperties();
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve property",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [propertyId]: false });
    }
  };

  const handleReject = async () => {
    if (!selectedProperty || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${selectedProperty._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      await handleApiResponse(response);
      
      toast({
        title: "Success",
        description: "Property rejected successfully",
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedProperty(null);
      fetchProperties();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: false });
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
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

  if (loading && properties.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Property Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve property listings
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Property Reviews</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve property listings
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties by title or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">No Pending Properties</h3>
              <p className="text-muted-foreground text-center">
                All properties have been reviewed. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card key={property._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Property Thumbnail */}
                  {property.images && property.images.length > 0 && (
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <img
                        src={getImageUrl(property.images[0])}
                        alt={property.title}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <CardTitle className="text-lg sm:text-xl leading-tight">{property.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{property.address.city}, {property.address.state}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          {new Date(property.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{property.owner.email}</span>
                        </span>
                      </div>
                    </CardDescription>
                  </div>

                  <div className="text-center sm:text-right flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {formatPrice(property.price)}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {property.type} • {property.listingType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setViewDialogOpen(true);
                    }}
                    className="flex-1 min-w-[120px] touch-manipulation"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(property._id)}
                    disabled={actionLoading[property._id]}
                    className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 touch-manipulation"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setRejectDialogOpen(true);
                    }}
                    disabled={actionLoading[property._id]}
                    className="flex-1 min-w-[120px] touch-manipulation"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this property listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedProperty?.title}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedProperty?.address.city}, {selectedProperty?.address.state}
              </p>
            </div>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading[selectedProperty?._id || ""]}
            >
              Reject Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
            <DialogDescription>
              Property details and information
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Property Details</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Type:</strong> {selectedProperty.type}</li>
                    <li><strong>Listing Type:</strong> {selectedProperty.listingType}</li>
                    <li><strong>Price:</strong> {formatPrice(selectedProperty.price)}</li>
                    <li><strong>Area:</strong> {formatArea(selectedProperty.area)}</li>
                    <li><strong>Bedrooms:</strong> {selectedProperty.bedrooms}</li>
                    <li><strong>Bathrooms:</strong> {selectedProperty.bathrooms}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">Location & Contact</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Address:</strong> {selectedProperty.address.street}</li>
                    <li><strong>City:</strong> {selectedProperty.address.city}</li>
                    <li><strong>State:</strong> {selectedProperty.address.state}</li>
                    <li><strong>Zip Code:</strong> {selectedProperty.address.zipCode}</li>
                    <li><strong>Owner:</strong> {selectedProperty.owner.name}</li>
                    <li><strong>Email:</strong> {selectedProperty.owner.email}</li>
                  </ul>
                </div>
              </div>
              {selectedProperty.description && (
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p className="text-sm">{selectedProperty.description}</p>
                </div>
              )}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedProperty.images.map((image, index) => (
                      <img
                        key={index}
                        src={getImageUrl(image)}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedProperty.videos && selectedProperty.videos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Videos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProperty.videos.map((video, index) => (
                      <div key={index} className="space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
                          {video.url && (video.url.includes('youtube.com') || video.url.includes('youtu.be')) ? (
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
                          <p className="text-xs text-muted-foreground">{video.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedProperty.virtualTour && (
                <div>
                  <h4 className="font-semibold mb-2">Virtual Tour</h4>
                  <VirtualTourViewer url={selectedProperty.virtualTour} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyReviews;