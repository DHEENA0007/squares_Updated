import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  const [, setPagination] = useState({
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



  const getLocationString = (property: Property) => {
    const parts = [];
    if (property.address.locationName) parts.push(property.address.locationName);
    if (property.address.city) parts.push(property.address.city);
    if (property.address.state) parts.push(property.address.state);
    return parts.join(', ') || 'Location not specified';
  };

  const renderPropertyDetails = (property: Property) => {
    const details = [
      { label: 'Beds', value: property.bedrooms, show: property.bedrooms > 0 },
      { label: 'Baths', value: property.bathrooms, show: property.bathrooms > 0 },
      { label: 'Area', value: propertyService.hasValidArea(property.area) ? propertyService.formatArea(property.area).split(' ')[0] : null, show: propertyService.hasValidArea(property.area) },
      { label: 'Type', value: property.type, show: !!property.type }
    ].filter(item => item.show);

    if (details.length === 0) return null;

    return (
      <div className="flex py-3 border-t border-gray-100 mb-4 bg-gray-50/50 rounded-lg px-2">
        {details.map((item, index) => (
          <div key={item.label} className={`flex-1 text-center ${index > 0 ? 'border-l border-gray-200' : ''}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="font-semibold text-sm text-gray-900 truncate px-1 capitalize">{item.value}</p>
          </div>
        ))}
      </div>
    );
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
    <div className="space-y-4 md:space-y-6 mt-6 px-4 md:px-0">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-600/80">Total Properties</p>
                <p className="text-xl md:text-2xl font-bold text-blue-700">{stats.totalProperties}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-green-600/80">Total Views</p>
                <p className="text-xl md:text-2xl font-bold text-green-700">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-orange-600/80">Avg. Rating</p>
                <p className="text-xl md:text-2xl font-bold text-orange-700">{stats.averageRating.toFixed(1)}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Star className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-purple-600/80">Favorites</p>
                <p className="text-xl md:text-2xl font-bold text-purple-700">{stats.totalFavorites}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search properties by name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
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
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 border-gray-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder={isLoadingPropertyTypes ? "Loading..." : "Type"} />
              </div>
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

      {/* Properties List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property._id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-200 flex flex-col h-full">
            {/* Property Image */}
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              {property.images && property.images.length > 0 ? (
                <img
                  src={propertyService.getPrimaryImage(property)}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-300" />
                </div>
              )}

              {property.images && property.images.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                  <Camera className="w-3 h-3" />
                  {property.images.length}
                </div>
              )}
            </div>

            {/* Property Details */}
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={`${propertyService.getStatusColor(property.status)} text-white border-0 shadow-sm`}>
                  {propertyService.getStatusText(property.status)}
                </Badge>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 shadow-sm">
                  For {property.listingType.charAt(0).toUpperCase() + property.listingType.slice(1)}
                </Badge>
                {property.featured && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-sm">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
                {property.verified && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">Verified</Badge>
                )}
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1 hover:text-primary transition-colors cursor-pointer" onClick={() => window.location.href = `/vendor/properties/details/${property._id}`}>
                    {property.title}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 text-gray-400 hover:text-gray-600">
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
                      {(property.status === 'available' || property.status === 'rented' || property.status === 'leased') && (
                        <DropdownMenuItem onClick={() => openStatusDialog(property)}>
                          <Users className="w-4 h-4 mr-2" />
                          Update Status
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => handleDeleteProperty(property._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-muted-foreground flex items-center text-sm mb-3">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{getLocationString(property)}</span>
                </p>

                <p className="text-2xl font-bold text-primary">
                  {propertyService.formatPrice(property.price, property.listingType)}
                </p>
              </div>

              {renderPropertyDetails(property)}

              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center" title="Views">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {property.views}
                    </span>
                    <span className="flex items-center" title="Favorites">
                      <Star className="w-3.5 h-3.5 mr-1" />
                      {property.favorites || 0}
                    </span>
                  </div>
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {new Date(property.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/vendor/properties/edit/${property._id}`}>
                    <Button size="sm" variant="outline" className="w-full h-9">
                      <Edit3 className="w-3.5 h-3.5 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Link to={`/vendor/properties/details/${property._id}`}>
                    <Button size="sm" className="w-full h-9">
                      View
                    </Button>
                  </Link>
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