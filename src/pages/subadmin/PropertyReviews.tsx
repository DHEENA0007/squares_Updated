import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, XCircle, Eye, MapPin, Calendar, User, Bed, Bath, Maximize, IndianRupee, Home, Building2, Filter, X } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { configurationService } from "@/services/configurationService";
import { PropertyType, FilterConfiguration } from "@/types/configuration";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://app.buildhomemartsquares.com/api";

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
  const { user } = useAuth();
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

  // Filter states
  const [propertyType, setPropertyType] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic filter options
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyType[]>([]);
  const [listingTypeOptions, setListingTypeOptions] = useState<FilterConfiguration[]>([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [types, listingTypes] = await Promise.all([
          configurationService.getAllPropertyTypes(),
          configurationService.getFilterConfigurationsByType('listing_type')
        ]);
        setPropertyTypeOptions(types);
        setListingTypeOptions(listingTypes);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Auto-populate approver name from logged-in user
  const getApproverName = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    } else if (user?.profile?.firstName) {
      return user.profile.firstName;
    } else if (user?.email) {
      return user.email;
    }
    return '';
  };

  // Approval/Rejection form state
  const [approverName, setApproverName] = useState(getApproverName());
  const [checklist, setChecklist] = useState({
    documentsVerified: false,
    locationVerified: false,
    priceReasonable: false,
    imagesQuality: false,
    descriptionComplete: false,
    ownershipConfirmed: false,
  });
  const [handwrittenComments, setHandwrittenComments] = useState("");

  // Update approver name when user data loads
  useEffect(() => {
    const name = getApproverName();
    if (name) {
      setApproverName(name);
    }
  }, [user]);

  useEffect(() => {
    fetchProperties();
  }, [currentPage, searchTerm, propertyType, listingType, startDate, endDate]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      if (searchTerm) params.append('search', searchTerm);
      if (propertyType && propertyType !== 'all') params.append('type', propertyType);
      if (listingType && listingType !== 'all') params.append('listingType', listingType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetchWithAuth(`/subadmin/properties/pending?${params.toString()}`);
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
    setApproverName(getApproverName()); // Keep user's name
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties by title or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(propertyType !== 'all' || listingType !== 'all' || startDate || endDate) && (
                  <Badge variant="secondary" className="ml-1">
                    {[propertyType !== 'all', listingType !== 'all', startDate, endDate].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-3 border-t">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {propertyTypeOptions.map((type) => (
                        <SelectItem key={type._id} value={type.value}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Listing Type</Label>
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {listingTypeOptions.length > 0 ? (
                        listingTypeOptions.map((type) => (
                          <SelectItem key={type._id} value={type.value}>
                            {type.displayLabel || type.name}
                          </SelectItem>
                        ))
                      ) : (
                        // Fallback if no dynamic options found
                        <>
                          <SelectItem value="sale">Sale</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="lease">Lease</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-[150px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full sm:w-[150px]"
                  />
                </div>

                {(propertyType !== 'all' || listingType !== 'all' || startDate || endDate) && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropertyType('all');
                        setListingType('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">No Pending Properties</h3>
              <p className="text-muted-foreground text-center">
                All properties have been reviewed. Great job!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px] text-center">S.No.</TableHead>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-center w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property, index) => (
                    <TableRow key={property._id} className="hover:bg-muted/30">
                      {/* S.No. */}
                      <TableCell className="text-center font-medium">
                        {(currentPage - 1) * 10 + index + 1}
                      </TableCell>
                      {/* Image */}
                      <TableCell className="p-2">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={getImageUrl(property.images[0])}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PROPERTY_IMAGE;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Property Title */}
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm truncate" title={property.title}>
                            {property.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {property.bedrooms > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Bed className="h-3 w-3" /> {property.bedrooms}
                              </span>
                            )}
                            {property.bathrooms > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-2">
                                <Bath className="h-3 w-3" /> {property.bathrooms}
                              </span>
                            )}
                            {(property.area.builtUp || property.area.plot || property.area.carpet) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-2">
                                <Maximize className="h-3 w-3" /> {formatArea(property.area)}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="text-sm truncate" title={`${property.address.city}, ${property.address.state}`}>
                            {property.address.city}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {property.address.district ? `${property.address.district}, ` : ''}{property.address.state}
                          </p>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {property.type}
                          </Badge>
                          <Badge variant={property.listingType === 'sale' ? 'default' : 'secondary'} className="text-xs">
                            {property.listingType === 'sale' ? 'Sale' : property.listingType === 'rent' ? 'Rent' : 'Lease'}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right">
                        <p className="font-bold text-primary text-sm">
                          {formatPrice(property.price)}
                        </p>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="text-sm font-medium truncate" title={property.owner?.profile?.firstName ? `${property.owner.profile.firstName} ${property.owner.profile.lastName || ''}` : property.owner.name}>
                            {property.owner?.profile?.firstName
                              ? `${property.owner.profile.firstName} ${property.owner.profile.lastName || ''}`
                              : property.owner.name || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={property.owner.email}>
                            {property.owner.email}
                          </p>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-center">
                        <p className="text-sm text-muted-foreground">
                          {new Date(property.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </p>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProperty(property);
                              setViewDialogOpen(true);
                            }}
                            className="h-8 px-2"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openApproveDialog(property)}
                            disabled={actionLoading[property._id]}
                            className="h-8 px-2 bg-green-600 hover:bg-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openRejectDialog(property)}
                            disabled={actionLoading[property._id]}
                            className="h-8 px-2"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {properties.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, (currentPage - 1) * 10 + properties.length)} of {totalPages * 10} properties
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Label>Approver Name</Label>
              <div className="p-3 rounded-md bg-muted border border-border mt-1">
                <p className="font-medium text-sm">{approverName || 'Loading...'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically set from your logged-in account
              </p>
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
              <Label>Approver Name</Label>
              <div className="p-3 rounded-md bg-muted border border-border mt-1">
                <p className="font-medium text-sm">{approverName || 'Loading...'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically set from your logged-in account
              </p>
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