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
import { adminPropertyService } from "@/services/adminPropertyService";
import { useToast } from "@/hooks/use-toast";
import { ViewPropertyDialog } from "@/components/adminpanel/ViewPropertyDialog";
import authService from "@/services/authService";

const Properties = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user info
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    fetchProperties();
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
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [properties, searchTerm, typeFilter, statusFilter]);

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

  const handleApproveProperty = async (property: Property) => {
    try {
      await adminPropertyService.updatePropertyStatus(property._id, 'active');
      // Realtime update: Update in state
      setProperties(properties.map(p => 
        p._id === property._id ? { ...p, status: 'active', verified: true } : p
      ));
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
    if (!selectedProperty || !rejectionReason.trim()) return;
    
    try {
      await adminPropertyService.updatePropertyStatus(selectedProperty._id, 'rejected', rejectionReason);
      // Realtime update: Update in state
      setProperties(properties.map(p => 
        p._id === selectedProperty._id ? { ...p, status: 'rejected' } : p
      ));
      setRejectDialogOpen(false);
      setSelectedProperty(null);
      setRejectionReason("");
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
    // and status is 'active' or 'available' (admin properties don't go through approval)
    return !property.vendor && (property.status === 'active' || property.status === 'available');
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
            {property.address.city}, {property.address.state}
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
          active: "default",
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
              
              {/* If property created by admin - show Edit */}
              {adminCreated && (
                <DropdownMenuItem onClick={() => navigate(`/admin/properties/edit/${property._id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Property
                </DropdownMenuItem>
              )}
              
              {/* If property created by vendor/agent - show View Details */}
              {!adminCreated && (
                <DropdownMenuItem onClick={() => openViewDialog(property)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              
              {/* Approval Actions for Pending Vendor Properties */}
              {!adminCreated && isPending && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleApproveProperty(property)}
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

              {/* Featured Toggle for Active Properties */}
              {property.status === 'active' && (
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

              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => openDeleteDialog(property)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
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
    <div className="space-y-6 relative top-[60px]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage property listings and details
          </p>
        </div>
        <Button onClick={() => navigate("/admin/properties/add")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {properties.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {properties.filter(p => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {properties.filter(p => p.featured).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
          <CardDescription>
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filterValue={typeFilter}
                  onFilterChange={setTypeFilter}
                  filterOptions={[
                    { label: "Apartment", value: "apartment" },
                    { label: "House", value: "house" },
                    { label: "Villa", value: "villa" },
                    { label: "Plot", value: "plot" },
                    { label: "Commercial", value: "commercial" },
                    { label: "Office", value: "office" },
                  ]}
                  filterPlaceholder="Filter by type"
                />
              </div>
              <div className="w-full sm:w-48">
                <SearchFilter
                  searchTerm=""
                  onSearchChange={() => {}}
                  filterValue={statusFilter}
                  onFilterChange={setStatusFilter}
                  filterOptions={[
                    { label: "Pending", value: "pending" },
                    { label: "Active", value: "active" },
                    { label: "Rejected", value: "rejected" },
                    { label: "Sold", value: "sold" },
                    { label: "Rented", value: "rented" },
                  ]}
                  filterPlaceholder="Filter by status"
                  hideSearch
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={paginatedItems.map(property => ({ ...property, id: property._id }))}
            hideDefaultActions
          />

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={previousPage}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => goToPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={nextPage}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedProperty?.title}". The vendor will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectProperty}
              disabled={!rejectionReason.trim()}
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
