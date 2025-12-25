import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, RotateCcw, Eye, MapPin, Calendar, User, AlertCircle, Building2, Bed, Bath, Maximize, Filter, X } from "lucide-react";
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
import { VirtualTourViewer } from "@/components/property/VirtualTourViewer";
import { configurationService } from "@/services/configurationService";
import { PropertyType, FilterConfiguration } from "@/types/configuration";

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
  videos?: Array<{ url?: string; caption?: string; thumbnail?: string }>;
  virtualTour?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  address: {
    city: string;
    district?: string;
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
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Filter states
  const [propertyType, setPropertyType] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [approvalStatus, setApprovalStatus] = useState("rejected");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic filter options
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyType[]>([]);
  const [listingTypeOptions, setListingTypeOptions] = useState<FilterConfiguration[]>([]);
  const [statusOptions, setStatusOptions] = useState<FilterConfiguration[]>([]);



  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [types, listingTypes, statuses] = await Promise.all([
          configurationService.getAllPropertyTypes(),
          configurationService.getFilterConfigurationsByType('listing_type'),
          configurationService.getFilterConfigurationsByType('property_status')
        ]);
        setPropertyTypeOptions(types);
        setListingTypeOptions(listingTypes);
        setStatusOptions(statuses);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Reactivation approval form state
  const [approverName, setApproverName] = useState("");
  const [checklist, setChecklist] = useState({
    issuesResolved: false,
    documentsUpdated: false,
    complianceChecked: false,
    qualityImproved: false,
    accuracyVerified: false,
    readyForReview: false,
  });
  const [handwrittenComments, setHandwrittenComments] = useState("");

  useEffect(() => {
    fetchRejectedProperties();
  }, [currentPage, searchTerm, propertyType, listingType, approvalStatus, startDate, endDate]);

  const fetchRejectedProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      if (searchTerm) params.append('search', searchTerm);
      if (propertyType && propertyType !== 'all') params.append('type', propertyType);
      if (listingType && listingType !== 'all') params.append('listingType', listingType);
      if (approvalStatus && approvalStatus !== 'all') params.append('status', approvalStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetchWithAuth(`/subadmin/properties/rejected?${params.toString()}`);
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

  const resetApprovalForm = () => {
    setChecklist({
      issuesResolved: false,
      documentsUpdated: false,
      complianceChecked: false,
      qualityImproved: false,
      accuracyVerified: false,
      readyForReview: false,
    });
    setHandwrittenComments("");
    setApproverName("");
  };

  const openReactivateDialog = (property: Property) => {
    setSelectedProperty(property);
    resetApprovalForm();
    setReactivateDialogOpen(true);
  };

  const handleReactivate = async () => {
    if (!selectedProperty || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Moderator name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: true });
      const response = await fetchWithAuth(`/subadmin/properties/${selectedProperty._id}/reactivate`, {
        method: 'POST',
        body: JSON.stringify({
          approver: approverName,
          notes: handwrittenComments
        })
      });

      await handleApiResponse(response);
      toast({
        title: "Success",
        description: "Property reactivated and moved to pending review",
      });
      setReactivateDialogOpen(false);
      resetApprovalForm();
      setSelectedProperty(null);
      fetchRejectedProperties();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reactivate property",
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search rejected properties by title, city, state, email, or description..."
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
                {(propertyType !== 'all' || listingType !== 'all' || approvalStatus !== 'all' || startDate || endDate) && (
                  <Badge variant="secondary" className="ml-1">
                    {[propertyType !== 'all', listingType !== 'all', approvalStatus !== 'all', startDate, endDate].filter(Boolean).length}
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
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="available">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="rented">Rented</SelectItem>
                      <SelectItem value="leased">Leased</SelectItem>
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

                {(propertyType !== 'all' || listingType !== 'all' || approvalStatus !== 'all' || startDate || endDate) && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropertyType('all');
                        setListingType('all');
                        setApprovalStatus('rejected');
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

      {/* Rejected Properties Table */}
      <Card>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Rejected Properties</h3>
              <p className="text-muted-foreground text-center">
                There are no rejected properties at the moment
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px] text-center">S.No.</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="max-w-[200px]">Rejection Reason</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-center">Rejected On</TableHead>
                    <TableHead className="text-center w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property, index) => (
                    <TableRow key={property._id} className="hover:bg-muted/30">
                      {/* S.No. */}
                      <TableCell className="text-center font-medium">
                        {(currentPage - 1) * 10 + index + 1}
                      </TableCell>

                      {/* Property Title */}
                      <TableCell>
                        <div className="max-w-[180px]">
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
                        <div className="max-w-[130px]">
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

                      {/* Rejection Reason */}
                      <TableCell>
                        <div className="max-w-[200px]">
                          {property.rejectionReason ? (
                            <div className="flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2" title={property.rejectionReason}>
                                  {property.rejectionReason}
                                </p>
                                {property.rejectedBy && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    by {property.rejectedBy.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        <div className="max-w-[130px]">
                          <p className="text-sm font-medium truncate" title={property.owner.name}>
                            {property.owner.name || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={property.owner.email}>
                            {property.owner.email}
                          </p>
                        </div>
                      </TableCell>

                      {/* Rejected Date */}
                      <TableCell className="text-center">
                        <p className="text-sm text-muted-foreground">
                          {property.rejectedAt
                            ? new Date(property.rejectedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            })
                            : 'N/A'}
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
                            variant="secondary"
                            onClick={() => openReactivateDialog(property)}
                            disabled={actionLoading[property._id]}
                            className="h-8 px-2"
                            title="Reactivate"
                          >
                            <RotateCcw className="h-4 w-4" />
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
                  setViewDialogOpen(false);
                  openReactivateDialog(selectedProperty);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reactivate for Review
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivation Approval Dialog */}
      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reactivate Property for Review</DialogTitle>
            <DialogDescription>
              Complete the verification checklist to reactivate "{selectedProperty?.title}" for review. The property will move to pending status for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Approver Name */}
            <div className="space-y-2">
              <Label htmlFor="approver-name-reactivate">Moderator Name *</Label>
              <Input
                id="approver-name-reactivate"
                placeholder="Enter your full name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Reactivation Verification Checklist</Label>
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="issues-resolved"
                    checked={checklist.issuesResolved}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, issuesResolved: checked as boolean })
                    }
                  />
                  <label htmlFor="issues-resolved" className="text-sm font-medium cursor-pointer">
                    Previous rejection issues have been resolved
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="documents-updated"
                    checked={checklist.documentsUpdated}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, documentsUpdated: checked as boolean })
                    }
                  />
                  <label htmlFor="documents-updated" className="text-sm font-medium cursor-pointer">
                    Required documents are updated and complete
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="compliance-checked"
                    checked={checklist.complianceChecked}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, complianceChecked: checked as boolean })
                    }
                  />
                  <label htmlFor="compliance-checked" className="text-sm font-medium cursor-pointer">
                    Property meets all compliance requirements
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="quality-improved"
                    checked={checklist.qualityImproved}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, qualityImproved: checked as boolean })
                    }
                  />
                  <label htmlFor="quality-improved" className="text-sm font-medium cursor-pointer">
                    Content quality has been improved
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="accuracy-verified"
                    checked={checklist.accuracyVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, accuracyVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="accuracy-verified" className="text-sm font-medium cursor-pointer">
                    Information accuracy has been verified
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ready-review"
                    checked={checklist.readyForReview}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, readyForReview: checked as boolean })
                    }
                  />
                  <label htmlFor="ready-review" className="text-sm font-medium cursor-pointer">
                    Property is ready for approval review
                  </label>
                </div>
              </div>
            </div>

            {/* Handwritten Comments */}
            <div className="space-y-2">
              <Label htmlFor="handwritten-comments-reactivate">Reactivation Notes & Comments</Label>
              <Textarea
                id="handwritten-comments-reactivate"
                placeholder="Type your handwritten comments or notes here..."
                value={handwrittenComments}
                onChange={(e) => setHandwrittenComments(e.target.value)}
                className="mt-1 min-h-[120px] font-handwriting"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Add any additional observations, changes made, or special notes about the reactivation
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleReactivate}
              disabled={!approverName.trim() || actionLoading[selectedProperty?._id || ""]}
            >
              {actionLoading[selectedProperty?._id || ""] ? 'Reactivating...' : 'Reactivate Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyRejections;

