import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Property, propertyService } from "@/services/propertyService";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";
import { Loader2, Plus, MoreHorizontal, Eye, Edit, Trash2, Star, StarOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { adminPropertyService } from "@/services/adminPropertyService";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/config/permissionConfig";
import { useToast } from "@/hooks/use-toast";
import { ViewPropertyDialog } from "@/components/adminpanel/ViewPropertyDialog";
import authService from "@/services/authService";

const Properties = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    // Get current user info
    const fetchUserAndProperties = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      // Pre-fill approver name from user profile
      if (user?.profile) {
        setApproverName(`${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim());
      }
      fetchProperties();
    };
    fetchUserAndProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Use admin property service to get ALL properties including pending ones
      const response = await adminPropertyService.getProperties({
        limit: 1000, // Get all properties for admin view
      });
      
      if (response.success) {
        setProperties(response.data.properties);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.state.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || property.type === typeFilter;
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
      return matchesSearch && matchesType && matchesStatus && matchesPrice;
    });
  }, [properties, searchTerm, typeFilter, statusFilter, priceRange]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredProperties, 10);

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      await adminPropertyService.deleteProperty(selectedProperty._id);
      // Realtime update: Remove from state
      setProperties(properties.filter(p => p._id !== selectedProperty._id));
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (property: Property) => {
    try {
      await adminPropertyService.togglePropertyFeatured(property._id, !property.featured);
      // Realtime update: Update in state
      setProperties(properties.map(p => 
        p._id === property._id ? { ...p, featured: !p.featured } : p
      ));
      toast({
        title: "Success",
        description: `Property ${!property.featured ? 'marked as' : 'removed from'} featured`,
      });
    } catch (error) {
      console.error("Failed to toggle featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

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
    // Re-set approver name from current user
    if (currentUser?.profile) {
      setApproverName(`${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim());
    }
  };

  const openApproveDialog = (property: Property) => {
    setSelectedProperty(property);
    resetApprovalForm();
    setApproveDialogOpen(true);
  };

  const handleApproveProperty = async () => {
    if (!selectedProperty || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // You can extend the API to accept these additional fields
      await adminPropertyService.approveProperty(selectedProperty._id);
      // Realtime update: Update in state
      setProperties(properties.map(p =>
        p._id === selectedProperty._id ? { ...p, status: 'available', verified: true } : p
      ));
      setApproveDialogOpen(false);
      setSelectedProperty(null);
      resetApprovalForm();
      toast({
        title: "Success",
        description: "Property approved and listed successfully!",
      });
    } catch (error) {
      console.error("Failed to approve property:", error);
      toast({
        title: "Error",
        description: "Failed to approve property",
        variant: "destructive",
      });
    }
  };

  const handleRejectProperty = async () => {
    if (!selectedProperty || !rejectionReason.trim() || !approverName.trim()) {
      toast({
        title: "Error",
        description: "Approver name and rejection reason are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminPropertyService.rejectProperty(selectedProperty._id, rejectionReason);
      // Realtime update: Update in state
      setProperties(properties.map(p =>
        p._id === selectedProperty._id ? { ...p, status: 'rejected' } : p
      ));
      setRejectDialogOpen(false);
      setSelectedProperty(null);
      setRejectionReason("");
      resetApprovalForm();
      toast({
        title: "Property Rejected",
        description: "Property has been rejected and vendor has been notified.",
      });
    } catch (error) {
      console.error("Failed to reject property:", error);
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (property: Property) => {
    setSelectedProperty(property);
    setDeleteDialogOpen(true);
  };

  const openRejectDialog = (property: Property) => {
    setSelectedProperty(property);
    resetApprovalForm();
    setRejectDialogOpen(true);
  };

  const openViewDialog = (property: Property) => {
    setSelectedProperty(property);
    setViewDialogOpen(true);
  };

  // Helper function to check if property was created by admin
  const isAdminCreated = (property: Property): boolean => {
    // If property has owner with admin or superadmin role, it was created by admin
    // Properties created by vendors/agents will have owner with 'agent' role
    if (!property.owner) return false;
    
    // Check if the owner is the current admin user
    if (currentUser && property.owner._id === currentUser.id) {
      return true;
    }
    
    // For safety, also check if vendor field is empty (admin-created properties won't have vendor)
    // and status is 'available' (admin properties don't go through approval)
    return !property.vendor && property.status === 'available';
  };

  // Create extended type for DataTable
  type PropertyWithId = Property & { id: string };

  const columns: Column<PropertyWithId>[] = [
    { 
      key: "title", 
      label: "Property Title",
      render: (property) => (
        <div>
          <div className="font-medium">{property.title}</div>
          <div className="text-sm text-muted-foreground">
            {property.address.district ? `${property.address.city}, ${property.address.district}, ${property.address.state}` : `${property.address.city}, ${property.address.state}`}
          </div>
        </div>
      )
    },
    {
      key: "type",
      label: "Type",
      render: (property) => (
        <Badge variant="secondary" className="capitalize">
          {property.type ? property.type.replace('_', ' ') : 'property'}
        </Badge>
      ),
    },
    {
      key: "listingType",
      label: "Listing",
      render: (property) => (
        <Badge variant={property.listingType === 'sale' ? 'default' : 'outline'}>
          {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
        </Badge>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (property) => (
        <span className="font-semibold">
          {propertyService.formatPrice(property.price, property.listingType)}
        </span>
      ),
    },
    {
      key: "area",
      label: "Area",
      render: (property) => <span>{propertyService.formatArea(property.area)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (property) => {
        const statusColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
          available: "default",
          pending: "outline",
          rejected: "destructive",
          sold: "secondary",
          rented: "secondary",
        };
        return (
          <Badge variant={statusColors[property.status] || "secondary"}>
            {property.status}
          </Badge>
        );
      },
    },
    {
      key: "featured",
      label: "Featured",
      render: (property) => (
        <Badge variant={property.featured ? "default" : "secondary"}>
          {property.featured ? "Featured" : "Regular"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (property) => {
        const adminCreated = isAdminCreated(property);
        const isPending = property.status === 'pending';
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* View Details - Always show if user has view permission */}
              {hasPermission(PERMISSIONS.PROPERTIES_VIEW) && (
                <DropdownMenuItem onClick={() => openViewDialog(property)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              
              {/* If property created by admin - show Edit (with permission check) */}
              {adminCreated && hasPermission(PERMISSIONS.PROPERTIES_EDIT) && (
                <DropdownMenuItem onClick={() => navigate(`/admin/properties/edit/${property._id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Property
                </DropdownMenuItem>
              )}
              
              {/* Approval Actions for Pending Vendor Properties (with permission check) */}
              {!adminCreated && isPending && hasPermission(PERMISSIONS.PROPERTIES_APPROVE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openApproveDialog(property)}
                    className="text-green-600"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Approve & Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openRejectDialog(property)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}

              {/* Featured Toggle for Available Properties (with permission check) */}
              {property.status === 'available' && hasPermission(PERMISSIONS.PROPERTIES_EDIT) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleToggleFeatured(property)}>
                    {property.featured ? (
                      <>
                        <StarOff className="w-4 h-4 mr-2" />
                        Remove Featured
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 mr-2" />
                        Mark Featured
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}

              {/* Delete action (with permission check) */}
              {hasPermission(PERMISSIONS.PROPERTIES_DELETE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => openDeleteDialog(property)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading properties...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="dashboard-header-responsive">
        <div>
          <h1 className="dashboard-title-responsive">Property Management</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Manage property listings and details
          </p>
        </div>
        {hasPermission(PERMISSIONS.PROPERTIES_CREATE) && (
          <Button onClick={() => navigate("/admin/properties/add")} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="stats-card-responsive">
          <CardHeader className="pb-2">
            <CardTitle className="stats-label-responsive">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stats-value-responsive">{properties.length}</div>
          </CardContent>
        </Card>
        <Card className="stats-card-responsive">
          <CardHeader className="pb-2">
            <CardTitle className="stats-label-responsive">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stats-value-responsive text-yellow-600">
              {properties.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card className="stats-card-responsive">
          <CardHeader className="pb-2">
            <CardTitle className="stats-label-responsive">Available Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stats-value-responsive text-green-600">
              {properties.filter(p => p.status === 'available').length}
            </div>
          </CardContent>
        </Card>
        <Card className="stats-card-responsive">
          <CardHeader className="pb-2">
            <CardTitle className="stats-label-responsive">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stats-value-responsive text-blue-600">
              {properties.filter(p => p.featured).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">All Properties</CardTitle>
          <CardDescription className="text-sm md:text-base">
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="type-filter" className="text-sm font-medium">Property Type</Label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1"
                >
                  <option value="all">All Types</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="land">Land</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="status-filter" className="text-sm font-medium">Property Status</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border rounded-md mt-1"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="sold">Sold</option>
                  <option value="rented">Rented</option>
                </select>
              </div>
            </div>
            <div className="w-full">
              <Label className="text-sm font-medium">Price Range</Label>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm font-medium">₹{priceRange[0].toLocaleString()}</span>
                <Slider
                  min={0}
                  max={50000000}
                  step={100000}
                  value={priceRange}
                  onValueChange={value => setPriceRange([value[0], value[1]])}
                  className="flex-1"
                />
                <span className="text-sm font-medium">₹{priceRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <DataTable
              columns={columns}
              data={paginatedItems.map(property => ({ ...property, id: property._id }))}
              hideDefaultActions
            />
          </div>

          {totalPages > 1 && (
            <div className="mt-4 md:mt-6">
              <Pagination>
                <PaginationContent className="pagination-responsive">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={previousPage}
                      className={`pagination-button-responsive ${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => goToPage(page)}
                        isActive={currentPage === page}
                        className="pagination-button-responsive cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={nextPage}
                      className={`pagination-button-responsive ${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProperty?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Label htmlFor="approver-name">Approver Name *</Label>
              <Input
                id="approver-name"
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
                    id="documents"
                    checked={checklist.documentsVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, documentsVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="documents" className="text-sm font-medium cursor-pointer">
                    All required documents are verified
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="location"
                    checked={checklist.locationVerified}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, locationVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="location" className="text-sm font-medium cursor-pointer">
                    Property location is verified and accurate
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="price"
                    checked={checklist.priceReasonable}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, priceReasonable: checked as boolean })
                    }
                  />
                  <label htmlFor="price" className="text-sm font-medium cursor-pointer">
                    Price is reasonable and competitive
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="images"
                    checked={checklist.imagesQuality}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, imagesQuality: checked as boolean })
                    }
                  />
                  <label htmlFor="images" className="text-sm font-medium cursor-pointer">
                    Images are of good quality and relevant
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="description"
                    checked={checklist.descriptionComplete}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, descriptionComplete: checked as boolean })
                    }
                  />
                  <label htmlFor="description" className="text-sm font-medium cursor-pointer">
                    Description is complete and accurate
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ownership"
                    checked={checklist.ownershipConfirmed}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, ownershipConfirmed: checked as boolean })
                    }
                  />
                  <label htmlFor="ownership" className="text-sm font-medium cursor-pointer">
                    Ownership is confirmed and legitimate
                  </label>
                </div>
              </div>
            </div>

            {/* Handwritten Comments */}
            <div className="space-y-2">
              <Label htmlFor="handwritten-comments">Additional Comments</Label>
              <Textarea
                id="handwritten-comments"
                placeholder="Type your handwritten comments or notes here..."
                value={handwrittenComments}
                onChange={(e) => setHandwrittenComments(e.target.value)}
                className="mt-1 min-h-[120px] font-handwriting"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Add any additional observations, notes, or special remarks about this property
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApproveProperty}
              disabled={!approverName.trim()}
            >
              Approve & Publish Property
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
              <Label htmlFor="approver-name-reject">Approver Name *</Label>
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
              onClick={handleRejectProperty}
              disabled={!rejectionReason.trim() || !approverName.trim()}
            >
              Reject Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <ViewPropertyDialog
        property={selectedProperty}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
};

export default Properties;