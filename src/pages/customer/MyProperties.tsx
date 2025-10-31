import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Plus, 
  Search, 
  Filter,
  Edit3,
  Eye,
  MoreVertical,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Star,
  Trash2,
  Camera,
  DollarSign,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useRealtime, usePropertyRealtime, useRealtimeEvent } from "@/contexts/RealtimeContext";
import { 
  customerPropertiesService, 
  CustomerProperty, 
  CustomerPropertyStats, 
  PropertyFilters 
} from "@/services/customerPropertiesService";
import { toast } from "@/hooks/use-toast";

const MyProperties = () => {
  const { isConnected, lastEvent } = useRealtime();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for real data
  const [properties, setProperties] = useState<CustomerProperty[]>([]);
  const [stats, setStats] = useState<CustomerPropertyStats>({
    totalProperties: 0,
    activeProperties: 0,
    rentedProperties: 0,
    soldProperties: 0,
    draftProperties: 0,
    pendingProperties: 0,
    totalViews: 0,
    totalInquiries: 0,
    totalFavorites: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageViews: 0,
    averageInquiries: 0,
    conversionRate: 0,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProperties: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Load properties from API
  const loadProperties = useCallback(async (filters: PropertyFilters = {}) => {
    try {
      setLoading(true);
      
      const response = await customerPropertiesService.getCustomerProperties({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        ...filters
      });

      if (response.success) {
        setProperties(response.data.properties);
        setStats(response.data.stats);
        setPagination(response.data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  // Refresh properties
  const refreshProperties = useCallback(async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  }, [loadProperties]);

  // Load properties on component mount and filter changes
  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Realtime property updates
  usePropertyRealtime({
    refreshProperties: () => {
      console.log("My properties updated via realtime");
      refreshProperties();
    },
    refreshStats: () => {
      console.log("Property stats updated via realtime");
      refreshProperties();
    }
  });

  // Listen to specific realtime events for immediate updates
  useRealtimeEvent('property_viewed', (data) => {
    if (data.propertyId) {
      setProperties(prev => prev.map(prop => 
        prop._id === data.propertyId 
          ? { ...prop, views: prop.views + 1, analytics: { ...prop.analytics, weeklyViews: prop.analytics.weeklyViews + 1 } }
          : prop
      ));
      setStats(prev => ({ ...prev, totalViews: prev.totalViews + 1 }));
    }
  });

  useRealtimeEvent('property_inquiry', (data) => {
    if (data.propertyId) {
      setProperties(prev => prev.map(prop => 
        prop._id === data.propertyId 
          ? { ...prop, inquiries: prop.inquiries + 1, analytics: { ...prop.analytics, weeklyInquiries: prop.analytics.weeklyInquiries + 1 } }
          : prop
      ));
      setStats(prev => ({ ...prev, totalInquiries: prev.totalInquiries + 1 }));
    }
  });

  useRealtimeEvent('property_favorited', (data) => {
    if (data.propertyId && data.action) {
      const increment = data.action === 'add' ? 1 : -1;
      setProperties(prev => prev.map(prop => 
        prop._id === data.propertyId 
          ? { ...prop, favorites: Math.max(0, prop.favorites + increment) }
          : prop
      ));
      setStats(prev => ({ ...prev, totalFavorites: Math.max(0, prev.totalFavorites + increment) }));
    }
  });

  // Handle property deletion
  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await customerPropertiesService.deleteProperty(propertyId);
      setProperties(prev => prev.filter(prop => prop._id !== propertyId));
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  // Handle status toggle
  const handleToggleStatus = async (propertyId: string, newStatus: CustomerProperty['status']) => {
    try {
      await customerPropertiesService.togglePropertyStatus(propertyId, newStatus);
      setProperties(prev => prev.map(prop => 
        prop._id === propertyId ? { ...prop, status: newStatus } : prop
      ));
      toast({
        title: "Success",
        description: "Property status updated successfully",
      });
    } catch (error) {
      console.error('Failed to update property status:', error);
      toast({
        title: "Error",
        description: "Failed to update property status",
        variant: "destructive",
      });
    }
  };

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         `${property.address.city}, ${property.address.state}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            My Properties
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your property listings and track performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button asChild>
            <Link to="/customer/post-property">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Realtime Status */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time property updates active' : 'Offline mode'}
          </span>
          {lastEvent && (
            <Badge variant="secondary" className="text-xs">
              Last update: {customerPropertiesService.formatTimeAgo(lastEvent.timestamp)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading properties...
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshProperties}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalProperties}</p>
                <p className="text-sm text-muted-foreground">Total Properties</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.activeProperties}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.rentedProperties}</p>
                <p className="text-sm text-muted-foreground">Rented</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.soldProperties}</p>
                <p className="text-sm text-muted-foreground">Sold</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalInquiries}</p>
                <p className="text-sm text-muted-foreground">Inquiries</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalFavorites}</p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search properties..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="pending">Under Review</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="plot">Plot</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="pg">PG (Paying Guest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      {!loading && (
        <div className="space-y-4">
          {filteredProperties.map((property) => (
            <Card key={property._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Property Image */}
                  <div className="lg:w-64 h-48 lg:h-auto bg-muted relative">
                    {property.images.length > 0 ? (
                      <img 
                        src={customerPropertiesService.getPrimaryImage(property)}
                        alt={property.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent flex items-center justify-center">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={`${customerPropertiesService.getStatusColor(property.status)} text-white`}>
                        {customerPropertiesService.getStatusText(property.status)}
                      </Badge>
                      {property.featured && (
                        <Badge variant="secondary">Featured</Badge>
                      )}
                      {property.verified && (
                        <Badge className="bg-green-600 text-white">Verified</Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {property.images.length} photos
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{property.title}</h3>
                        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {property.address.city}, {property.address.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Posted {customerPropertiesService.formatTimeAgo(property.postedDate)}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {property.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{customerPropertiesService.formatArea(property.area)}</span>
                          <span>{property.bedrooms} BHK</span>
                          <span className="capitalize">{property.listingType}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary mb-2">
                          {customerPropertiesService.formatPrice(property.price, property.listingType)}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Property
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit Property
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Promote
                            </DropdownMenuItem>
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
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{property.views}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{property.inquiries}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Inquiries</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{property.favorites}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Favorites</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-green-600">+{property.analytics.weeklyViews}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">This Week</p>
                      </div>
                    </div>

                    {/* Rental Info (if rented) */}
                    {property.status === 'rented' && property.rentedTo && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Rental Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Tenant: </span>
                            <span className="font-medium">{property.rentedTo.name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Start Date: </span>
                            <span className="font-medium">{new Date(property.rentedTo.rentStart).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">End Date: </span>
                            <span className="font-medium">{new Date(property.rentedTo.rentEnd).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Messages ({property.inquiries})
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </Button>
                      {property.status === 'active' && (
                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Promote
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading your properties...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredProperties.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {properties.length === 0 ? 'No properties found' : 'No properties match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {properties.length === 0 
                ? 'Start by adding your first property to get started.'
                : 'Try adjusting your search criteria or clear some filters.'
              }
            </p>
            <div className="flex gap-2 justify-center">
              {properties.length === 0 ? (
                <Button asChild>
                  <Link to="/customer/post-property">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Property
                  </Link>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyProperties;