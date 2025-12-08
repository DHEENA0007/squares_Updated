import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, MessageCircle, ThumbsUp, AlertTriangle, Search, Filter, Trash2, Flag, Reply } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsService } from "@/services/reviewsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";

interface Review {
    id: string;
    user: { name: string; email: string } | null;
    property: { name: string } | null;
    vendor: { name: string } | null;
    rating: number;
    title: string;
    comment: string;
    isApproved: boolean;
    isFlagged: boolean;
    createdAt: string;
    helpfulVotes: number;
    unhelpfulVotes: number;
    vendorResponse?: {
        message: string;
        respondedAt: string;
        respondedBy?: string;
        respondedByRole?: string;
    };
}

interface ReviewStats {
    total: number;
    approved: number;
    pending: number;
    flagged: number;
    avgRating: number;
}

const RoleBasedReviews = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats>({
        total: 0,
        approved: 0,
        pending: 0,
        flagged: 0,
        avgRating: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    const hasPermission = (permission: string) => permissions.includes(permission);

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.REVIEWS_VIEW)) {
            navigate('/rolebased');
        }
    }, [permissions]);

    useEffect(() => {
        fetchStats();
        fetchReviews();
    }, [searchTerm, statusFilter, ratingFilter, currentPage]);

    const fetchStats = async () => {
        try {
            const data = await reviewsService.getAdminReviewStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch review stats:", error);
        }
    };

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: 10,
            };

            if (searchTerm) params.search = searchTerm;
            if (statusFilter !== "all") params.status = statusFilter;
            if (ratingFilter !== "all") params.rating = parseInt(ratingFilter);

            const data = await reviewsService.getAdminReviews(params);
            setReviews(data.reviews || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
            toast({
                title: "Error",
                description: "Failed to fetch reviews",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (reviewId: string) => {
        if (!hasPermission(PERMISSIONS.REVIEWS_RESPOND)) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to reply to reviews",
                variant: "destructive",
            });
            return;
        }

        setSelectedReviewId(reviewId);
        setReplyDialogOpen(true);
    };

    const handleSubmitReply = async () => {
        if (!replyText.trim()) {
            toast({
                title: "Error",
                description: "Please enter a reply message",
                variant: "destructive",
            });
            return;
        }

        if (!selectedReviewId) return;

        try {
            await reviewsService.replyToReview(selectedReviewId, replyText);
            toast({
                title: "Success",
                description: "Reply posted successfully",
            });
            setReplyDialogOpen(false);
            setReplyText("");
            setSelectedReviewId(null);
            fetchReviews();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to post reply",
                variant: "destructive",
            });
        }
    };

    const handleReject = async (reviewId: string) => {
        // Removed - reviews are auto-published, no reject needed
    };

    const handleFlag = async (reviewId: string) => {
        if (!hasPermission(PERMISSIONS.REVIEWS_REPORT)) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to flag reviews",
                variant: "destructive",
            });
            return;
        }

        try {
            await reviewsService.flagReview(reviewId);
            toast({
                title: "Success",
                description: "Review flagged successfully",
            });
            fetchReviews();
            fetchStats();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to flag review",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!hasPermission(PERMISSIONS.REVIEWS_DELETE)) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to delete reviews",
                variant: "destructive",
            });
            return;
        }

        if (!confirm("Are you sure you want to delete this review?")) return;

        try {
            await reviewsService.deleteReview(reviewId);
            toast({
                title: "Success",
                description: "Review deleted successfully",
            });
            fetchReviews();
            fetchStats();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete review",
                variant: "destructive",
            });
        }
    };

    if (!hasPermission(PERMISSIONS.REVIEWS_VIEW)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Review Management</h1>
                <p className="text-muted-foreground">
                    Manage property reviews and ratings
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All published reviews</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.avgRating.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">Out of 5 stars</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.flagged}</div>
                        <p className="text-xs text-muted-foreground">Inappropriate reviews</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Reviews</CardTitle>
                            <CardDescription>Moderate and manage property reviews</CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search reviews..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reviews</SelectItem>
                                <SelectItem value="flagged">Flagged Only</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger className="w-[180px]">
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
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Loading reviews...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12">
                            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No Reviews Found</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                No reviews match your current filters
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="p-4 border rounded-lg space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`h-4 w-4 ${
                                                                i < review.rating
                                                                    ? "fill-yellow-400 text-yellow-400"
                                                                    : "text-gray-300"
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Published
                                                </Badge>
                                                {review.isFlagged && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                        Flagged
                                                    </Badge>
                                                )}
                                            </div>
                                            <h4 className="font-semibold">{review.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {review.comment}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                                <span>By: {review.user?.name || "Unknown"}</span>
                                                {review.property && <span>Property: {review.property.name}</span>}
                                                {review.vendor && <span>Vendor: {review.vendor.name}</span>}
                                                <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {/* Vendor Response */}
                                            {review.vendorResponse && (
                                                <div className="mt-4 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <MessageCircle className="h-3 w-3 text-blue-600" />
                                                        <span className="text-xs font-semibold text-blue-700">
                                                            {review.vendorResponse.respondedBy || 'Admin'} 
                                                            {review.vendorResponse.respondedByRole && (
                                                                <span className="text-blue-600"> ({review.vendorResponse.respondedByRole})</span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(review.vendorResponse.respondedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{review.vendorResponse.message}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {hasPermission(PERMISSIONS.REVIEWS_RESPOND) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleApprove(review.id)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title="Reply to review"
                                                >
                                                    <Reply className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission(PERMISSIONS.REVIEWS_REPORT) && !review.isFlagged && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleFlag(review.id)}
                                                    className="text-orange-600 hover:text-orange-700"
                                                    title="Flag as inappropriate"
                                                >
                                                    <Flag className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission(PERMISSIONS.REVIEWS_DELETE) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(review.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                    title="Delete review"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && reviews.length > 0 && totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reply Dialog */}
            <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reply to Review</DialogTitle>
                        <DialogDescription>
                            Write a response to this customer review
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Enter your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setReplyDialogOpen(false);
                            setReplyText("");
                            setSelectedReviewId(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitReply}>
                            Post Reply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoleBasedReviews;
