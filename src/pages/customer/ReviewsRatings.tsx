import { useState } from "react";
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
  Reply
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  property: {
    id: string;
    title: string;
    location: string;
    image: string;
  };
  date: string;
  helpful: number;
  notHelpful: number;
  replies?: Reply[];
  images?: string[];
}

interface Reply {
  id: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    isOwner: boolean;
  };
  date: string;
}

const ReviewsRatings = () => {
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isWritingReview, setIsWritingReview] = useState(false);
  
  const [newReview, setNewReview] = useState({
    propertyId: "",
    rating: 0,
    title: "",
    content: "",
    images: []
  });

  // Mock data for received reviews
  const receivedReviews: Review[] = [
    {
      id: "1",
      rating: 5,
      title: "Excellent property and great owner!",
      content: "The property was exactly as described. The owner was very responsive and helpful throughout the process. The location is perfect and the amenities are top-notch. Highly recommended!",
      author: {
        name: "Sarah Johnson",
        avatar: "",
        verified: true
      },
      property: {
        id: "prop1",
        title: "Luxury 3BHK Apartment",
        location: "Bandra West, Mumbai",
        image: ""
      },
      date: "2024-01-15",
      helpful: 12,
      notHelpful: 1,
      replies: [
        {
          id: "r1",
          content: "Thank you so much for the wonderful review! It was a pleasure working with you.",
          author: {
            name: "You",
            avatar: "",
            isOwner: true
          },
          date: "2024-01-16"
        }
      ]
    },
    {
      id: "2",
      rating: 4,
      title: "Good property, minor issues",
      content: "Overall a good experience. The property is nice but had some minor maintenance issues that were resolved quickly. The owner was cooperative.",
      author: {
        name: "Raj Patel",
        avatar: "",
        verified: false
      },
      property: {
        id: "prop2",
        title: "2BHK Apartment in Powai",
        location: "Powai, Mumbai",
        image: ""
      },
      date: "2024-01-10",
      helpful: 8,
      notHelpful: 0
    }
  ];

  // Mock data for given reviews
  const givenReviews: Review[] = [
    {
      id: "3",
      rating: 3,
      title: "Average experience",
      content: "The property was okay but not as described. Some amenities were not working properly. The owner could have been more responsive.",
      author: {
        name: "You",
        avatar: "",
        verified: true
      },
      property: {
        id: "prop3",
        title: "Studio Apartment",
        location: "Andheri East, Mumbai",
        image: ""
      },
      date: "2024-01-05",
      helpful: 5,
      notHelpful: 2
    }
  ];

  const currentReviews = activeTab === 'received' ? receivedReviews : givenReviews;
  
  const filteredReviews = currentReviews.filter(review => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.property.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = filterRating === "all" || review.rating.toString() === filterRating;
    
    return matchesSearch && matchesRating;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      case "helpful":
        return b.helpful - a.helpful;
      default: // newest
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const averageRating = receivedReviews.length > 0 
    ? receivedReviews.reduce((sum, review) => sum + review.rating, 0) / receivedReviews.length 
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: receivedReviews.filter(review => review.rating === rating).length,
    percentage: receivedReviews.length > 0 
      ? (receivedReviews.filter(review => review.rating === rating).length / receivedReviews.length) * 100 
      : 0
  }));

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

  const handleWriteReview = () => {
    // TODO: Implement review submission
    console.log("Submitting review:", newReview);
    setIsWritingReview(false);
    setNewReview({ propertyId: "", rating: 0, title: "", content: "", images: [] });
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
            <Button>
              <Edit3 className="w-4 h-4 mr-2" />
              Write Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Property</Label>
                <Select 
                  value={newReview.propertyId}
                  onValueChange={(value) => setNewReview(prev => ({ ...prev, propertyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property to review" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prop1">Luxury 3BHK Apartment - Bandra West</SelectItem>
                    <SelectItem value="prop2">Studio Apartment - Andheri East</SelectItem>
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
                  value={newReview.content}
                  onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsWritingReview(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWriteReview}>
                  Submit Review
                </Button>
              </div>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                {renderStars(Math.round(averageRating), "lg")}
                <p className="text-muted-foreground mt-2">
                  Based on {receivedReviews.length} reviews
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
            Received Reviews ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'given' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Given Reviews ({givenReviews.length})
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
        {sortedReviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reviews Found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'received' 
                    ? "You haven't received any reviews yet." 
                    : "You haven't written any reviews yet."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={review.author.avatar} />
                        <AvatarFallback>
                          {review.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{review.author.name}</h4>
                          {review.author.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {renderStars(review.rating)}
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(review.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Property Info */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{review.property.title}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{review.property.location}</span>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">{review.title}</h3>
                    <p className="text-muted-foreground">{review.content}</p>
                  </div>

                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="w-4 h-4" />
                        Helpful ({review.helpful})
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ThumbsDown className="w-4 h-4" />
                        Not Helpful ({review.notHelpful})
                      </button>
                    </div>
                    
                    {activeTab === 'received' && (
                      <Button variant="ghost" size="sm">
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    )}
                    
                    {activeTab === 'given' && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Replies */}
                  {review.replies && review.replies.length > 0 && (
                    <div className="space-y-3 pl-12 border-l-2 border-muted">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={reply.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {reply.author.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{reply.author.name}</span>
                            {reply.author.isOwner && (
                              <Badge variant="secondary" className="text-xs">
                                Owner
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-8">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsRatings;