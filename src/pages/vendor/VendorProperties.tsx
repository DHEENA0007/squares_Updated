import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PropertyStatusDialog from "@/components/PropertyStatusDialog";
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Users,
  Calendar,
  Star,
  MapPin,
  MoreVertical,
  TrendingUp,
  Camera
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useSearchParams } from "react-router-dom";
import { propertyService, type Property } from "@/services/propertyService";
import { toast } from "@/hooks/use-toast";
import { configurationService } from "@/services/configurationService";

const VendorProperties = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingPropertyTypes, setIsLoadingPropertyTypes] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    totalFavorites: 0,
    averageRating: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProperties: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  useEffect(() => {
    loadProperties();
    loadStats();
    fetchPropertyTypes();
  }, []);

  const fetchPropertyTypes = async () => {
    try {
      setIsLoadingPropertyTypes(true);
      const propertyTypesData = await configurationService.getAllPropertyTypes(false);

      // Map property types to the format expected by the form
      const mappedPropertyTypes = propertyTypesData
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map(type => ({
          value: type.value,
          label: type.name
        }));

      setPropertyTypes(mappedPropertyTypes);
    } catch (error) {
      console.error('Error fetching property types:', error);
      // Fallback to hardcoded types
      setPropertyTypes([
        { value: "apartment", label: "Apartment" },
        { value: "house", label: "House" },
        { value: "villa", label: "Villa" },
        { value: "plot", label: "Plot" },
        { value: "land", label: "Land" },
        { value: "commercial", label: "Commercial" },
        { value: "office", label: "Office" },
        { value: "pg", label: "PG (Paying Guest)" }
      ]);
    } finally {
      setIsLoadingPropertyTypes(false);
    }
  };

  // Update search query from URL params
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProperties();
  }, [searchQuery, statusFilter, typeFilter]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const filters = {
        page: 1,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(typeFilter !== "all" && { propertyType: typeFilter })
      };

      const response = await propertyService.getVendorProperties(filters);
      setProperties(response.data.properties);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await propertyService.getVendorPropertyStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await propertyService.deleteProperty(propertyId);
        loadProperties(); // Refresh the list
        loadStats(); // Refresh stats
      } catch (error) {
        console.error('Failed to delete property:', error);
      }
    }
  };

  const handleToggleFeatured = async (propertyId: string, currentFeatured: boolean) => {
    try {
      await propertyService.togglePropertyFeatured(propertyId, !currentFeatured);
      loadProperties(); // Refresh the list
      loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Failed to toggle featured status:', error);
      // Error is already shown in toast by service
    }
  };

  const handleUpdatePropertyStatus = async (propertyId: string, newStatus: string, customerId?: string, reason?: string) => {
    try {
      // Optimistically update the local state first for instant feedback
      setProperties(prevProperties =>
        prevProperties.map(prop =>
          prop._id === propertyId
            ? { ...prop, status: newStatus as any }
            : prop
        )
      );

      // If customer is selected, assign property to customer
      if (customerId && (newStatus === 'sold' || newStatus === 'rented' || newStatus === 'leased')) {
        // Call API to assign property to customer
        await propertyService.assignPropertyToCustomer(propertyId, customerId, newStatus, reason);
        toast({
          title: "Success",
          description: `Property ${newStatus} and assigned to customer successfully!`,
        });
      } else {
        // Just update status
        await propertyService.togglePropertyStatus(propertyId, newStatus);
        toast({
          title: "Success",
          description: `Property status updated to ${newStatus}!`,
        });
      }

      // Refresh stats to get updated counts
      loadStats();
    } catch (error) {
      console.error('Failed to update property status:', error);
      // Revert the optimistic update on error
      loadProperties();
      toast({
        title: "Error",
        description: "Failed to update property status",
        variant: "destructive",
      });
    }
  };

  const openStatusDialog = (property: Property) => {
    setSelectedProperty(property);
    setStatusDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLocationString = (property: Property) => {
    const parts = [];
    if (property.address.locationName) parts.push(property.address.locationName);
    if (property.address.city) parts.push(property.address.city);
    if (property.address.state) parts.push(property.address.state);
    return parts.join(', ') || 'Location not specified';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 mt-16 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Properties</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage and track your property listings</p>
        </div>
        <Link to="/vendor/properties/add" className="w-full sm:w-auto">
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-xl md:text-2xl font-bold">{stats.totalProperties}</p>
              </div>
              <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="text-xl md:text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Avg. Rating</p>
                <p className="text-xl md:text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
              </div>
              <Star className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter} disabled={isLoadingPropertyTypes}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={isLoadingPropertyTypes ? "Loading..." : "Type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      <div className="space-y-4">
        {properties.map((property) => (
          <Card key={property._id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Property Image */}
                <div className="lg:w-64 h-48 lg:h-auto bg-muted relative">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={propertyService.getPrimaryImage(property)}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent flex items-center justify-center">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 md:top-3 md:left-3 flex gap-1 md:gap-2">
                    <Badge className={`${propertyService.getStatusColor(property.status)} text-white text-xs`}>
                      {propertyService.getStatusText(property.status)}
                    </Badge>
                    {property.featured && (
                      <Badge variant="secondary" className="text-xs">Featured</Badge>
                    )}
                    {property.verified && (
                      <Badge className="bg-green-600 text-white text-xs">Verified</Badge>
                    )}
                  </div>
                  {property.images && property.images.length > 0 && (
                    <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-black/70 text-white px-2 py-1 rounded text-xs md:text-sm">
                      {property.images.length} {property.images.length === 1 ? 'photo' : 'photos'}
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div className="flex-1 p-4 md:p-6">
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold mb-1 truncate">{property.title}</h3>
                      <p className="text-muted-foreground flex items-center mb-2 text-sm">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{getLocationString(property)}</span>
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-primary">
                        {propertyService.formatPrice(property.price, property.listingType)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/vendor/properties/details/${property._id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/vendor/properties/edit/${property._id}`}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Property
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFeatured(property._id, property.featured)}>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          {property.featured ? 'Unfeature' : 'Promote'}
                        </DropdownMenuItem>

                        {/* Status Update Option - Show for available OR rented/leased properties */}
                        {(property.status === 'available' || property.status === 'rented' || property.status === 'leased') && (
                          <DropdownMenuItem onClick={() => openStatusDialog(property)}>
                            <Users className="w-4 h-4 mr-2" />
                            {property.status === 'available'
                              ? (property.listingType === 'sale' ? 'Mark as Sold' :
                                 property.listingType === 'rent' ? 'Mark as Rented' : 'Mark as Leased')
                              : 'Mark as Available'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteProperty(property._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
                    {property.bedrooms > 0 && (
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-semibold text-sm md:text-base">{property.bedrooms}</p>
                      </div>
                    )}
                    {property.bathrooms > 0 && (
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-semibold text-sm md:text-base">{property.bathrooms}</p>
                      </div>
                    )}
                    {propertyService.hasValidArea(property.area) && (
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground">Area</p>
                        <p className="font-semibold text-sm md:text-base">{propertyService.formatArea(property.area)}</p>
                      </div>
                    )}
                    {property.type && (
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground">Type</p>
                        <p className="font-semibold text-sm md:text-base capitalize">{property.type}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-between items-center text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 gap-2">
                    <span className="flex items-center">
                      <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {property.views} views
                    </span>
                    <span className="flex items-center">
                      <Star className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {property.favorites || 0} favorites
                    </span>
                    <span className="flex items-center">
                      <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 fill-current text-yellow-500" />
                      {property.averageRating?.toFixed(1) || '0.0'} rating
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Listed {formatDate(property.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Link to={`/vendor/properties/details/${property._id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs md:text-sm">
                            <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            View Details
                          </Button>
                        </Link>
                        <Link to={`/vendor/properties/edit/${property._id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs md:text-sm">
                            <Edit3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleToggleFeatured(property._id, property.featured)} className="flex-1 text-xs md:text-sm">
                          <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          {property.featured ? 'Unfeature' : 'Promote'}
                        </Button>

                        {/* Status Update Button - Show for available OR rented/leased properties */}
                        {(property.status === 'available' || property.status === 'rented' || property.status === 'leased') && (
                          <Button size="sm" variant="outline" onClick={() => openStatusDialog(property)} className="flex-1 text-xs md:text-sm">
                            {property.status === 'available'
                              ? (property.listingType === 'sale' ? 'Mark as Sold' :
                                 property.listingType === 'rent' ? 'Mark as Rented' : 'Mark as Leased')
                              : 'Mark as Available'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {properties.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No properties match your search criteria"
                : "You haven't added any properties yet"
              }
            </p>
            <Link to="/vendor/properties/add" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Property
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Property Status Dialog */}
      <PropertyStatusDialog
        property={selectedProperty}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onUpdateStatus={handleUpdatePropertyStatus}
      />
    </div>
  );
};

export default VendorProperties;