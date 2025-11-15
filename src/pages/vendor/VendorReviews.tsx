import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  Search,
  Calendar,
  MapPin,
  MessageSquare,
  User,
  RefreshCw,
  Send,
  Home,
  Filter,
  TrendingUp
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PropertyReview {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  reviewType: 'property' | 'service' | 'general';
  isPublic: boolean;
  helpfulVotes: number;
  unhelpfulVotes: number;
  vendorResponse?: {
    message: string;
    respondedAt: string;
  };
  tags: string[];
  images: Array<{ url: string; caption?: string }>;
  createdAt: string;
  updatedAt: string;
  client: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  property: {
    _id: string;
    title: string;
    address: {
      city: string;
      state: string;
      street?: string;
    };
    images?: Array<{
      url: string;
      isPrimary: boolean;
    }>;
    status: 'sold' | 'rented' | 'available';
    type: string;
    listingType: string;
    price: number;
  } | null;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  totalHelpful: number;
}

const VendorReviews = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.buildhomemartsquares.com/api';

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const queryParams = new URLSearchParams();
      if (ratingFilter !== 'all') queryParams.append('rating', ratingFilter);
      if (typeFilter !== 'all') queryParams.append('reviewType', typeFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      queryParams.append('sortBy', sortBy === 'newest' ? 'createdAt' : sortBy === 'oldest' ? 'createdAt' : 'rating');
      queryParams.append('sortOrder', sortBy === 'oldest' || sortBy === 'rating-low' ? 'asc' : 'desc');

      const response = await fetch(`${baseUrl}/vendors/reviews?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setReviews(data.data.reviews || []);
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
  }, [baseUrl, ratingFilter, typeFilter, searchQuery, sortBy]);

  const loadStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${baseUrl}/vendors/reviews/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [baseUrl]);

  const refreshReviews = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadReviews(), loadStats()]);
    setRefreshing(false);
  }, [loadReviews, loadStats]);

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [loadReviews, loadStats]);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
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

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredReviews = reviews;

  return (
    <div className="space-y-6 pt-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="w-8 h-8 text-primary fill-primary" />
            Reviews & Ratings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer feedback and maintain your reputation
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refreshReviews}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalReviews}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.averageRating.toFixed(1)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {stats.ratingDistribution[5] + stats.ratingDistribution[4]}
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

      {stats && stats.totalReviews > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Rating Distribution
            </h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-yellow-400 h-full transition-all"
                      style={{ 
                        width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search reviews..."
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="general">General</SelectItem>
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
                  {review.property && (
                    <div className="lg:w-48 h-48 lg:h-auto bg-muted relative">
                      <img 
                        src={getPrimaryImage(review.property.images)}
                        alt={review.property.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge className={review.property.status === 'sold' ? 'bg-purple-600 text-white' : review.property.status === 'rented' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}>
                          {review.property.status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.client?.avatar} />
                          <AvatarFallback>
                            {review.client ? getInitials(review.client.name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{review.client?.name || 'Anonymous'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {review.reviewType}
                      </Badge>
                    </div>

                    {review.property && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{review.property.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          {review.property.address.city}, {review.property.address.state}
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
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
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-1">{review.title}</h4>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </div>
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
              <span>Loading reviews...</span>
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
                ? 'Reviews from customers will appear here once they submit feedback on your properties.'
                : 'Try adjusting your search criteria or clear some filters.'
              }
            </p>
            {reviews.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setRatingFilter("all");
                  setTypeFilter("all");
                  setSortBy("newest");
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorReviews;
