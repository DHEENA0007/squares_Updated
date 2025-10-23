import { useState } from "react";
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
  BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const MyProperties = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Mock properties data
  const properties = [
    {
      id: 1,
      title: "Luxury 3BHK Apartment",
      location: "Powai, Mumbai",
      price: "₹1.2 Cr",
      type: "apartment",
      status: "active",
      posted: "2024-01-15",
      views: 1250,
      inquiries: 23,
      favorites: 89,
      images: 12,
      description: "Spacious 3BHK with modern amenities, near metro station",
      area: "1450 sq ft",
      bhk: "3 BHK",
      amenities: ["Parking", "Gym", "Swimming Pool", "Security"],
      availability: "Immediate",
      listingType: "sell",
      featured: true,
      verified: true,
      analytics: {
        weeklyViews: 180,
        weeklyInquiries: 8,
        avgResponseTime: "2 hours",
        lastUpdated: "2024-10-20"
      }
    },
    {
      id: 2,
      title: "Modern Villa with Garden",
      location: "Baner, Pune",
      price: "₹85,000/month",
      type: "villa",
      status: "rented",
      posted: "2024-02-10",
      views: 890,
      inquiries: 15,
      favorites: 45,
      images: 18,
      description: "Beautiful villa with private garden and parking",
      area: "2200 sq ft",
      bhk: "4 BHK",
      amenities: ["Garden", "Terrace", "Parking", "Power Backup"],
      availability: "From Dec 2024",
      listingType: "rent",
      featured: false,
      verified: true,
      rentedTo: {
        name: "Priya Sharma",
        phone: "+91 98765 43210",
        rentStart: "2024-03-01",
        rentEnd: "2025-03-01"
      },
      analytics: {
        weeklyViews: 45,
        weeklyInquiries: 2,
        avgResponseTime: "4 hours",
        lastUpdated: "2024-10-18"
      }
    },
    {
      id: 3,
      title: "Commercial Office Space",
      location: "BKC, Mumbai",
      price: "₹3.5 Cr",
      type: "commercial",
      status: "pending",
      posted: "2024-03-05",
      views: 520,
      inquiries: 8,
      favorites: 22,
      images: 8,
      description: "Prime commercial space in business district",
      area: "1800 sq ft",
      bhk: "Office",
      amenities: ["AC", "Elevator", "Parking", "Reception"],
      availability: "Under Review",
      listingType: "sell",
      featured: false,
      verified: false,
      analytics: {
        weeklyViews: 85,
        weeklyInquiries: 3,
        avgResponseTime: "6 hours",
        lastUpdated: "2024-10-19"
      }
    },
    {
      id: 4,
      title: "Cozy 2BHK Flat",
      location: "Koramangala, Bangalore",
      price: "₹45,000/month",
      type: "apartment",
      status: "draft",
      posted: "2024-03-20",
      views: 0,
      inquiries: 0,
      favorites: 0,
      images: 5,
      description: "Well-maintained 2BHK in prime location",
      area: "1100 sq ft",
      bhk: "2 BHK",
      amenities: ["Gym", "Security", "Power Backup"],
      availability: "Not Published",
      listingType: "rent",
      featured: false,
      verified: false,
      analytics: {
        weeklyViews: 0,
        weeklyInquiries: 0,
        avgResponseTime: "N/A",
        lastUpdated: "2024-10-15"
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'rented': return 'bg-blue-500';
      case 'sold': return 'bg-purple-500';
      case 'pending': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'rented': return 'Rented';
      case 'sold': return 'Sold';
      case 'pending': return 'Under Review';
      case 'draft': return 'Draft';
      case 'inactive': return 'Inactive';
      default: return status;
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.status === 'active').length,
    rented: properties.filter(p => p.status === 'rented').length,
    sold: properties.filter(p => p.status === 'sold').length,
    totalViews: properties.reduce((sum, p) => sum + p.views, 0),
    totalInquiries: properties.reduce((sum, p) => sum + p.inquiries, 0),
    totalFavorites: properties.reduce((sum, p) => sum + p.favorites, 0)
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Properties</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.rented}</p>
              <p className="text-sm text-muted-foreground">Rented</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.sold}</p>
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
      <div className="space-y-4">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Property Image */}
                <div className="lg:w-64 h-48 lg:h-auto bg-muted relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent flex items-center justify-center">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={`${getStatusColor(property.status)} text-white`}>
                      {getStatusText(property.status)}
                    </Badge>
                    {property.featured && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                    {property.verified && (
                      <Badge className="bg-green-600 text-white">Verified</Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    {property.images} photos
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
                          {property.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Posted {new Date(property.posted).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {property.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{property.area}</span>
                        <span>{property.bhk}</span>
                        <span className="capitalize">{property.listingType}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary mb-2">{property.price}</p>
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
                          <DropdownMenuItem className="text-red-600">
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

      {filteredProperties.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add your first property.
            </p>
            <Button asChild>
              <Link to="/customer/post-property">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Property
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyProperties;