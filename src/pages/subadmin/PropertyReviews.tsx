import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Eye, MapPin, Calendar, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Property {
  _id: string;
  title: string;
  description: string;
  type: string;
  listingType: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  status: 'pending' | 'active' | 'rejected';
  images: string[];
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  address: {
    city: string;
    state: string;
    street: string;
    zipCode: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

const PropertyReviews = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchProperties();
  }, [currentPage, searchTerm]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subadmin/properties/pending?page=${currentPage}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data.properties);
        setTotalPages(data.data.totalPages);
      } else {
        console.error('Failed to fetch properties');
      }
    } catch (error: any) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (propertyId: string) => {
    try {
      setActionLoading({ ...actionLoading, [propertyId]: true });
      const response = await fetch(`/api/subadmin/properties/${propertyId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Property approved successfully');
        fetchProperties();
      } else {
        alert('Failed to approve property');
      }
    } catch (error: any) {
      console.error('Error approving property:', error);
      alert('Failed to approve property');
    } finally {
      setActionLoading({ ...actionLoading, [propertyId]: false });
    }
  };

  const handleReject = async () => {
    if (!selectedProperty || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: true });
      const response = await fetch(`/api/subadmin/properties/${selectedProperty._id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      if (response.ok) {
        alert('Property rejected successfully');
        setRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedProperty(null);
        fetchProperties();
      } else {
        alert('Failed to reject property');
      }
    } catch (error: any) {
      console.error('Error rejecting property:', error);
      alert('Failed to reject property');
    } finally {
      setActionLoading({ ...actionLoading, [selectedProperty._id]: false });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties by title or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">No Pending Properties</h3>
              <p className="text-muted-foreground text-center">
                All properties have been reviewed. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          properties.map((property) => (
            <Card key={property._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{property.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address.city}, {property.address.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(property.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {property.owner.email}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(property.price)}
                    </div>
                    <Badge variant="outline">
                      {property.type} • {property.listingType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(property._id)}
                    disabled={actionLoading[property._id]}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setRejectDialogOpen(true);
                    }}
                    disabled={actionLoading[property._id]}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Property</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this property listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedProperty?.title}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedProperty?.address.city}, {selectedProperty?.address.state}
              </p>
            </div>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading[selectedProperty?._id || ""]}
            >
              Reject Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Property Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
            <DialogDescription>
              Property details and information
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Property Details</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Type:</strong> {selectedProperty.type}</li>
                    <li><strong>Listing Type:</strong> {selectedProperty.listingType}</li>
                    <li><strong>Price:</strong> {formatPrice(selectedProperty.price)}</li>
                    <li><strong>Area:</strong> {selectedProperty.area} sq ft</li>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyReviews;
