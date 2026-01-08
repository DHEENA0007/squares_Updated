import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Home,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  MessageSquare,
  Eye,
  Edit3,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  Camera,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { propertyService, type Property } from '@/services/propertyService';
import { customerReviewsService } from '@/services/customerReviewsService';
import { configurationService } from '@/services/configurationService';
import type { FilterConfiguration } from '@/types/configuration';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const OwnedProperties: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterConfigs, setFilterConfigs] = useState<FilterConfiguration[]>([]);

  // Review Dialog State
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  // Contact Dialog State
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const response = await propertyService.getOwnedProperties();
      setProperties(response.data.properties);
    } catch (error) {
      console.error('Error fetching owned properties:', error);
      toast({
        title: "Error",
        description: "Failed to load your properties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFilterConfigs = useCallback(async () => {
    try {
      const configs = await configurationService.getAllFilterConfigurations();
      setFilterConfigs(configs);
    } catch (error) {
      console.error('Error fetching filter configurations:', error);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchFilterConfigs();
  }, [fetchProperties, fetchFilterConfigs]);

  const refreshProperties = () => {
    setRefreshing(true);
    fetchProperties();
  };

  const getListingTypeLabel = (value: string) => {
    const config = filterConfigs.find(c => c.value === value);
    return config ? (config.displayLabel || config.name) : value.charAt(0).toUpperCase() + value.slice(1);
  };

  const handleOpenReviewDialog = (property: Property, isEdit: boolean) => {
    setSelectedProperty(property);
    setIsEditingReview(isEdit);

    if (isEdit && property.review) {
      setReviewRating(property.review.rating);
      setReviewTitle(property.review.title);
      setReviewComment(property.review.comment);
    } else {
      setReviewRating(0);
      setReviewTitle('');
      setReviewComment('');
    }

    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedProperty) return;

    if (reviewRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive"
      });
      return;
    }

    if (!reviewTitle.trim() || !reviewComment.trim()) {
      toast({
        title: "Fields Required",
        description: "Please fill in both title and comment",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReview(true);

    try {
      const reviewData = {
        propertyId: selectedProperty._id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
        reviewType: 'property' as const
      };

      if (isEditingReview && selectedProperty.review) {
        await customerReviewsService.updateReview(selectedProperty.review._id, reviewData);
        toast({
          title: "Success",
          description: "Review updated successfully",
        });
      } else {
        await customerReviewsService.createReview(reviewData);
        toast({
          title: "Success",
          description: "Review submitted successfully",
        });
      }

      setIsReviewDialogOpen(false);
      fetchProperties(); // Refresh to show new review
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const listingTypeConfigs = filterConfigs
    .filter(c => c.filterType === 'listing_type' || c.filterType === 'listingType')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const filteredProperties = properties.filter(property => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property.address.district && property.address.district.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      property.status === statusFilter ||
      property.listingType === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteReview = async () => {
    if (!selectedProperty?.review) return;

    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await customerReviewsService.deleteReview(selectedProperty.review._id);
      toast({
        title: "Success",
        description: "Review deleted successfully",
      });
      setIsReviewDialogOpen(false);
      fetchProperties();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive"
      });
    }
  };

  const getPrimaryImage = (property: Property) => {
    if (property.images && property.images.length > 0) {
      const primary = property.images.find(img => img.isPrimary);
      return primary ? primary.url : property.images[0].url;
    }
    return '/placeholder-image.jpg';
  };

  const formatPrice = (price: number, type: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price) + (type === 'rent' || type === 'lease' ? '' : '');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatArea = (area: any) => {
    if (!area) return 'N/A';
    if (typeof area === 'object') {
      const value = area.builtUp || area.plot || area.carpet;
      const unit = area.unit || 'sqft';
      return value ? `${value} ${unit}` : 'N/A';
    }
    return area;
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Owned Properties</h1>
            <p className="text-muted-foreground mt-1">
              Manage your purchased and rented properties
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refreshProperties}
            disabled={refreshing}
            className="w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Owned</p>
                  <p className="text-2xl font-bold text-foreground">{properties.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Purchased</p>
                  <p className="text-2xl font-bold text-foreground">
                    {properties.filter(p => p.status === 'sold').length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Rented</p>
                  <p className="text-2xl font-bold text-foreground">
                    {properties.filter(p => p.status === 'rented').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by location, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-input bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {listingTypeConfigs.length > 0 ? (
                listingTypeConfigs.map(config => (
                  <SelectItem key={config.value} value={config.value}>
                    {config.displayLabel || config.name}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="sold">Purchased</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Properties Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property._id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card">
                {/* Image Section */}
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {property.images.length > 0 ? (
                    <img
                      src={getPrimaryImage(property)}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Camera className="w-12 h-12 opacity-20" />
                    </div>
                  )}

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Price Tag */}
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xl font-bold">
                      {formatPrice(property.price, property.listingType)}
                    </p>
                    <p className="text-xs text-white/80">
                      {property.status === 'sold' ? 'Purchase Price' : 'Rent Amount'}
                    </p>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-4 space-y-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className={`${property.status === 'sold' ? 'bg-purple-600 dark:bg-purple-900/50' : 'bg-blue-600 dark:bg-blue-900/50'} border-0`}>
                        {property.status === 'sold' ? 'Purchased' : getListingTypeLabel(property.listingType)}
                      </Badge>
                      <Badge variant="outline" className="border-border text-muted-foreground capitalize">
                        {property.type}
                      </Badge>
                      {property.hasReviewed && (
                        <Badge className="bg-green-600 dark:bg-green-900/50 border-0">
                          <Star className="w-3 h-3 mr-1 fill-white" />
                          Reviewed
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {property.address.district ? `${property.address.city}, ${property.address.district}` : property.address.city}
                      </span>
                    </div>
                  </div>

                  {/* Key Specs */}
                  <div className="flex items-center justify-between py-3 border-t border-b border-border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Bed</p>
                      <p className="font-semibold text-foreground">{property.bedrooms || '-'}</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Bath</p>
                      <p className="font-semibold text-foreground">{property.bathrooms || '-'}</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Area</p>
                      <p className="font-semibold text-foreground">
                        {property.area && typeof property.area === 'object'
                          ? ((property.area as any).builtUp || (property.area as any).plot || '-')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Review Section */}
                  {property.hasReviewed && property.review ? (
                    <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-100 dark:border-green-900/30">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${star <= property.review!.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                            />
                          ))}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleOpenReviewDialog(property, true)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-green-800 dark:text-green-300 line-clamp-1 font-medium">{property.review.title}</p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                      onClick={() => handleOpenReviewDialog(property, false)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Write a Review
                    </Button>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedProperty(property);
                        setContactDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/property/${property._id}`)}
                    >
                      View Details
                    </Button>
                  </div>

                  <div className="text-xs text-center text-muted-foreground pt-1">
                    {property.status === 'sold' ? 'Purchased' : 'Rented'} on {formatDate(property.assignedAt)}
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

            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-2">
                <Label>Your Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= reviewRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-200'
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  placeholder="Summarize your experience"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Detailed Review</Label>
                <Textarea
                  id="comment"
                  placeholder="What did you like or dislike? How was the neighborhood?"
                  className="min-h-[150px]"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {isEditingReview && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteReview}
                  className="sm:mr-auto"
                >
                  Delete Review
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? 'Submitting...' : (isEditingReview ? 'Update Review' : 'Submit Review')}
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
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-lg">
                      {selectedProperty.owner.profile.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedProperty.owner.profile.firstName} {selectedProperty.owner.profile.lastName}</p>
                    <p className="text-sm text-muted-foreground">Property Owner</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {selectedProperty.owner.profile.phone && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.location.href = `tel:${selectedProperty.owner.profile.phone}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call {selectedProperty.owner.profile.phone}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.location.href = `mailto:${selectedProperty.owner?.email}`}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email {selectedProperty.owner.email}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OwnedProperties;
