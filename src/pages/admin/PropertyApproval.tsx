import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, MessageSquare, Calendar, MapPin, Home } from "lucide-react";

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
  reviewNotes?: string;
}

const PropertyApproval = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const fetchPendingProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/properties/pending-approval', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProperties();
  }, []);

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          notes: approvalNotes 
        })
      });

      if (response.ok) {
        setApprovalNotes("");
        fetchPendingProperties();
      }
    } catch (error) {
      console.error('Failed to approve property:', error);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: rejectionReason 
        })
      });

      if (response.ok) {
        setRejectionReason("");
        fetchPendingProperties();
      }
    } catch (error) {
      console.error('Failed to reject property:', error);
    }
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
          <h1 className="text-3xl font-bold text-foreground">Property Approval</h1>
          <p className="text-muted-foreground mt-1">
            Final approval for property listings awaiting publication
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-100 text-orange-800">
          {properties.length} Pending Approval
        </Badge>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No properties are currently pending approval.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {properties.map((property) => (
            <Card key={property._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                {/* Property Image */}
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
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
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{property.title}</h3>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{property.location.city}, {property.location.state}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-primary">₹{property.price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{property.bedrooms}BR</div>
                      <div className="text-xs text-muted-foreground">Bedrooms</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{property.area}</div>
                      <div className="text-xs text-muted-foreground">Sq ft</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Vendor: {property.vendor.name}
                    </span>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{new Date(property.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{property.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {property.images && property.images.map((image, index) => (
                              <img 
                                key={index} 
                                src={image} 
                                alt={`Property ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground">{property.description}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold">Property Details</h4>
                              <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>Type: {property.propertyType}</li>
                                <li>Bedrooms: {property.bedrooms}</li>
                                <li>Bathrooms: {property.bathrooms}</li>
                                <li>Area: {property.area} sq ft</li>
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold">Vendor Information</h4>
                              <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>Name: {property.vendor.name}</li>
                                <li>Email: {property.vendor.email}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve Property</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>Are you sure you want to approve "{property.title}"?</p>
                          <Textarea
                            placeholder="Add approval notes (optional)..."
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveProperty(property._id)}
                            >
                              Approve Property
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Property</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>Please provide a reason for rejecting "{property.title}":</p>
                          <Textarea
                            placeholder="Reason for rejection (required)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleRejectProperty(property._id)}
                            >
                              Reject Property
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyApproval;
