import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Search,
  Filter,
  Reply,
  Loader2,
  Eye,
  EyeOff,
  Flag,
  CheckCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { reviewsService, Review, ReviewStats, ReviewFilters } from "@/services/reviewsService";
import { useToast } from "@/hooks/use-toast";

const VendorReviews = () => {
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // State for real data
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const filters: ReviewFilters = {
    page: currentPage,
    limit: 10,
    reviewType: (selectedFilter !== 'all' && ['property', 'service', 'general'].includes(selectedFilter)) 
      ? selectedFilter as 'property' | 'service' | 'general' 
      : undefined,
    rating: ['1', '2', '3', '4', '5'].includes(selectedFilter) ? parseInt(selectedFilter) : undefined,
    hasResponse: selectedFilter === 'no-reply' ? false : undefined,
    search: searchQuery || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  const loadReviewsData = async () => {
    try {
      setLoading(true);
      const [reviewsData, statsData] = await Promise.all([
        reviewsService.getReviews(filters),
        reviewsService.getReviewStats()
      ]);
      
      setReviews(reviewsData.reviews);
      setTotalPages(reviewsData.totalPages);
      setReviewStats(statsData);
    } catch (error) {
      console.error("Failed to load reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewsData();
  }, [currentPage, selectedFilter, searchQuery]);

  const handleReplyToReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    
    try {
      setActionLoading(reviewId);
      const updatedReview = await reviewsService.respondToReview({
        reviewId,
        message: replyText
      });
      
      if (updatedReview) {
        setReviews(reviews.map(review => 
          review._id === reviewId ? updatedReview : review
        ));
        setReplyText("");
        setShowReplyForm(null);
      }
    } catch (error) {
      console.error("Failed to reply to review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    try {
      setActionLoading(reviewId);
      const updatedReview = await reviewsService.updateReviewVisibility(reviewId, !currentVisibility);
      
      if (updatedReview) {
        setReviews(reviews.map(review => 
          review._id === reviewId ? updatedReview : review
        ));
      }
    } catch (error) {
      console.error("Failed to update review visibility:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportReview = async (reviewId: string) => {
    const reason = prompt("Please provide a reason for reporting this review:");
    if (!reason) return;
    
    try {
      setActionLoading(reviewId);
      await reviewsService.reportReview(reviewId, reason);
    } catch (error) {
      console.error("Failed to report review:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading reviews...</span>
        </div>
      </div>
    );
  }

  // Filter reviews based on search and selected filter
  const filteredReviews = reviews; // API already filters based on our filters object

  const renderStars = (rating: number, size: "sm" | "md" = "md") => {
    const starSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    
    handleReplyToReview(reviewId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews & Ratings</h1>
          <p className="text-muted-foreground">Manage customer feedback and maintain your reputation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Rating Insights
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {reviewStats ? reviewsService.formatRating(reviewStats.averageRating) : '0.0'}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(reviewStats?.averageRating || 0))}
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center justify-center mt-2">
              {reviewStats?.recentReviews ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-muted-foreground">Based on {reviewStats.recentReviews} recent reviews</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No recent activity</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{reviewStats?.totalReviews || 0}</div>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <div className="mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                <Award className="w-3 h-3 mr-1" />
                Top Rated
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{reviewStats?.responseRate || 0}%</div>
            <p className="text-sm text-muted-foreground">Response Rate</p>
            <p className="text-xs text-green-600 mt-2">Excellent response rate!</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm w-8">{rating}★</span>
                  <Progress 
                    value={reviewStats ? (reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution] / Math.max(reviewStats.totalReviews, 1)) * 100 : 0} 
                    className="flex-1 h-2" 
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {reviewStats?.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution] || 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-reviews" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all-reviews">All Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending-replies">Pending Replies ({reviewStats?.pendingReplies || 0})</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="all-reviews" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFilter} onValueChange={(value: string) => setSelectedFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="property">Property Reviews</SelectItem>
                <SelectItem value="service">Service Reviews</SelectItem>
                <SelectItem value="general">General Reviews</SelectItem>
                <SelectItem value="no-reply">No Reply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews List */}
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <Card key={review._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.clientAvatar} />
                      <AvatarFallback>{review.clientName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{review.clientName}</h4>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating, "sm")}
                            {review.isVerified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <Badge className={reviewsService.getReviewTypeColor(review.reviewType)}>
                              {reviewsService.getReviewTypeLabel(review.reviewType)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{reviewsService.formatDate(review.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{reviewsService.getRelativeTime(review.createdAt)}</p>
                        </div>
                      </div>
                      
                      <h5 className="font-medium mb-2">{review.title}</h5>
                      <p className="text-sm mb-3">{review.comment}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Review Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{review.helpfulCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <span className="text-sm">{review.unhelpfulCount}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleVisibility(review._id, review.isPublic)}
                              disabled={actionLoading === review._id}
                            >
                              {review.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportReview(review._id)}
                              disabled={actionLoading === review._id}
                            >
                              <Flag className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {!review.vendorResponse && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowReplyForm(review._id)}
                            disabled={actionLoading === review._id}
                          >
                            {actionLoading === review._id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Reply className="w-4 h-4 mr-2" />
                            )}
                            Reply
                          </Button>
                        )}
                      </div>
                      
                      {/* Reply Form */}
                      {showReplyForm === review._id && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <Textarea
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="mb-3"
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setShowReplyForm(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleReply(review._id)}
                              disabled={!replyText.trim() || actionLoading === review._id}
                            >
                              {actionLoading === review._id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : null}
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Existing Reply */}
                      {review.vendorResponse && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Your Reply</span>
                            <span className="text-xs text-blue-600">{reviewsService.formatDate(review.vendorResponse.respondedAt)}</span>
                          </div>
                          <p className="text-sm text-blue-800">{review.vendorResponse.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedFilter !== "all" 
                    ? "No reviews match your search criteria" 
                    : "Customer reviews will appear here"
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending-replies" className="space-y-6">
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pending Replies</h3>
              <p className="text-muted-foreground mb-4">
                Reviews that need your response will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Mentioned Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewStats?.commonKeywords && reviewStats.commonKeywords.length > 0 ? (
                    reviewStats.commonKeywords.map((keyword, index) => (
                      <div key={keyword} className="flex justify-between items-center">
                        <span className="text-sm">{keyword}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={Math.max(20, 100 - (index * 15))} className="w-20 h-2" />
                          <span className="text-xs text-muted-foreground">{Math.max(1, 25 - (index * 3))}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No keyword data available yet. Keywords will appear as you receive more reviews.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviewStats?.totalReviews && reviewStats.totalReviews > 0 ? (
                    <>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-800">Current Rating</p>
                          <p className="text-sm text-green-600">
                            {reviewStats.averageRating.toFixed(1)} stars from {reviewStats.totalReviews} reviews
                          </p>
                        </div>
                        <Star className="w-8 h-8 text-green-600" />
                      </div>
                      {reviewStats.recentReviews > 0 && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-blue-800">Recent Activity</p>
                            <p className="text-sm text-blue-600">
                              {reviewStats.recentReviews} new reviews this month
                            </p>
                          </div>
                          <MessageSquare className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No reviews yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trends will appear once you start receiving reviews
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorReviews;