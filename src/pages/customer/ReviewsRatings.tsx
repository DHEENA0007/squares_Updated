import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Search,
  Calendar,
  MapPin,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
  Home,
  Filter
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRealtime } from "@/contexts/RealtimeContext";
import { authService } from "@/services/authService";

interface PropertyReview {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  reviewType: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  property: {
    _id: string;
    title: string;
    address: {
      city: string;
      state: string;
    };
    type: string;
    status: string;
    price: number;
    images?: Array<{
      url: string;
      isPrimary: boolean;
    }>;
  };
  vendor?: {
    _id: string;
    name: string;
    email: string;
  };
}

const ReviewsRatings = () => {
  const { isConnected } = useRealtime();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PropertyReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.buildhomemartsquares.com/api';

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const token = authService.getToken();

      const response = await fetch(`${baseUrl}/customer/reviews/given`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setReviews(data.data?.reviews || []);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to load reviews",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const refreshReviews = useCallback(async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  }, [loadReviews]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      setDeleting(true);
      const token = authService.getToken();

      const response = await fetch(`${baseUrl}/customer/reviews/${selectedReview._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Review deleted successfully",
        });

        setReviews(prev => prev.filter(r => r._id !== selectedReview._id));
        setDeleteDialogOpen(false);
        setSelectedReview(null);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete review",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         `${review.property?.address?.city || ''}, ${review.property?.address?.state || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
    
    return matchesSearch && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'rating-high':
        return b.rating - a.rating;
      case 'rating-low':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPrimaryImage = (images?: Array<{ url: string; isPrimary: boolean }>): string => {
    if (!images || images.length === 0) return '/placeholder-property.jpg';
    const primaryImage = images.find(img => img.isPrimary);
    return primaryImage?.url || images[0]?.url || '/placeholder-property.jpg';
  };

  return (
    <div className="space-y-6 pt-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="w-8 h-8 text-primary fill-primary" />
            Reviews & Ratings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your reviews and see what you have shared
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshReviews}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => navigate('/customer/owned-properties')}>
            <Home className="w-4 h-4 mr-2" />
            View Properties
          </Button>
        </div>
      </div>

      {!loading && reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{reviews.length}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reviews.filter(r => r.rating >= 4).length}
                </p>
                <p className="text-sm text-muted-foreground">Positive Reviews</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reviews.filter(r => r.isPublic).length}
                </p>
                <p className="text-sm text-muted-foreground">Public Reviews</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search reviews or properties..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Rating" />
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="rating-high">Rating: High to Low</SelectItem>
                <SelectItem value="rating-low">Rating: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!loading && filteredReviews.length > 0 && (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-48 h-48 lg:h-auto bg-muted relative">
                    <img 
                      src={getPrimaryImage(review.property?.images)}
                      alt={review.property?.title || 'Property'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={review.property?.status === 'sold' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}>
                        {review.property?.status === 'sold' ? 'Purchased' : 'Rented'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold mb-1">{review.property?.title || 'Property'}</h3>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {review.property?.address?.city || ''}, {review.property?.address?.state || ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Reviewed on {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-lg">{review.rating}.0</span>
                        {review.isPublic ? (
                          <Badge variant="secondary">Public</Badge>
                        ) : (
                          <Badge variant="outline">Private</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold text-lg mb-2">{review.title}</h4>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </div>

                    {review.vendor && (
                      <div className="p-3 bg-muted/50 rounded-lg mb-4">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Seller: </span>
                          <span className="font-medium">{review.vendor.name}</span>
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/property/${review.property?._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Property
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate('/customer/owned-properties')}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Review
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedReview(review);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>

                    {review.updatedAt !== review.createdAt && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Last updated: {formatDate(review.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading your reviews...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && filteredReviews.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {reviews.length === 0 
                ? "You haven't written any reviews yet. Visit your owned properties to write your first review!"
                : 'Try adjusting your search criteria or clear some filters.'
              }
            </p>
            <div className="flex gap-2 justify-center">
              {reviews.length === 0 ? (
                <Button onClick={() => navigate('/customer/owned-properties')}>
                  <Home className="w-4 h-4 mr-2" />
                  View Owned Properties
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setRatingFilter("all");
                    setSortBy("newest");
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-1">{selectedReview.title}</p>
              <p className="text-sm text-muted-foreground">{selectedReview.property?.title || 'Property'}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedReview(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteReview}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsRatings;
