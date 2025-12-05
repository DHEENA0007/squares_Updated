import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface CustomerReview {
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
  reviewType: 'property' | 'service' | 'vendor';
  isVerified: boolean;
  isPublic: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  userHelpfulVote?: 'helpful' | 'unhelpful' | null;
  vendorResponse?: {
    message: string;
    respondedAt: string;
    vendorName: string;
  };
  tags: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
  
  // Property/Service/Vendor details
  property?: {
    _id: string;
    title: string;
    location: string;
    image?: string;
  };
  service?: {
    _id: string;
    name: string;
    category: string;
  };
  vendor?: {
    _id: string;
    name: string;
    businessName: string;
    avatar?: string;
  };
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
}

export interface CustomerReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  reviewType?: 'property' | 'service' | 'vendor' | 'all';
  isVerified?: boolean;
  isPublic?: boolean;
  hasResponse?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount';
  sortOrder?: 'asc' | 'desc';
  vendorId?: string;
  propertyId?: string;
  serviceId?: string;
}

export interface NewReview {
  vendorId?: string;
  propertyId?: string;
  serviceId?: string;
  rating: number;
  title: string;
  comment: string;
  reviewType: 'property' | 'service' | 'vendor';
  isPublic?: boolean;
  tags?: string[];
  images?: string[];
}

export interface ReviewUpdate {
  rating?: number;
  title?: string;
  comment?: string;
  isPublic?: boolean;
  tags?: string[];
  images?: string[];
}

class CustomerReviewsService {
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
      console.error("Customer Reviews API request failed:", error);
      throw error;
    }
  }

  // Get reviews written by the current customer
  async getMyReviews(filters: CustomerReviewFilters = {}): Promise<{
    reviews: CustomerReview[];
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

      const endpoint = `/customer/reviews/given${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          reviews: CustomerReview[];
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
      console.error("Failed to fetch my reviews:", error);
      return {
        reviews: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  // Get reviews received by the current customer (as a property owner/vendor)
  async getReceivedReviews(filters: CustomerReviewFilters = {}): Promise<{
    reviews: CustomerReview[];
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

      const endpoint = `/customer/reviews/received${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          reviews: CustomerReview[];
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
      console.error("Failed to fetch received reviews:", error);
      return {
        reviews: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  // Get review statistics for the current customer
  async getMyReviewStats(): Promise<ReviewStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: ReviewStats;
      }>("/customer/reviews/my-stats");

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
      };
    } catch (error) {
      console.error("Failed to fetch my review stats:", error);
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
      };
    }
  }

  // Create a new review
  async createReview(reviewData: NewReview): Promise<CustomerReview | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: CustomerReview;
        message: string;
      }>("/customer/reviews", {
        method: "POST",
        body: JSON.stringify(reviewData),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Review submitted successfully!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to submit review");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit review";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  // Update an existing review
  async updateReview(reviewId: string, updateData: ReviewUpdate): Promise<CustomerReview | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: CustomerReview;
        message: string;
      }>(`/customer/reviews/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Review updated successfully!",
        });
        return response.data;
      }

      throw new Error(response.message || "Failed to update review");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update review";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  // Delete a review
  async deleteReview(reviewId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/customer/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Review deleted successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to delete review");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete review";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  // Mark a review as helpful/unhelpful
  async markReviewHelpful(reviewId: string, isHelpful: boolean): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/customer/reviews/${reviewId}/helpful`, {
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

  // Reply to a review (for received reviews)
  async replyToReview(reviewId: string, message: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
        data: CustomerReview;
      }>(`/customer/reviews/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Reply posted successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to post reply");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to post reply";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  // Report a review
  async reportReview(reviewId: string, reason: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/customer/reviews/${reviewId}/report`, {
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

  // Get available properties/services for review (only items customer has purchased/used)
  async getReviewableItems(): Promise<{
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
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
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
        };
      }>("/customer/reviews/reviewable-items");

      if (response.success && response.data) {
        return response.data;
      }

      return {
        properties: [],
        services: [],
        vendors: [],
      };
    } catch (error) {
      console.error("Failed to fetch reviewable items:", error);
      return {
        properties: [],
        services: [],
        vendors: [],
      };
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

  getReviewTypeLabel(type: CustomerReview['reviewType']): string {
    const labels = {
      property: 'Property Review',
      service: 'Service Review',
      vendor: 'Vendor Review',
    };
    return labels[type] || type;
  }

  getReviewTypeColor(type: CustomerReview['reviewType']): string {
    const colors = {
      property: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      service: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      vendor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  getRatingPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}

export const customerReviewsService = new CustomerReviewsService();
export default customerReviewsService;
