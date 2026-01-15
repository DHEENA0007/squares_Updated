import { useState, useEffect } from 'react';
import { Star, Flag, Trash2, Eye, Search, Filter, MessageSquare, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';

interface Review {
  _id: string;
  property: {
    _id: string;
    title: string;
  };
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
  rating: number;
  comment: string;
  isReported: boolean;
  reportReason?: string;
  reportedBy?: string;
  reportedAt?: string;
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
  status: 'active' | 'reported' | 'hidden';
}

interface ReviewStats {
  total: number;
  active: number;
  reported: number;
  averageRating: number;
}

const Reviews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    active: 0,
    reported: 0,
    averageRating: 0
  });
  
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [reportReason, setReportReason] = useState('');
  const [responseText, setResponseText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    rating: 'all'
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [reviewsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/reviews`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/admin/reviews/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (reviewsResponse.ok) {
        const data = await reviewsResponse.json();
        setReviews(data.data.reviews || []);
      }

      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportReview = async () => {
    if (!selectedReview || !reportReason.trim()) {
      toast({
        title: "Error",
        description: "Report reason is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/admin/reviews/${selectedReview._id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reportReason })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Review reported successfully",
        });
        setShowReportDialog(false);
        setReportReason('');
        fetchReviews();
      } else {
        throw new Error('Failed to report review');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to report review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondToReview = async () => {
    if (!selectedReview || !responseText.trim()) {
      toast({
        title: "Error",
        description: "Response text is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/admin/reviews/${selectedReview._id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responseText })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Response posted successfully",
        });
        setShowRespondDialog(false);
        setResponseText('');
        fetchReviews();
      } else {
        throw new Error('Failed to respond to review');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/admin/reviews/${selectedReview._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Review deleted successfully",
        });
        setShowDeleteDialog(false);
        fetchReviews();
      } else {
        throw new Error('Failed to delete review');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusBadge = (review: Review) => {
    if (review.isReported || review.status === 'reported') {
      return <Badge variant="destructive">Reported</Badge>;
    }
    if (review.status === 'hidden') {
      return <Badge variant="secondary">Hidden</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.comment.toLowerCase().includes(filters.search.toLowerCase()) ||
      review.property.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      `${review.user.profile.firstName} ${review.user.profile.lastName}`.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = 
      filters.status === 'all' ||
      (filters.status === 'reported' && review.isReported) ||
      (filters.status === 'active' && !review.isReported && review.status === 'active');

    const matchesRating = 
      filters.rating === 'all' ||
      review.rating.toString() === filters.rating;

    return matchesSearch && matchesStatus && matchesRating;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Review Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Monitor and manage property reviews
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reviews</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reported Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.reported}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.rating} onValueChange={(value) => setFilters({ ...filters, rating: value })}>
              <SelectTrigger>
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

            <Button variant="outline" onClick={fetchReviews}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews ({filteredReviews.length})</CardTitle>
          <CardDescription>Manage and moderate property reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Reviews Found</p>
              <p className="text-sm text-muted-foreground mt-2">
                No reviews match your current filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div key={review._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {review.user.profile.firstName} {review.user.profile.lastName}
                        </h3>
                        {getStatusBadge(review)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Property: {review.property.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStarRating(review.rating)}
                    </div>
                  </div>

                  <p className="text-sm mb-3">{review.comment}</p>

                  {review.response && (
                    <div className="bg-muted p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium mb-1">Admin Response:</p>
                      <p className="text-sm">{review.response.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By {review.response.respondedBy} • {new Date(review.response.respondedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {review.isReported && review.reportReason && (
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium text-red-600 mb-1">Reported:</p>
                      <p className="text-sm text-red-600">{review.reportReason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>

                    {!review.response && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowRespondDialog(true);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Respond
                      </Button>
                    )}

                    {!review.isReported && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowReportDialog(true);
                        }}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this review
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reportReason">Report Reason *</Label>
              <Textarea
                id="reportReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Enter reason for reporting..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportReview} disabled={actionLoading || !reportReason.trim()}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Write your response to this review
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="responseText">Response *</Label>
              <Textarea
                id="responseText"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter your response..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespondDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRespondToReview} disabled={actionLoading || !responseText.trim()}>
              Post Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReview} disabled={actionLoading}>
              Delete Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reviews;
