import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Review {
  _id: string;
  vendorId: string;
  propertyId?: string;
  serviceId?: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  reviewType: 'property' | 'service' | 'general';
  isVerified: boolean;
  isPublic: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  vendorResponse?: {
    message: string;
    respondedAt: string;
  };
  tags: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentReviews: number;
  responseRate: number;
  averageResponseTime: number;
  verifiedReviews: number;
  publicReviews: number;
  helpfulVotes: number;
  pendingReplies: number;
  commonKeywords: string[];
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  reviewType?: 'property' | 'service' | 'general' | 'all';
  isVerified?: boolean;
  isPublic?: boolean;
  hasResponse?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewResponse {
  reviewId: string;
  message: string;
}

export interface ReviewAnalytics {
  monthlyReviews: Array<{
    month: string;
    reviews: number;
    averageRating: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  competitorComparison: {
    vendorRating: number;
    industryAverage: number;
    competitorRatings: Array<{
      name: string;
      rating: number;
    }>;
  };
  improvementAreas: Array<{
    area: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

class ReviewsService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add auth token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("Reviews API request failed:", error);
      throw error;
    }
  }

  async getReviews(filters: ReviewFilters = {}): Promise<{
    reviews: Review[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/vendors/reviews${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          reviews: Review[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        reviews: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      return {
        reviews: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  async getReviewStats(): Promise<ReviewStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ReviewStats;
      }>("/vendors/reviews/stats");

      if (response.success && response.data) {
        return response.data;
      }

      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentReviews: 0,
        responseRate: 0,
        averageResponseTime: 0,
        verifiedReviews: 0,
        publicReviews: 0,
        helpfulVotes: 0,
        pendingReplies: 0,
        commonKeywords: [],
      };
    } catch (error) {
      console.error("Failed to fetch review stats:", error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentReviews: 0,
        responseRate: 0,
        averageResponseTime: 0,
        verifiedReviews: 0,
        publicReviews: 0,
        helpfulVotes: 0,
        pendingReplies: 0,
        commonKeywords: [],
      };
    }
  }

  async getReviewAnalytics(): Promise<ReviewAnalytics> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ReviewAnalytics;
      }>("/vendors/reviews/analytics");

      if (response.success && response.data) {
        return response.data;
      }

      return {
        monthlyReviews: [],
        topKeywords: [],
        competitorComparison: {
          vendorRating: 0,
          industryAverage: 0,
          competitorRatings: [],
        },
        improvementAreas: [],
      };
    } catch (error) {
      console.error("Failed to fetch review analytics:", error);
      return {
        monthlyReviews: [],
        topKeywords: [],
        competitorComparison: {
          vendorRating: 0,
          industryAverage: 0,
          competitorRatings: [],
        },
        improvementAreas: [],
      };
    }
  }

  async respondToReview(reviewResponse: ReviewResponse): Promise<Review | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Review;
        message: string;
      }>(`/vendors/reviews/${reviewResponse.reviewId}/respond`, {
        method: "POST",
        body: JSON.stringify({ message: reviewResponse.message }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Response posted successfully!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to post response");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to post response";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  async updateReviewVisibility(reviewId: string, isPublic: boolean): Promise<Review | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Review;
        message: string;
      }>(`/vendors/reviews/${reviewId}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ isPublic }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Review visibility updated!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to update review visibility");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update review visibility";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  async reportReview(reviewId: string, reason: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/vendors/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Review reported successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to report review");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to report review";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  async markReviewHelpful(reviewId: string, isHelpful: boolean): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/vendors/reviews/${reviewId}/helpful`, {
        method: "POST",
        body: JSON.stringify({ isHelpful }),
      });

      if (response.success) {
        return true;
      }

      throw new Error(response.message || "Failed to mark review as helpful");
    } catch (error) {
      console.error("Failed to mark review as helpful:", error);
      return false;
    }
  }

  // Utility methods
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  }

  getReviewTypeLabel(type: Review['reviewType']): string {
    const labels = {
      property: 'Property Review',
      service: 'Service Review',
      general: 'General Review',
    };
    return labels[type] || type;
  }

  getReviewTypeColor(type: Review['reviewType']): string {
    const colors = {
      property: 'bg-blue-100 text-blue-800',
      service: 'bg-green-100 text-green-800',
      general: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }

  getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
    const colors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
    };
    return colors[sentiment] || 'text-gray-600';
  }

  getImpactColor(impact: 'high' | 'medium' | 'low'): string {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[impact] || 'bg-gray-100 text-gray-800';
  }

  calculateResponseRate(totalReviews: number, respondedReviews: number): number {
    if (totalReviews === 0) return 0;
    return Math.round((respondedReviews / totalReviews) * 100);
  }

  getRatingPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}

export const reviewsService = new ReviewsService();
export default reviewsService;