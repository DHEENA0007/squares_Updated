import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Filter,
  Search,
  Calendar,
  MapPin,
  User,
  Flag,
  Edit3,
  Trash2,
  Reply,
  Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { customerReviewsService, CustomerReview, ReviewStats, NewReview } from "@/services/customerReviewsService";
import { useRealtime } from "@/contexts/RealtimeContext";
import { toast } from "@/hooks/use-toast";

const ReviewsRatings = () => {
  const { subscribe } = useRealtime();
  
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState<string | null>(null);
  
  // Data states
  const [receivedReviews, setReceivedReviews] = useState<CustomerReview[]>([]);
  const [givenReviews, setGivenReviews] = useState<CustomerReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewableItems, setReviewableItems] = useState<{
    properties: Array<{ 
      _id: string; 
      title: string; 
      location: string; 
      purchaseDate?: string;
      status: 'purchased' | 'rented' | 'leased';
      canReview: boolean;
      hasReviewed: boolean;
    }>;
    services: Array<{ 
      _id: string; 
      name: string; 
      category: string; 
      vendorName: string;
      vendorId: string;
      bookingDate?: string;
      completionDate?: string;
      status: 'completed' | 'ongoing' | 'cancelled';
      canReview: boolean;
      hasReviewed: boolean;
    }>;
    vendors: Array<{ 
      _id: string; 
      name: string; 
      businessName: string;
      interactionDate?: string;
      interactionType: 'property_purchase' | 'service_booking' | 'general';
      canReview: boolean;
      hasReviewed: boolean;
    }>;
  }>({ properties: [], services: [], vendors: [] });
  
  // Loading states
  const [isLoadingReceived, setIsLoadingReceived] = useState(true);
  const [isLoadingGiven, setIsLoadingGiven] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Pagination
  const [receivedPagination, setReceivedPagination] = useState({ 
    currentPage: 1, 
    totalPages: 1, 
    totalCount: 0 
  });
  const [givenPagination, setGivenPagination] = useState({ 
    currentPage: 1, 
    totalPages: 1, 
    totalCount: 0 
  });
  
  const [newReview, setNewReview] = useState<NewReview>({
    rating: 0,
    title: "",
    comment: "",
    reviewType: "property",
    isPublic: true,
    tags: []
  });

  // Load data on component mount and tab change
  useEffect(() => {
    loadReviewableItems();
    if (activeTab === 'received') {
      loadReceivedReviews();
      loadReviewStats();
    } else {
      loadGivenReviews();
    }
  }, [activeTab]);

  // Real-time event listeners
  useEffect(() => {
    const unsubscribeReviewUpdate = subscribe('review_updated', (data) => {
      if (activeTab === 'received') {
        setReceivedReviews(prev => 
          prev.map(review => 
            review._id === data.reviewId ? { ...review, ...data.updates } : review
          )
        );
      } else {
        setGivenReviews(prev => 
          prev.map(review => 
            review._id === data.reviewId ? { ...review, ...data.updates } : review
          )
        );
      }
    });

    const unsubscribeNewReview = subscribe('review_created', (data) => {
      if (activeTab === 'received' && data.review.vendorId === 'current_user_id') {
        setReceivedReviews(prev => [data.review, ...prev]);
        loadReviewStats(); // Refresh stats
      }
    });

    return () => {
      unsubscribeReviewUpdate();
      unsubscribeNewReview();
    };
  }, [subscribe, activeTab]);

  // Data loading functions
  const loadReceivedReviews = async (page = 1) => {
    setIsLoadingReceived(true);
    try {
      const response = await customerReviewsService.getReceivedReviews({
        page,
        limit: 10,
        search: searchQuery || undefined,
        rating: filterRating !== 'all' ? parseInt(filterRating) : undefined,
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'oldest' ? 'createdAt' : 
               sortBy === 'highest' ? 'rating' : sortBy === 'lowest' ? 'rating' : 
               sortBy === 'helpful' ? 'helpfulCount' : 'createdAt',
        sortOrder: sortBy === 'oldest' || sortBy === 'lowest' ? 'asc' : 'desc'
      });
      
      setReceivedReviews(response.reviews);
      setReceivedPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount
      });
    } catch (error) {
      console.error('Failed to load received reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load received reviews",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReceived(false);
    }
  };

  const loadGivenReviews = async (page = 1) => {
    setIsLoadingGiven(true);
    try {
      const response = await customerReviewsService.getMyReviews({
        page,
        limit: 10,
        search: searchQuery || undefined,
        rating: filterRating !== 'all' ? parseInt(filterRating) : undefined,
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'oldest' ? 'createdAt' : 
               sortBy === 'highest' ? 'rating' : sortBy === 'lowest' ? 'rating' : 
               sortBy === 'helpful' ? 'helpfulCount' : 'createdAt',
        sortOrder: sortBy === 'oldest' || sortBy === 'lowest' ? 'asc' : 'desc'
      });
      
      setGivenReviews(response.reviews);
      setGivenPagination({
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount
      });
    } catch (error) {
      console.error('Failed to load given reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load given reviews",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGiven(false);
    }
  };

  const loadReviewStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await customerReviewsService.getMyReviewStats();
      setReviewStats(stats);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadReviewableItems = async () => {
    try {
      const items = await customerReviewsService.getReviewableItems();
      setReviewableItems(items);
    } catch (error) {
      console.error('Failed to load reviewable items:', error);
    }
  };

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'received') {
        loadReceivedReviews(1);
      } else {
        loadGivenReviews(1);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterRating, sortBy]);

  const currentReviews = activeTab === 'received' ? receivedReviews : givenReviews;
  const currentPagination = activeTab === 'received' ? receivedPagination : givenPagination;
  const isCurrentlyLoading = activeTab === 'received' ? isLoadingReceived : isLoadingGiven;

  // Rating overview calculation
  const averageRating = reviewStats?.averageRating || 0;
  const ratingDistribution = reviewStats ? [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution] || 0,
    percentage: reviewStats.totalReviews > 0 
      ? ((reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution] || 0) / reviewStats.totalReviews) * 100 
      : 0
  })) : [];

  // Action handlers
  const handleWriteReview = async () => {
    if (!newReview.rating || !newReview.title.trim() || !newReview.comment.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const result = await customerReviewsService.createReview(newReview);
      if (result) {
        setIsWritingReview(false);
        setNewReview({
          rating: 0,
          title: "",
          comment: "",
          reviewType: "property",
          isPublic: true,
          tags: []
        });
        // Reload the appropriate reviews list
        if (activeTab === 'given') {
          loadGivenReviews(1);
        }
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = async (reviewId: string, updateData: Partial<CustomerReview>) => {
    try {
      const result = await customerReviewsService.updateReview(reviewId, updateData);
      if (result) {
        // Update the review in the appropriate list
        if (activeTab === 'received') {
          setReceivedReviews(prev => 
            prev.map(review => 
              review._id === reviewId ? { ...review, ...result } : review
            )
          );
        } else {
          setGivenReviews(prev => 
            prev.map(review => 
              review._id === reviewId ? { ...review, ...result } : review
            )
          );
        }
        setIsEditingReview(null);
      }
    } catch (error) {
      console.error('Failed to update review:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const success = await customerReviewsService.deleteReview(reviewId);
      if (success) {
        // Remove the review from the appropriate list
        if (activeTab === 'received') {
          setReceivedReviews(prev => prev.filter(review => review._id !== reviewId));
        } else {
          setGivenReviews(prev => prev.filter(review => review._id !== reviewId));
        }
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const handleMarkHelpful = async (reviewId: string, isHelpful: boolean) => {
    try {
      const success = await customerReviewsService.markReviewHelpful(reviewId, isHelpful);
      if (success) {
        // Update the review's helpful count in the list
        const updateReview = (review: CustomerReview) => {
          if (review._id === reviewId) {
            const currentVote = review.userHelpfulVote;
            let newHelpfulCount = review.helpfulCount;
            let newUnhelpfulCount = review.unhelpfulCount;
            
            // Remove previous vote if exists
            if (currentVote === 'helpful') newHelpfulCount--;
            if (currentVote === 'unhelpful') newUnhelpfulCount--;
            
            // Add new vote
            if (isHelpful) {
              newHelpfulCount++;
            } else {
              newUnhelpfulCount++;
            }
            
            return {
              ...review,
              helpfulCount: newHelpfulCount,
              unhelpfulCount: newUnhelpfulCount,
              userHelpfulVote: isHelpful ? 'helpful' as const : 'unhelpful' as const
            };
          }
          return review;
        };

        if (activeTab === 'received') {
          setReceivedReviews(prev => prev.map(updateReview));
        } else {
          setGivenReviews(prev => prev.map(updateReview));
        }
      }
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
  };

  const handleReplyToReview = async (reviewId: string, message: string) => {
    try {
      const success = await customerReviewsService.replyToReview(reviewId, message);
      if (success) {
        // Refresh the received reviews to get the updated reply
        loadReceivedReviews(receivedPagination.currentPage);
      }
    } catch (error) {
      console.error('Failed to reply to review:', error);
    }
  };

  const handleReportReview = async (reviewId: string, reason: string) => {
    try {
      await customerReviewsService.reportReview(reviewId, reason);
    } catch (error) {
      console.error('Failed to report review:', error);
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "sm") => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6"
    };

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const getReviewableItemName = (review: CustomerReview): string => {
    if (review.property) {
      return `${review.property.title} - ${review.property.location}`;
    } else if (review.service) {
      return `${review.service.name} (${review.service.category})`;
    } else if (review.vendor) {
      return review.vendor.businessName || review.vendor.name;
    }
    return 'Unknown';
  };

  const getReviewableItemsList = () => {
    const items = [];
    
    // Only show properties that can be reviewed (purchased/rented and not already reviewed)
    reviewableItems.properties
      .filter(property => property.canReview && !property.hasReviewed)
      .forEach(property => {
        const statusText = property.status === 'purchased' ? 'Purchased' : 
                          property.status === 'rented' ? 'Rented' : 'Leased';
        const dateText = property.purchaseDate ? 
          ` (${statusText} on ${new Date(property.purchaseDate).toLocaleDateString()})` : 
          ` (${statusText})`;
        
        items.push({
          id: property._id,
          type: 'property' as const,
          name: `${property.title} - ${property.location}${dateText}`,
          category: 'Property',
          status: property.status,
          canReview: true
        });
      });
    
    // Only show services that are completed and can be reviewed
    reviewableItems.services
      .filter(service => service.canReview && !service.hasReviewed && service.status === 'completed')
      .forEach(service => {
        const dateText = service.completionDate ? 
          ` (Completed on ${new Date(service.completionDate).toLocaleDateString()})` : 
          ' (Completed)';
        
        items.push({
          id: service._id,
          type: 'service' as const,
          name: `${service.name} by ${service.vendorName}${dateText}`,
          category: service.category,
          status: service.status,
          canReview: true
        });
      });
    
    // Only show vendors that can be reviewed
    reviewableItems.vendors
      .filter(vendor => vendor.canReview && !vendor.hasReviewed)
      .forEach(vendor => {
        const interactionText = vendor.interactionDate ? 
          ` (${new Date(vendor.interactionDate).toLocaleDateString()})` : '';
        
        items.push({
          id: vendor._id,
          type: 'vendor' as const,
          name: `${vendor.businessName || vendor.name}${interactionText}`,
          category: 'Vendor',
          status: 'active',
          canReview: true
        });
      });
    
    return items;
  };

  const getReviewableItemsCount = () => {
    const properties = reviewableItems.properties.filter(p => p.canReview && !p.hasReviewed).length;
    const services = reviewableItems.services.filter(s => s.canReview && !s.hasReviewed && s.status === 'completed').length;
    const vendors = reviewableItems.vendors.filter(v => v.canReview && !v.hasReviewed).length;
    return properties + services + vendors;
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="w-8 h-8 text-primary" />
            Reviews & Ratings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your reviews and see what others are saying
          </p>
        </div>
        
        <Dialog open={isWritingReview} onOpenChange={setIsWritingReview}>
          <DialogTrigger asChild>
            <Button disabled={getReviewableItemsCount() === 0}>
              <Edit3 className="w-4 h-4 mr-2" />
              Write Review
              {getReviewableItemsCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getReviewableItemsCount()}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Review properties you've purchased/rented or services you've received
              </p>
            </DialogHeader>
            {getReviewableItemsCount() === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Items to Review</h3>
                <p className="text-muted-foreground">
                  You can only review properties you've purchased/rented or services you've completed.
                  Complete a transaction or service booking to leave a review.
                </p>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Review Type</Label>
                <Select 
                  value={newReview.reviewType}
                  onValueChange={(value: 'property' | 'service' | 'vendor') => 
                    setNewReview(prev => ({ ...prev, reviewType: value, propertyId: undefined, serviceId: undefined, vendorId: undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose what to review" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select {newReview.reviewType}</Label>
                <Select 
                  value={
                    newReview.reviewType === 'property' ? newReview.propertyId :
                    newReview.reviewType === 'service' ? newReview.serviceId :
                    newReview.vendorId
                  }
                  onValueChange={(value) => {
                    const update: Partial<NewReview> = {};
                    if (newReview.reviewType === 'property') {
                      update.propertyId = value;
                    } else if (newReview.reviewType === 'service') {
                      update.serviceId = value;
                    } else {
                      update.vendorId = value;
                    }
                    setNewReview(prev => ({ ...prev, ...update }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Choose a ${newReview.reviewType} to review`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getReviewableItemsList()
                      .filter(item => item.type === newReview.reviewType)
                      .map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= newReview.rating 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Review Title</Label>
                <Input
                  placeholder="Summarize your experience"
                  value={newReview.title}
                  onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Your Review</Label>
                <Textarea
                  placeholder="Share your detailed experience..."
                  rows={4}
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsWritingReview(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleWriteReview} 
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Review
                </Button>
              </div>
            </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Rating Overview - Only show for received reviews */}
      {activeTab === 'received' && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                  {renderStars(Math.round(averageRating), "lg")}
                  <p className="text-muted-foreground mt-2">
                    Based on {reviewStats?.totalReviews || 0} reviews
                  </p>
                </div>
                
                <div className="space-y-2">
                  {ratingDistribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">{rating}</span>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'received' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Received Reviews ({receivedPagination.totalCount})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'given' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Given Reviews ({givenPagination.totalCount})
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Rating</SelectItem>
                <SelectItem value="lowest">Lowest Rating</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {isCurrentlyLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading reviews...
              </div>
            </CardContent>
          </Card>
        ) : currentReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reviews Found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'received' 
                    ? "You haven't received any reviews yet. Start listing properties or offering services to receive customer feedback." 
                    : "You haven't written any reviews yet. Purchase a property or book a service to share your experience."
                  }
                </p>
                {activeTab === 'given' && getReviewableItemsCount() > 0 && (
                  <Button 
                    className="mt-4"
                    onClick={() => setIsWritingReview(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Write Your First Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          currentReviews.map((review) => (
            <Card key={review._id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={review.clientAvatar} />
                        <AvatarFallback>
                          {review.clientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{review.clientName}</h4>
                          {review.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                          <Badge 
                            className={`text-xs ${customerReviewsService.getReviewTypeColor(review.reviewType)}`}
                          >
                            {customerReviewsService.getReviewTypeLabel(review.reviewType)}
                          </Badge>
                        </div>
                        {renderStars(review.rating)}
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {customerReviewsService.formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleReportReview(review._id, 'inappropriate')}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Item Info */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{getReviewableItemName(review)}</span>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">{review.title}</h3>
                    <p className="text-muted-foreground">{review.comment}</p>
                    
                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {review.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <button 
                        className={`flex items-center gap-1 text-sm transition-colors ${
                          review.userHelpfulVote === 'helpful' 
                            ? 'text-green-600' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => handleMarkHelpful(review._id, true)}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Helpful ({review.helpfulCount})
                      </button>
                      <button 
                        className={`flex items-center gap-1 text-sm transition-colors ${
                          review.userHelpfulVote === 'unhelpful' 
                            ? 'text-red-600' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => handleMarkHelpful(review._id, false)}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Not Helpful ({review.unhelpfulCount})
                      </button>
                    </div>
                    
                    {activeTab === 'received' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const message = prompt('Enter your reply:');
                          if (message) {
                            handleReplyToReview(review._id, message);
                          }
                        }}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    )}
                    
                    {activeTab === 'given' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsEditingReview(review._id)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Vendor Response */}
                  {review.vendorResponse && (
                    <div className="space-y-3 pl-12 border-l-2 border-muted">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {review.vendorResponse.vendorName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{review.vendorResponse.vendorName}</span>
                          <Badge variant="secondary" className="text-xs">
                            Owner
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {customerReviewsService.formatDate(review.vendorResponse.respondedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">{review.vendorResponse.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Reviewable Items Section - Show when no reviews but items available */}
        {activeTab === 'given' && currentReviews.length === 0 && !isCurrentlyLoading && getReviewableItemsCount() > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Items You Can Review
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These are properties you've purchased/rented or services you've completed. Share your experience!
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {getReviewableItemsList().map((item, index) => (
                  <div key={`${item.type}-${item.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.type === 'property' ? 'bg-blue-100 text-blue-600' :
                        item.type === 'service' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {item.type === 'property' ? <MapPin className="w-5 h-5" /> :
                         item.type === 'service' ? <Star className="w-5 h-5" /> :
                         <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setNewReview(prev => ({
                          ...prev,
                          reviewType: item.type,
                          [item.type === 'property' ? 'propertyId' : 
                           item.type === 'service' ? 'serviceId' : 'vendorId']: item.id
                        }));
                        setIsWritingReview(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Write Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {currentPagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPagination.currentPage === 1}
              onClick={() => {
                if (activeTab === 'received') {
                  loadReceivedReviews(currentPagination.currentPage - 1);
                } else {
                  loadGivenReviews(currentPagination.currentPage - 1);
                }
              }}
            >
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPagination.currentPage} of {currentPagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPagination.currentPage === currentPagination.totalPages}
              onClick={() => {
                if (activeTab === 'received') {
                  loadReceivedReviews(currentPagination.currentPage + 1);
                } else {
                  loadGivenReviews(currentPagination.currentPage + 1);
                }
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsRatings;