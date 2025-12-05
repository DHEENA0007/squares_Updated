import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CheckCircle, XCircle, Eye, MapPin, Calendar, User, Bed, Bath, Maximize, IndianRupee, Home } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

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
  amenities?: string[];
  featured?: boolean;
  verified?: boolean;
  owner: {
    _id: string;
    name: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
  address: {
    city: string;
    district?: string;
    state: string;
    street: string;
    zipCode: string;
    pincode?: string;
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
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Approval/Rejection form state
  const [approverName, setApproverName] = useState("");
  const [checklist, setChecklist] = useState({
    documentsVerified: false,
    locationVerified: false,
    priceReasonable: false,
    imagesQuality: false,
    descriptionComplete: false,
    ownershipConfirmed: false,
  });
  const [handwrittenComments, setHandwrittenComments] = useState("");

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

  const resetApprovalForm = () => {
    setChecklist({
      documentsVerified: false,
      locationVerified: false,
      priceReasonable: false,
      imagesQuality: false,
      descriptionComplete: false,
      ownershipConfirmed: false,
    });
    setHandwrittenComments("");
    setApproverName("");
    setRejectionReason("");
  };

  const openApproveDialog = (property: Property) => {
    setSelectedProperty(property);
    resetApprovalForm();
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (property: Property) => {
    setSelectedProperty(property);
    resetApprovalForm();
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedProperty || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${selectedProperty._id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approver: approverName,
          notes: handwrittenComments
        })
      });

      await handleApiResponse(response);

      toast({
        title: "Success",
        description: "Property approved successfully",
      });
      setApproveDialogOpen(false);
      resetApprovalForm();
      setSelectedProperty(null);
      fetchProperties();
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve property",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: false });
    }
  };

  const handleReject = async () => {
    if (!selectedProperty || !rejectionReason.trim() || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name and rejection reason are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${selectedProperty._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: rejectionReason,
          approver: approverName,
          notes: handwrittenComments
        })
      });

      await handleApiResponse(response);

      toast({
        title: "Success",
        description: "Property rejected successfully",
      });
      setRejectDialogOpen(false);
      resetApprovalForm();
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
                          <span className="truncate">{property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}</span>
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
                    onClick={() => openApproveDialog(property)}
                    disabled={actionLoading[property._id]}
                    className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 touch-manipulation"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openRejectDialog(property)}
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

      {/* Approval Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Property</DialogTitle>
            <DialogDescription>
              Complete the verification checklist and provide your approval for "{selectedProperty?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Approver Name */}
            <div className="space-y-2">
              <Label htmlFor="approver-name-approve">Moderator Name *</Label>
              <Input
                id="approver-name-approve"
                placeholder="Enter your full name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Verification Checklist</Label>
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="documents-approve"
                    checked={checklist.documentsVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, documentsVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="documents-approve" className="text-sm font-medium cursor-pointer">
                    All required documents are verified
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="location-approve"
                    checked={checklist.locationVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, locationVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="location-approve" className="text-sm font-medium cursor-pointer">
                    Property location is verified and accurate
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="price-approve"
                    checked={checklist.priceReasonable}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, priceReasonable: checked as boolean })
                    }
                  />
                  <label htmlFor="price-approve" className="text-sm font-medium cursor-pointer">
                    Price is reasonable and competitive
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="images-approve"
                    checked={checklist.imagesQuality}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, imagesQuality: checked as boolean })
                    }
                  />
                  <label htmlFor="images-approve" className="text-sm font-medium cursor-pointer">
                    Images are of good quality and relevant
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="description-approve"
                    checked={checklist.descriptionComplete}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, descriptionComplete: checked as boolean })
                    }
                  />
                  <label htmlFor="description-approve" className="text-sm font-medium cursor-pointer">
                    Description is complete and accurate
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ownership-approve"
                    checked={checklist.ownershipConfirmed}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, ownershipConfirmed: checked as boolean })
                    }
                  />
                  <label htmlFor="ownership-approve" className="text-sm font-medium cursor-pointer">
                    Ownership is confirmed and legitimate
                  </label>
                </div>
              </div>
            </div>

            {/* Handwritten Comments */}
            <div className="space-y-2">
              <Label htmlFor="handwritten-comments-approve">Approval Notes & Comments</Label>
              <Textarea
                id="handwritten-comments-approve"
                placeholder="Type your handwritten comments or notes here..."
                value={handwrittenComments}
                onChange={(e) => setHandwrittenComments(e.target.value)}
                className="mt-1 min-h-[120px] font-handwriting"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Add any additional observations, recommendations, or special notes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={!approverName.trim() || actionLoading[selectedProperty?._id || ""]}
            >
              {actionLoading[selectedProperty?._id || ""] ? 'Approving...' : 'Approve Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>
              Complete the form and provide a reason for rejecting "{selectedProperty?.title}". The vendor will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Approver Name */}
            <div className="space-y-2">
              <Label htmlFor="approver-name-reject">Moderator Name *</Label>
              <Input
                id="approver-name-reject"
                placeholder="Enter your full name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Issues Found (Check applicable items)</Label>
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="documents-reject"
                    checked={checklist.documentsVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, documentsVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="documents-reject" className="text-sm font-medium cursor-pointer">
                    Documents are incomplete or invalid
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="location-reject"
                    checked={checklist.locationVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, locationVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="location-reject" className="text-sm font-medium cursor-pointer">
                    Property location is incorrect or unclear
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="price-reject"
                    checked={checklist.priceReasonable}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, priceReasonable: checked as boolean })
                    }
                  />
                  <label htmlFor="price-reject" className="text-sm font-medium cursor-pointer">
                    Price is unreasonable or suspicious
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="images-reject"
                    checked={checklist.imagesQuality}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, imagesQuality: checked as boolean })
                    }
                  />
                  <label htmlFor="images-reject" className="text-sm font-medium cursor-pointer">
                    Images are poor quality or irrelevant
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="description-reject"
                    checked={checklist.descriptionComplete}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, descriptionComplete: checked as boolean })
                    }
                  />
                  <label htmlFor="description-reject" className="text-sm font-medium cursor-pointer">
                    Description is incomplete or misleading
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ownership-reject"
                    checked={checklist.ownershipConfirmed}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, ownershipConfirmed: checked as boolean })
                    }
                  />
                  <label htmlFor="ownership-reject" className="text-sm font-medium cursor-pointer">
                    Ownership cannot be confirmed
                  </label>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Handwritten Comments */}
            <div className="space-y-2">
              <Label htmlFor="handwritten-comments-reject">Additional Comments</Label>
              <Textarea
                id="handwritten-comments-reject"
                placeholder="Type your handwritten comments or notes here..."
                value={handwrittenComments}
                onChange={(e) => setHandwrittenComments(e.target.value)}
                className="mt-1 min-h-[120px] font-handwriting"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Add any additional feedback or suggestions for the vendor
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || !approverName.trim() || actionLoading[selectedProperty?._id || ""]}
            >
              {actionLoading[selectedProperty?._id || ""] ? 'Rejecting...' : 'Reject Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProperty?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4" />
                {selectedProperty?.address.street}, {selectedProperty?.address.city}, {selectedProperty?.address.state} - {selectedProperty?.address.pincode || selectedProperty?.address.zipCode}
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6 mt-4">
              {/* Status and Type Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedProperty.status === 'available' ? 'default' : selectedProperty.status === 'pending' ? 'outline' : 'destructive'}>
                  Status: {selectedProperty.status}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {selectedProperty.type ? selectedProperty.type.replace('_', ' ') : 'property'}
                </Badge>
                <Badge variant={selectedProperty.listingType === 'sale' ? 'default' : 'outline'}>
                  For {selectedProperty.listingType === 'sale' ? 'Sale' : 'Rent'}
                </Badge>
                {selectedProperty.featured && <Badge variant="default">Featured</Badge>}
                {selectedProperty.verified && <Badge variant="default">Verified</Badge>}
              </div>

              {/* Price and Key Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold">{formatPrice(selectedProperty.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="font-semibold">{formatArea(selectedProperty.area)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                    <p className="font-semibold">{selectedProperty.bedrooms || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                    <p className="font-semibold">{selectedProperty.bathrooms || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{selectedProperty.description}</p>
              </div>

              {/* Amenities */}
              {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, index) => (
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedProperty.owner?.profile?.firstName && selectedProperty.owner?.profile?.lastName
                        ? `${selectedProperty.owner.profile.firstName} ${selectedProperty.owner.profile.lastName}`
                        : selectedProperty.owner.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedProperty.owner?.email}</p>
                  </div>
                  {selectedProperty.owner?.profile?.phone && (
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedProperty.owner.profile.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedProperty.images.map((image, index) => {
                        const imageObj = typeof image === 'object' ? image : { url: image };
                        return (
                          <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                            <img
                              src={getImageUrl(image)}
                              alt={imageObj.caption || `Property ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
                              }}
                            />
                            {imageObj.isPrimary && (
                              <Badge className="absolute top-2 left-2" variant="default">Primary</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Videos */}
              {selectedProperty.videos && selectedProperty.videos.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Videos</h3>
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
                            <p className="text-sm text-muted-foreground">{video.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Virtual Tour */}
              {selectedProperty.virtualTour && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Virtual Tour</h3>
                    <VirtualTourViewer url={selectedProperty.virtualTour} />
                  </div>
                </>
              )}

              {/* Rejection Reason (if rejected) */}
              {selectedProperty.status === 'rejected' && selectedProperty.rejectionReason && (
                <>
                  <Separator />
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-700 mb-2">Rejection Reason</h3>
                    <p className="text-sm text-red-600">{selectedProperty.rejectionReason}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyReviews;