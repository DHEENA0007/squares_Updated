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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { propertyService, Property } from "@/services/propertyService";
import { Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
      district?: string;
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

  const [properties, setProperties] = useState<Property[]>([]);
  const navigate = useNavigate();

  const baseUrl = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';

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

  const loadProperties = useCallback(async () => {
    try {
      const response = await propertyService.getVendorProperties();
      if (response.success) {
        setProperties(response.data.properties);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  }, []);

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
    await Promise.all([loadReviews(), loadStats(), loadProperties()]);
    setRefreshing(false);
  }, [loadReviews, loadStats, loadProperties]);

  useEffect(() => {
    loadReviews();
    loadStats();
    loadProperties();
  }, [loadReviews, loadStats, loadProperties]);

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
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats Grid */}
        <div className="lg:col-span-2 space-y-6">
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary text-primary-foreground border-none shadow-md">
                <CardContent className="p-6 flex flex-col justify-between h-32">
                  <p className="text-sm font-medium opacity-90">Total Reviews</p>
                  <p className="text-4xl font-bold">{stats.totalReviews}</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-md">
                <CardContent className="p-6 flex flex-col justify-between h-32">
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-4xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</p>
                    <Star className="w-6 h-6 fill-primary text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-md">
                <CardContent className="p-6 flex flex-col justify-between h-32">
                  <p className="text-sm font-medium text-muted-foreground">Positive Reviews</p>
                  <p className="text-4xl font-bold text-green-600">{stats.ratingDistribution[5] + stats.ratingDistribution[4]}</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-md">
                <CardContent className="p-6 flex flex-col justify-between h-32">
                  <p className="text-sm font-medium text-muted-foreground">Public Reviews</p>
                  <p className="text-4xl font-bold text-foreground">{reviews.filter(r => r.isPublic).length}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Ratings List Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-secondary/30 dark:bg-muted/20 border-none shadow-inner min-h-[300px]">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Ratings List</h3>
                <div className="flex gap-2">
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-[100px] h-8 text-xs bg-background">
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px] custom-scrollbar">
                {!loading && filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <div key={review._id} className="bg-card p-3 rounded-lg shadow-sm border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={review.client?.avatar} />
                            <AvatarFallback>{review.client ? getInitials(review.client.name) : 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{review.client?.name || 'Anonymous'}</p>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                      {review.property && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          For: {review.property.title}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No reviews found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Active Property Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between bg-card">
          <div>
            <h3 className="text-lg font-semibold">Active Property</h3>
            <p className="text-sm text-muted-foreground">Overview of your listed properties</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadProperties()}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Property</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length > 0 ? (
                properties.map((property) => (
                  <TableRow key={property._id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={getPrimaryImage(property.images)}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">{property.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {property.bedrooms} beds • {property.bathrooms} bath • {property.area?.builtUp || property.area?.plot || 0} {property.area?.unit}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{property.address.city}</span>
                        <span className="text-xs text-muted-foreground">{property.address.state}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {property.owner?.profile?.phone || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(property.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span>{property.views || 0} Views</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">
                        {propertyService.formatPrice(property.price, property.listingType)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(`/vendor/properties/edit/${property._id}`)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active properties found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default VendorReviews;
