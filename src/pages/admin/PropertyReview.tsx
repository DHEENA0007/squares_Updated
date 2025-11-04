import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Eye, Search, Filter, MapPin, Home, Users } from "lucide-react";

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  location: {
    city: string;
    state: string;
    address: string;
  };
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  vendor: {
    name: string;
    email: string;
  };
  status: string;
  createdAt: string;
}

const PropertyReview = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        status: statusFilter,
        search: searchTerm,
      });

      const response = await fetch(`/api/admin/properties/review?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [currentPage, statusFilter, searchTerm]);

  const handlePropertyAction = async (propertyId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchProperties(); // Refresh the list
      }
    } catch (error) {
      console.error(`Failed to ${action} property:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
    };
    
    return variants[status as keyof typeof variants] || variants.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Property Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and verify property listings submitted by vendors
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      <div className="space-y-4">
        {properties.map((property) => {
          const statusInfo = getStatusBadge(property.status);
          return (
            <Card key={property._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Property Image */}
                  <div className="w-full lg:w-64 h-48 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {property.images && property.images.length > 0 ? (
                      <img 
                        src={property.images[0]} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Home className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
                        <div className="flex items-center text-muted-foreground mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">{property.location.city}, {property.location.state}</span>
                        </div>
                      </div>
                      <Badge className={statusInfo.color}>
                        {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {property.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">₹{property.price.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Price</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{property.bedrooms}</div>
                        <div className="text-xs text-muted-foreground">Bedrooms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{property.bathrooms}</div>
                        <div className="text-xs text-muted-foreground">Bathrooms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{property.area}</div>
                        <div className="text-xs text-muted-foreground">Sq ft</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        <span>Vendor: {property.vendor.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                        {property.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                              onClick={() => handlePropertyAction(property._id, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => handlePropertyAction(property._id, 'reject')}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyReview;
