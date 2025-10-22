import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
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
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
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
}

export const vendorService = new VendorService();
export default vendorService;