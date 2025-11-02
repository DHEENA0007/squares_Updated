import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface VendorProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    avatar?: string;
    bio?: string;
    address: {
      street?: string;
      area?: string;
      city?: string;
      state?: string;
      district?: string;
      zipCode?: string;
      country?: string;
      countryCode?: string;
      stateCode?: string;
      districtCode?: string;
      cityCode?: string;
      landmark?: string;
    };
    vendorInfo: {
      licenseNumber?: string;
      gstNumber?: string;
      panNumber?: string;
      companyName?: string;
      experience: number;
      website?: string;
      specializations: string[];
      serviceAreas: string[];
      certifications: Array<{
        name: string;
        issuedBy: string;
        date: string;
        verified: boolean;
      }>;
      vendorPreferences: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        leadAlerts: boolean;
        marketingEmails: boolean;
        weeklyReports: boolean;
      };
      rating: {
        average: number;
        count: number;
      };
      responseTime: string;
      memberSince: string;
    };
  };
  statistics?: {
    totalProperties: number;
    totalFavorites: number;
    totalMessages: number;
    totalSales?: number;
    totalValue?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateVendorData {
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    address?: {
      street?: string;
      area?: string;
      city?: string;
      state?: string;
      district?: string;
      zipCode?: string;
      country?: string;
      countryCode?: string;
      stateCode?: string;
      districtCode?: string;
      cityCode?: string;
      landmark?: string;
    };
    vendorInfo?: {
      licenseNumber?: string;
      gstNumber?: string;
      panNumber?: string;
      companyName?: string;
      experience?: number;
      website?: string;
      specializations?: string[];
      serviceAreas?: string[];
      certifications?: Array<{
        name: string;
        issuedBy: string;
        date: string;
        verified: boolean;
      }>;
      vendorPreferences?: {
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        leadAlerts?: boolean;
        marketingEmails?: boolean;
        weeklyReports?: boolean;
      };
    };
  };
}

class VendorService {
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
      console.error("Vendor API request failed:", error);
      throw error;
    }
  }

  async getVendorProfile(): Promise<VendorProfile> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { user: VendorProfile };
      }>("/users/profile");

      if (response.success && response.data) {
        return response.data.user;
      }

      throw new Error("Failed to fetch vendor profile");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch vendor profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateVendorProfile(userData: UpdateVendorData): Promise<VendorProfile> {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (!user.id) {
        throw new Error("User ID not found");
      }

      const response = await this.makeRequest<{
        success: boolean;
        data: { user: VendorProfile };
      }>(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        return response.data.user;
      }

      throw new Error("Failed to update vendor profile");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update vendor profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getVendorStatistics(): Promise<{
    totalProperties: number;
    totalSales: number;
    totalValue: string;
    totalLeads: number;
    avgResponseTime: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
      }>("/vendors/statistics");

      if (response.success && response.data) {
        return response.data;
      }

      // Return default statistics if endpoint doesn't exist yet
      return {
        totalProperties: 0,
        totalSales: 0,
        totalValue: "₹0",
        totalLeads: 0,
        avgResponseTime: "Not calculated"
      };
    } catch (error) {
      console.error("Failed to fetch vendor statistics:", error);
      // Return default statistics on error
      return {
        totalProperties: 0,
        totalSales: 0,
        totalValue: "₹0",
        totalLeads: 0,
        avgResponseTime: "Not calculated"
      };
    }
  }

  async checkSubscription(subscriptionName: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { hasSubscription: boolean };
      }>(`/vendors/subscription/check/${subscriptionName}`);

      if (response.success && response.data) {
        return response.data.hasSubscription;
      }

      return false;
    } catch (error) {
      console.error("Failed to check subscription:", error);
      return false;
    }
  }

  async activateSubscription(planId: string, paymentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/vendors/subscription/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId, paymentId }),
      });

      return response;
    } catch (error) {
      console.error("Failed to activate subscription:", error);
      return {
        success: false,
        message: "Failed to activate subscription. Please try again.",
      };
    }
  }

  async getVendorSubscriptions(): Promise<Array<{
    name: string;
    isActive: boolean;
    expiresAt?: string;
  }>> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { subscriptions: Array<{
          name: string;
          isActive: boolean;
          expiresAt?: string;
        }> };
      }>("/vendors/subscriptions");

      if (response.success && response.data) {
        return response.data.subscriptions;
      }

      return [];
    } catch (error) {
      console.error("Failed to fetch vendor subscriptions:", error);
      return [];
    }
  }

  async getSubscriptionLimits(): Promise<{
    maxProperties: number;
    currentProperties: number;
    canAddMore: boolean;
    planName: string;
    features: string[];
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          maxProperties: number;
          currentProperties: number;
          canAddMore: boolean;
          planName: string;
          features: string[];
        };
      }>("/vendors/subscription-limits");

      if (response.success && response.data) {
        return response.data;
      }

      // Default limits for free users
      return {
        maxProperties: 5,
        currentProperties: 0,
        canAddMore: true,
        planName: 'Free',
        features: ['5 Property Listings']
      };
    } catch (error) {
      console.error("Failed to fetch subscription limits:", error);
      // Return free tier limits as fallback
      return {
        maxProperties: 5,
        currentProperties: 0,
        canAddMore: true,
        planName: 'Free',
        features: ['5 Property Listings']
      };
    }
  }

  async cleanupSubscriptions(): Promise<{
    success: boolean;
    activeSubscription: any;
    deactivatedCount: number;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        activeSubscription: any;
        deactivatedCount: number;
        message: string;
      }>("/vendors/subscription/cleanup", {
        method: "POST",
      });

      if (response.success) {
        toast({
          title: "Subscriptions Cleaned Up",
          description: `Deactivated ${response.deactivatedCount} old subscriptions. Using latest subscription now.`,
        });
        
        // Refresh subscription data after cleanup
        await this.refreshSubscriptionData();
        
        return {
          success: true,
          activeSubscription: response.activeSubscription,
          deactivatedCount: response.deactivatedCount
        };
      }

      return { success: false, activeSubscription: null, deactivatedCount: 0 };
    } catch (error) {
      console.error("Failed to cleanup subscriptions:", error);
      toast({
        title: "Error",
        description: "Failed to cleanup subscriptions",
        variant: "destructive",
      });
      return { success: false, activeSubscription: null, deactivatedCount: 0 };
    }
  }

  async refreshSubscriptionData(): Promise<{
    hasActiveSubscription: boolean;
    subscription: any;
    limits: any;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          hasActiveSubscription: boolean;
          subscription: any;
          limits: any;
        };
        message: string;
      }>("/vendors/subscription/refresh", {
        method: "POST",
      });

      if (response.success && response.data) {
        // Clear any cached subscription data in localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('subscription') || key.includes('limits') || key.includes('plan'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        toast({
          title: "Success",
          description: response.message || "Subscription data refreshed successfully!",
        });
        return response.data;
      }

      throw new Error("Failed to refresh subscription data");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh subscription data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const vendorService = new VendorService();
export default vendorService;