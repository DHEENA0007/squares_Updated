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

const Properties = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await propertyService.getProperties({
          limit: 1000, // Get all properties for admin view
        });
        
        if (response.success) {
          setProperties(response.data.properties);
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.state.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || property.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [properties, searchTerm, typeFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredProperties, 10);

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      await adminPropertyService.deleteProperty(selectedProperty._id);
      setProperties(properties.filter(p => p._id !== selectedProperty._id));
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error("Failed to delete property:", error);
    }
  };

  const handleToggleFeatured = async (property: Property) => {
    try {
      await adminPropertyService.togglePropertyFeatured(property._id, !property.featured);
      setProperties(properties.map(p => 
        p._id === property._id ? { ...p, featured: !p.featured } : p
      ));
    } catch (error) {
      console.error("Failed to toggle featured status:", error);
    }
  };

  const handleApproveProperty = async (property: Property) => {
    try {
      await adminPropertyService.updatePropertyStatus(property._id, 'active');
      setProperties(properties.map(p => 
        p._id === property._id ? { ...p, status: 'active', verified: true } : p
      ));
      toast({
        title: "Success",
        description: "Property approved and listed successfully!",
      });
    } catch (error) {
      console.error("Failed to approve property:", error);
    }
  };

  const handleRejectProperty = async () => {
    if (!selectedProperty || !rejectionReason.trim()) return;
    
    try {
      await adminPropertyService.updatePropertyStatus(selectedProperty._id, 'rejected', rejectionReason);
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
          {property.type.replace('_', ' ')}
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
      render: (property) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/admin/properties/edit/${property._id}`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            
            {/* Approval Actions for Pending Properties */}
            {property.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => handleApproveProperty(property)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Approve & List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRejectDialog(property)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Featured Toggle for Active Properties */}
            {property.status === 'active' && (
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
      ),
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

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
          <CardDescription>
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          <DataTable
            columns={columns}
            data={paginatedItems.map(property => ({ ...property, id: property._id }))}
            editPath={(property) => `/admin/properties/edit/${property._id}`}
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
    </div>
  );
};

export default Properties;
