import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Home, 
  Search, 
  Star,
  Calendar,
  MapPin,
  Eye,
  MessageSquare,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit3,
  StarOff,
  TrendingUp,
  Phone,
  Mail
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRealtime } from "@/contexts/RealtimeContext";
import { authService } from "@/services/authService";

interface OwnedProperty {
  _id: string;
  title: string;
  description: string;
  type: string;
  status: 'sold' | 'rented';
  listingType: 'sale' | 'rent' | 'lease';
  price: number;
  area: {
    builtUp?: number;
    carpet?: number;
    plot?: number;
    unit: 'sqft' | 'sqm' | 'acre';
  };
  bedrooms: number;
  bathrooms: number;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  images: Array<{
    url: string;
    caption?: string;
    isPrimary: boolean;
  }>;
  assignedAt: string;
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  owner?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  hasReviewed?: boolean;
  reviewId?: string;
  review?: {
    _id: string;
    rating: number;
    title: string;
    comment: string;
    createdAt: string;
  };
}

interface ReviewFormData {
  propertyId: string;
  vendorId: string;
  rating: number;
  title: string;
  comment: string;
  tags: string[];
  isPublic: boolean;
}

const OwnedProperties = () => {
  const { isConnected } = useRealtime();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<OwnedProperty | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const [reviewForm, setReviewForm] = useState<ReviewFormData>({
    propertyId: '',
    vendorId: '',
    rating: 0,
    title: '',
    comment: '',
    tags: [],
    isPublic: true,
  });

  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.buildhomemartsquares.com/api';

  // Fetch owned properties
  const loadOwnedProperties = useCallback(async () => {
    try {
      setLoading(true);
      const token = authService.getToken();
      
      const response = await fetch(`${baseUrl}/customer/owned-properties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setProperties(data.data.properties || []);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to load owned properties",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load owned properties:', error);
      toast({
        title: "Error",
        description: "Failed to load owned properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Refresh properties
  const refreshProperties = useCallback(async () => {
    setRefreshing(true);
    await loadOwnedProperties();
    setRefreshing(false);
  }, [loadOwnedProperties]);

  // Load properties on mount
  useEffect(() => {
    loadOwnedProperties();
  }, [loadOwnedProperties]);

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         `${property.address.city}, ${property.address.state}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!selectedProperty) return;

    if (reviewForm.rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating for the property",
        variant: "destructive",
      });
      return;
    }

    if (!reviewForm.title.trim() || !reviewForm.comment.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and comment for your review",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingReview(true);
      const token = authService.getToken();

      const endpoint = isEditingReview && selectedProperty.reviewId
        ? `${baseUrl}/customer/reviews/${selectedProperty.reviewId}`
        : `${baseUrl}/customer/reviews`;

      const method = isEditingReview ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedProperty._id,
          vendorId: selectedProperty.owner?._id || selectedProperty.assignedBy?._id,
          rating: reviewForm.rating,
          title: reviewForm.title,
          comment: reviewForm.comment,
          reviewType: 'property',
          tags: reviewForm.tags,
          isPublic: reviewForm.isPublic,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: isEditingReview ? "Review updated successfully" : "Review submitted successfully",
        });
        
        // Reset form and close dialog first
        setIsReviewDialogOpen(false);
        setSelectedProperty(null);
        setReviewForm({
          propertyId: '',
          vendorId: '',
          rating: 0,
          title: '',
          comment: '',
          tags: [],
          isPublic: true,
        });
        setIsEditingReview(false);
        
        // Reload properties from server to get the updated data
        await loadOwnedProperties();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to submit review",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open review dialog
  const handleOpenReviewDialog = (property: OwnedProperty, isEdit: boolean = false) => {
    setSelectedProperty(property);
    setIsEditingReview(isEdit);
    
    if (isEdit && property.review) {
      setReviewForm({
        propertyId: property._id,
        vendorId: property.owner?._id || property.assignedBy?._id || '',
        rating: property.review.rating,
        title: property.review.title,
        comment: property.review.comment,
        tags: [],
        isPublic: true,
      });
    } else {
      setReviewForm({
        propertyId: property._id,
        vendorId: property.owner?._id || property.assignedBy?._id || '',
        rating: 0,
        title: '',
        comment: '',
        tags: [],
        isPublic: true,
      });
    }
    
    setIsReviewDialogOpen(true);
  };

  // Format price
  const formatPrice = (price: number, listingType: 'sale' | 'rent' | 'lease'): string => {
    if (listingType === 'rent') {
      return `₹${price.toLocaleString('en-IN')}/month`;
    } else if (listingType === 'lease') {
      return `₹${price.toLocaleString('en-IN')}/year`;
    } else {
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(1)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(1)} Lac`;
      } else {
        return `₹${price.toLocaleString('en-IN')}`;
      }
    }
  };

  // Format area
  const formatArea = (area: OwnedProperty['area']): string => {
    if (area.builtUp) {
      return `${area.builtUp} ${area.unit}`;
    } else if (area.plot) {
      return `${area.plot} ${area.unit}`;
    } else if (area.carpet) {
      return `${area.carpet} ${area.unit}`;
    }
    return 'Area not specified';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get primary image
  const getPrimaryImage = (property: OwnedProperty): string => {
    const primaryImage = property.images.find(img => img.isPrimary);
    return primaryImage?.url || property.images[0]?.url || '/placeholder-property.jpg';
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            Owned Properties
          </h1>
          <p className="text-muted-foreground mt-1">
            Properties you have purchased or rented
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refreshProperties}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{properties.length}</p>
                <p className="text-sm text-muted-foreground">Total Owned</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {properties.filter(p => p.status === 'sold').length}
                </p>
                <p className="text-sm text-muted-foreground">Purchased</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {properties.filter(p => p.status === 'rented').length}
                </p>
                <p className="text-sm text-muted-foreground">Rented</p>
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
                <SelectItem value="sold">Purchased</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
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
                        src={getPrimaryImage(property)}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={property.status === 'sold' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}>
                        {property.status === 'sold' ? 'Purchased' : 'Rented'}
                      </Badge>
                      {property.hasReviewed && (
                        <Badge className="bg-green-600 text-white">
                          <Star className="w-3 h-3 mr-1 fill-white" />
                          Reviewed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">{property.title}</h3>
                        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {property.address.city}, {property.address.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {property.status === 'sold' ? 'Purchased' : 'Rented'} on {formatDate(property.assignedAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                          {property.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>{formatArea(property.area)}</span>
                          <span>{property.bedrooms} BHK</span>
                          <span className="capitalize">{property.listingType}</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(property.price, property.listingType)}
                        </p>
                      </div>
                    </div>

                    {/* Owner/Seller Information */}
                    {property.owner && (
                      <div className="p-4 bg-muted/50 rounded-lg mb-4">
                        <h4 className="font-semibold mb-2 text-sm">Seller Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">{property.owner.name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span className="font-medium">{property.owner.email}</span>
                          </div>
                          {property.owner.phone && (
                            <div>
                              <span className="text-muted-foreground">Phone: </span>
                              <span className="font-medium">{property.owner.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Section */}
                    {property.hasReviewed && property.review ? (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-green-800 dark:text-green-200">Your Review</h4>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleOpenReviewDialog(property, true)}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Review
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= property.review!.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(property.review.createdAt)}
                          </span>
                        </div>
                        <h5 className="font-medium mb-1">{property.review.title}</h5>
                        <p className="text-sm text-muted-foreground">{property.review.comment}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                              Share Your Experience
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Help others by reviewing this property
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleOpenReviewDialog(property, false)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Write Review
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/property/${property._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedProperty(property);
                          setContactDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Seller
                      </Button>
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
              {properties.length === 0 ? 'No owned properties found' : 'No properties match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {properties.length === 0 
                ? 'You haven\'t purchased or rented any properties yet.'
                : 'Try adjusting your search criteria or clear some filters.'
              }
            </p>
            {properties.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditingReview ? 'Edit Your Review' : 'Write a Review'}
            </DialogTitle>
            <DialogDescription>
              Share your experience with this property to help other buyers make informed decisions.
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              {/* Property Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{selectedProperty.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProperty.address.city}, {selectedProperty.address.state}
                </p>
              </div>

              {/* Rating */}
              <div>
                <Label>Rating *</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 cursor-pointer transition-colors ${
                          star <= reviewForm.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {reviewForm.rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviewForm.rating === 1 && 'Poor'}
                    {reviewForm.rating === 2 && 'Fair'}
                    {reviewForm.rating === 3 && 'Good'}
                    {reviewForm.rating === 4 && 'Very Good'}
                    {reviewForm.rating === 5 && 'Excellent'}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="review-title">Review Title *</Label>
                <Input
                  id="review-title"
                  placeholder="Sum up your experience in one line"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="mt-2"
                  maxLength={200}
                />
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="review-comment">Your Review *</Label>
                <Textarea
                  id="review-comment"
                  placeholder="Share your experience with this property..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="mt-2"
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reviewForm.comment.length}/1000 characters
                </p>
              </div>

              {/* Public/Private */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public-review"
                  checked={reviewForm.isPublic}
                  onChange={(e) => setReviewForm({ ...reviewForm, isPublic: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="public-review" className="cursor-pointer">
                  Make this review public
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReviewDialogOpen(false);
                setSelectedProperty(null);
                setIsEditingReview(false);
              }}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {isEditingReview ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Seller Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Seller</DialogTitle>
            <DialogDescription>
              Choose your preferred method to get in touch with the property seller.
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && selectedProperty.owner && (
            <div className="space-y-4">
              {/* Seller Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Seller Information</h4>
                <p className="text-sm mb-1">
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-medium">{selectedProperty.owner.name}</span>
                </p>
                {selectedProperty.owner.email && (
                  <p className="text-sm mb-1">
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium">{selectedProperty.owner.email}</span>
                  </p>
                )}
                {selectedProperty.owner.phone && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Phone: </span>
                    <span className="font-medium">{selectedProperty.owner.phone}</span>
                  </p>
                )}
              </div>

              {/* Property Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{selectedProperty.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProperty.address.city}, {selectedProperty.address.state}
                </p>
              </div>

              {/* Contact Actions */}
              <div className="flex flex-col gap-2">
                {selectedProperty.owner.phone && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = `tel:${selectedProperty.owner!.phone}`;
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Seller
                  </Button>
                )}
                {selectedProperty.owner.email && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      window.location.href = `mailto:${selectedProperty.owner!.email}?subject=Inquiry about ${selectedProperty.title}`;
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Seller
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setContactDialogOpen(false);
                    navigate('/customer/messages');
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          )}

          {selectedProperty && !selectedProperty.owner && (
            <div className="p-4 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>Seller contact information is not available.</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnedProperties;

