import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, CheckCircle, XCircle, Eye, Calendar, MapPin, Home, CreditCard } from "lucide-react";

interface PromotionRequest {
  _id: string;
  property: {
    _id: string;
    title: string;
    location: {
      city: string;
      state: string;
    };
    price: number;
    images: string[];
    propertyType: string;
  };
  vendor: {
    name: string;
    email: string;
    company: string;
  };
  promotionType: 'featured' | 'premium' | 'spotlight' | 'top_listing';
  duration: number; // days
  requestedStartDate: string;
  requestedEndDate: string;
  cost: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reason?: string;
  notes?: string;
  createdAt: string;
}

const PromotionApproval = () => {
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPromotionRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/promotions/requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions);
      }
    } catch (error) {
      console.error('Failed to fetch promotion requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotionRequests();
  }, []);

  const handlePromotionAction = async (promotionId: string, action: 'approve' | 'reject') => {
    const notes = action === 'approve' ? approvalNotes : rejectionReason;
    
    if (action === 'reject' && !notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await fetch(`/api/admin/promotions/${promotionId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          notes: notes,
          reason: action === 'reject' ? notes : undefined
        })
      });

      if (response.ok) {
        setApprovalNotes("");
        setRejectionReason("");
        fetchPromotionRequests();
      }
    } catch (error) {
      console.error(`Failed to ${action} promotion:`, error);
    }
  };

  const getPromotionTypeInfo = (type: string) => {
    const types = {
      featured: {
        label: 'Featured Listing',
        color: 'bg-blue-100 text-blue-800',
        description: 'Highlighted in search results'
      },
      premium: {
        label: 'Premium Listing',
        color: 'bg-purple-100 text-purple-800',
        description: 'Top of search results with badge'
      },
      spotlight: {
        label: 'Spotlight',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Homepage banner placement'
      },
      top_listing: {
        label: 'Top Listing',
        color: 'bg-green-100 text-green-800',
        description: 'Always appears in top positions'
      }
    };
    return types[type as keyof typeof types] || types.featured;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-orange-100 text-orange-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || colors.pending;
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
          <h1 className="text-3xl font-bold text-foreground">Promotion Approval</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve featured and paid promotion requests
          </p>
        </div>
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          {promotions.filter(p => p.status === 'pending').length} Pending Approval
        </Badge>
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Promotion Requests</h3>
              <p className="text-muted-foreground">
                No promotion requests are currently pending approval.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion) => {
            const typeInfo = getPromotionTypeInfo(promotion.promotionType);
            return (
              <Card key={promotion._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Property Image */}
                    <div className="w-full lg:w-64 h-48 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {promotion.property.images && promotion.property.images.length > 0 ? (
                        <img 
                          src={promotion.property.images[0]} 
                          alt={promotion.property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Home className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Promotion Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{promotion.property.title}</h3>
                          <div className="flex items-center text-muted-foreground text-sm mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{promotion.property.location.city}, {promotion.property.location.state}</span>
                          </div>
                          <div className="text-lg font-bold text-primary mb-2">
                            ₹{promotion.property.price.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge className={getStatusColor(promotion.status)}>
                            {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                          </Badge>
                          <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                            Payment: {promotion.paymentStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* Promotion Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Badge className={typeInfo.color} variant="outline">
                            <Star className="w-3 h-3 mr-1" />
                            {typeInfo.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">{typeInfo.description}</p>
                        </div>
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{promotion.duration} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-medium">₹{promotion.cost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Start Date:</span>
                            <span className="font-medium">
                              {new Date(promotion.requestedStartDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vendor Info */}
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-sm">Vendor Information</h4>
                            <p className="text-sm">{promotion.vendor.name}</p>
                            <p className="text-sm text-muted-foreground">{promotion.vendor.company}</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{promotion.vendor.email}</p>
                            <p>Requested: {new Date(promotion.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Promotion Request Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {promotion.property.images && promotion.property.images.map((image, index) => (
                                  <img 
                                    key={index}
                                    src={image} 
                                    alt={`Property ${index + 1}`}
                                    className="w-full h-48 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-2">Property Details</h4>
                                  <ul className="space-y-1 text-sm">
                                    <li><strong>Type:</strong> {promotion.property.propertyType}</li>
                                    <li><strong>Price:</strong> ₹{promotion.property.price.toLocaleString()}</li>
                                    <li><strong>Location:</strong> {promotion.property.location.city}, {promotion.property.location.state}</li>
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Promotion Details</h4>
                                  <ul className="space-y-1 text-sm">
                                    <li><strong>Type:</strong> {typeInfo.label}</li>
                                    <li><strong>Duration:</strong> {promotion.duration} days</li>
                                    <li><strong>Cost:</strong> ₹{promotion.cost.toLocaleString()}</li>
                                    <li><strong>Payment:</strong> {promotion.paymentStatus}</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {promotion.status === 'pending' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Promotion</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>
                                    Are you sure you want to approve this {typeInfo.label.toLowerCase()} 
                                    promotion for "{promotion.property.title}"?
                                  </p>
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm">
                                      <p><strong>Duration:</strong> {promotion.duration} days</p>
                                      <p><strong>Cost:</strong> ₹{promotion.cost.toLocaleString()}</p>
                                      <p><strong>Start Date:</strong> {new Date(promotion.requestedStartDate).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <Textarea
                                    placeholder="Add approval notes (optional)..."
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handlePromotionAction(promotion._id, 'approve')}
                                    >
                                      Approve Promotion
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
                                  <DialogTitle>Reject Promotion</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>Please provide a reason for rejecting this promotion request:</p>
                                  <Textarea
                                    placeholder="Reason for rejection (required)..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancel</Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handlePromotionAction(promotion._id, 'reject')}
                                    >
                                      Reject Promotion
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}

                        {promotion.paymentStatus !== 'paid' && promotion.status === 'approved' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Awaiting Payment
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PromotionApproval;
