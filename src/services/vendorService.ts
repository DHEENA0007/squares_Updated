import { toast } from "@/hooks/use-toast";
import { reviewsService } from "./reviewsService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.buildhomemartsquares.com/api";

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
    preferences?: {
      language: string;
      notifications: {
        email: boolean;
        push: boolean;
        newMessages: boolean;
        newsUpdates: boolean;
        marketing: boolean;
      };
      privacy?: {
        showEmail: boolean;
        showPhone: boolean;
        allowMessages: boolean;
      };
    };
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
      businessType?: string;
      experience: number;
      website?: string;
      // specializations: string[];
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
        autoResponseEnabled?: boolean;
        autoResponseMessage?: string;
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
    preferences?: {
      language?: string;
      notifications?: {
        email?: boolean;
        push?: boolean;
        newMessages?: boolean;
        newsUpdates?: boolean;
        marketing?: boolean;
      };
      privacy?: {
        showEmail?: boolean;
        showPhone?: boolean;
        allowMessages?: boolean;
      };
    };
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
      // specializations?: string[];
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

  // Helper function to recursively remove undefined values from objects
  private cleanObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item)).filter(item => item !== undefined);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = this.cleanObject(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  async getVendorProfile(): Promise<VendorProfile> {
    try {
      // Try to get vendor profile first (which includes User + Vendor data combined)
      let response;
      try {
        response = await this.makeRequest<{
          success: boolean;
          data: { user: VendorProfile };
        }>("/vendors/profile");
      } catch (vendorError) {
        // Fallback to user profile if vendor profile endpoint fails
        response = await this.makeRequest<{
          success: boolean;
          data: { user: VendorProfile };
        }>("/users/profile");
      }

      if (response.success && response.data) {
        const vendorProfile = response.data.user;
        
        // Sync rating data from reviews if available
        try {
          const reviewStats = await reviewsService.getReviewStats();
          if (vendorProfile.profile?.vendorInfo?.rating) {
            vendorProfile.profile.vendorInfo.rating.average = reviewStats.averageRating;
            vendorProfile.profile.vendorInfo.rating.count = reviewStats.totalReviews;
          } else if (vendorProfile.profile?.vendorInfo) {
            vendorProfile.profile.vendorInfo.rating = {
              average: reviewStats.averageRating,
              count: reviewStats.totalReviews
            };
          }
        } catch (reviewError) {
          console.log("Could not sync rating data:", reviewError);
        }
        
        return vendorProfile;
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
      console.log("Starting vendor profile update with data:", userData);
      
      // Get user data from localStorage or token
      let userId = null;
      
      // Try to get user ID from stored user object
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          userId = user.id || user._id;
          console.log("Found user ID from localStorage:", userId);
        } catch (parseError) {
          console.error("Error parsing stored user:", parseError);
        }
      }

      // If no user ID found in localStorage, try to get from token
      if (!userId) {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // Decode JWT to get user ID (basic decode, don't verify signature for client-side)
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId || payload.id;
            console.log("Found user ID from token:", userId);
          } catch (tokenError) {
            console.error("Error decoding token:", tokenError);
          }
        }
      }

      // If still no user ID, fetch current user from API
      if (!userId) {
        console.log("No user ID found, fetching from API...");
        try {
          const currentUserResponse = await this.makeRequest<{
            success: boolean;
            data: { user: { id: string; _id: string } };
          }>("/auth/me");
          
          if (currentUserResponse.success && currentUserResponse.data) {
            userId = currentUserResponse.data.user.id || currentUserResponse.data.user._id;
            console.log("Found user ID from API:", userId);
            // Update localStorage with current user data
            localStorage.setItem("user", JSON.stringify(currentUserResponse.data.user));
          }
        } catch (fetchError) {
          console.error("Error fetching current user:", fetchError);
        }
      }

      if (!userId) {
        throw new Error("Unable to determine user ID. Please log in again.");
      }

      // Clean the data to remove undefined values before sending
      const cleanedData = this.cleanObject(userData);
      console.log("Cleaned data for update:", cleanedData);

      // Try vendor profile update first, fallback to user profile update
      let response;
      try {
        console.log("Attempting vendor profile update via /vendors/profile");
        response = await this.makeRequest<{
          success: boolean;
          data: { user: VendorProfile };
        }>("/vendors/profile", {
          method: "PUT",
          body: JSON.stringify(cleanedData),
        });
        console.log("Vendor profile update successful:", response);
      } catch (vendorUpdateError) {
        console.log("Vendor profile update failed, trying user profile update:", vendorUpdateError);
        response = await this.makeRequest<{
          success: boolean;
          data: { user: VendorProfile };
        }>(`/users/${userId}`, {
          method: "PUT",
          body: JSON.stringify(cleanedData),
        });
        console.log("User profile update result:", response);
      }

      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem("user", JSON.stringify(response.data.user));
        console.log("Profile update successful, updated localStorage");
        
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        return response.data.user;
      }

      throw new Error("Failed to update vendor profile");
    } catch (error) {
      console.error("Vendor profile update error:", error);
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

  async updateVendorSettings(settingsData: any): Promise<any> {
    try {
      // Clean the data to remove undefined values before sending
      const cleanedData = this.cleanObject(settingsData);

      const response = await this.makeRequest<{
        success: boolean;
        data: any;
      }>("/vendors/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...cleanedData,
          meta: {
            lastUpdated: new Date().toISOString(),
            version: "2.0",
            source: "dynamic-vendor-settings",
            supportEmail: "support@buildhomemartsquares.com"
          }
        }),
      });

      if (response.success) {
        // Update localStorage with synced data
        localStorage.setItem('dynamicVendorSettings', JSON.stringify(response.data));
        
        toast({
          title: "✅ Settings Synced",
          description: "All vendor preferences saved successfully.",
        });
        return response.data;
      }

      throw new Error("Failed to update vendor settings");
    } catch (error) {
      // Enhanced offline support with validation
      const settingsKey = 'dynamicVendorSettings';
      const offlineData = {
        ...settingsData,
        meta: {
          lastUpdated: new Date().toISOString(),
          version: "2.0",
          source: "dynamic-vendor-settings-offline",
          pendingSync: true,
          supportEmail: "support@buildhomemartsquares.com"
        }
      };
      
      localStorage.setItem(settingsKey, JSON.stringify(offlineData));
      
      toast({
        title: "💾 Settings Saved Offline",
        description: "Settings cached locally. Will sync when online.",
      });
      
      return offlineData;
    }
  }

  async getVendorSettings(): Promise<any> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
      }>("/vendors/settings");

      if (response.success && response.data) {
        return response.data;
      }

      // Fallback to localStorage
      const savedSettings = localStorage.getItem('dynamicVendorSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }

      return null;
    } catch (error) {
      // Return localStorage data on error
      const savedSettings = localStorage.getItem('dynamicVendorSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
      
      console.error("Failed to fetch vendor settings:", error);
      return null;
    }
  }

  async sendVendorSettingsNotification(settingsType: string, message: string, additionalData?: any): Promise<void> {
    try {
      // Create in-app notification instead of email
      const notificationData = {
        title: "Settings Updated",
        message: `${settingsType}: ${message}`,
        type: "system",
        timestamp: new Date().toISOString(),
        data: additionalData || {}
      };

      // Log for debugging
      console.log(`✅ In-app notification created: ${settingsType}`);
      
      // In-app notification will be handled by the notification service/backend
      // No email sent for settings updates
    } catch (error) {
      console.log("� In-app notification logged");
      console.log(`Settings Update: ${settingsType} - ${message}`);
    }
  }

  async updateVendorPreferences(preferenceKey: string, value: any): Promise<void> {
    try {
      // Get current settings
      const currentSettings = await this.getVendorSettings() || {};
      
      // Update specific preference
      const updatedSettings = {
        ...currentSettings,
        preferences: {
          ...currentSettings.preferences,
          [preferenceKey]: value
        },
        meta: {
          lastUpdated: new Date().toISOString(),
          lastChangedField: preferenceKey,
          source: "real-time-update"
        }
      };

      // Save updated settings
      await this.updateVendorSettings(updatedSettings);
      
      // Send real-time notification email
      const settingName = preferenceKey.replace(/([A-Z])/g, ' $1').toLowerCase();
      const statusText = typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : 'updated';
      
      // In-app notification only - no email
      console.log(`Vendor preference "${settingName}" has been ${statusText}`);
      
    } catch (error) {
      console.error("Failed to update vendor preference:", error);
      toast({
        title: "Update Failed",
        description: "Preference will sync when connection is restored.",
        variant: "destructive"
      });
    }
  }

  async validateVendorSubscription(): Promise<{
    isActive: boolean;
    planName: string;
    features: string[];
    limits: any;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          isActive: boolean;
          planName: string;
          features: string[];
          limits: any;
        };
      }>("/vendors/subscription/validate");

      if (response.success && response.data) {
        return response.data;
      }

      // Default free plan
      return {
        isActive: false,
        planName: "Free",
        features: ["5 Property Listings", "Basic Support"],
        limits: { maxProperties: 5, maxPhotos: 10 }
      };
    } catch (error) {
      console.error("Failed to validate subscription:", error);
      return {
        isActive: false,
        planName: "Free",
        features: ["5 Property Listings", "Basic Support"],
        limits: { maxProperties: 5, maxPhotos: 10 }
      };
    }
  }

  async getAutoResponseSettings(): Promise<{
    enabled: boolean;
    message: string;
  }> {
    try {
      const settings = await this.getVendorSettings();
      return {
        enabled: settings?.business?.autoResponseEnabled || false,
        message: settings?.business?.autoResponseMessage || "Thank you for your interest! I'll get back to you soon."
      };
    } catch (error) {
      console.error("Failed to get auto-response settings:", error);
      return {
        enabled: false,
        message: "Thank you for your interest! I'll get back to you soon."
      };
    }
  }

  async updateAutoResponseSettings(enabled: boolean, message: string): Promise<void> {
    try {
      await this.updateVendorPreferences('business.autoResponseEnabled', enabled);
      if (message.trim()) {
        await this.updateVendorPreferences('business.autoResponseMessage', message);
      }
      
      toast({
        title: "Auto-Response Updated",
        description: enabled ? "Auto-responses are now enabled" : "Auto-responses have been disabled",
      });
    } catch (error) {
      console.error("Failed to update auto-response settings:", error);
      throw error;
    }
  }

  async isVendorEnterpriseProperty(vendorId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { isEnterprise: boolean };
      }>(`/vendors/${vendorId}/enterprise-check`);

      if (response.success && response.data) {
        return response.data.isEnterprise;
      }

      return false;
    } catch (error) {
      console.error("Failed to check vendor enterprise status:", error);
      return false;
    }
  }
}

export const vendorService = new VendorService();
export default vendorService;