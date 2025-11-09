import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RotateCcw, Eye, MapPin, Calendar, User, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

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
  images: string[];
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
  rejectedAt?: string;
  rejectedBy?: {
    name: string;
    email: string;
  };
}

const PropertyRejections = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRejectedProperties();
  }, [currentPage, searchTerm]);

  const fetchRejectedProperties = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/properties/rejected?page=${currentPage}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { properties: Property[], totalPages: number } }>(response);
      setProperties(data.data.properties || []);
      setTotalPages(data.data.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching rejected properties:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching rejected properties",
        variant: "destructive",
      });
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates
  useRealtimeEvent('property_rejected', (data) => {
    toast({
      title: "Property Rejected",
      description: "A property has been rejected",
    });
    fetchRejectedProperties();
  });

  const handleReactivate = async (propertyId: string) => {
    try {
      setActionLoading({ ...actionLoading, [propertyId]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${propertyId}/reactivate`, {
        method: 'POST'
      });
      
      await handleApiResponse(response);
      toast({
        title: "Success",
        description: "Property reactivated and moved to pending review",
      });
      fetchRejectedProperties();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reactivate property",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [propertyId]: false });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
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
          <h1 className="text-3xl font-bold">Property Rejections</h1>
          <p className="text-muted-foreground mt-1">
            View and manage rejected property listings
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
        <h1 className="text-3xl font-bold">Property Rejections</h1>
        <p className="text-muted-foreground mt-1">
          View and manage rejected property listings
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search rejected properties by title or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Rejected Properties List */}
      <div className="space-y-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Rejected Properties</h3>
              <p className="text-muted-foreground text-center">
                There are no rejected properties at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card key={property._id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-xl">{property.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address.city}, {property.address.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Rejected: {property.rejectedAt ? new Date(property.rejectedAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {property.owner.email}
                        </span>
                      </div>
                    </CardDescription>
                    {property.rejectionReason && (
                      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">Rejection Reason:</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{property.rejectionReason}</p>
                            {property.rejectedBy && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Rejected by: {property.rejectedBy.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(property.price)}
                    </div>
                    <Badge variant="destructive" className="mt-1">
                      Rejected
                    </Badge>
                    <Badge variant="outline" className="mt-1 ml-1">
                      {property.type} • {property.listingType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReactivate(property._id)}
                    disabled={actionLoading[property._id]}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reactivate for Review
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

      {/* View Property Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
            <DialogDescription>
              Rejected property details and information
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              {selectedProperty.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100">Rejection Reason:</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{selectedProperty.rejectionReason}</p>
                      {selectedProperty.rejectedBy && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          Rejected by: {selectedProperty.rejectedBy.name} ({selectedProperty.rejectedBy.email})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
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
                        src={image}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            {selectedProperty && (
              <Button
                variant="secondary"
                onClick={() => {
                  handleReactivate(selectedProperty._id);
                  setViewDialogOpen(false);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reactivate for Review
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyRejections;

