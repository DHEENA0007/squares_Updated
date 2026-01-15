const API_BASE_URL = import.meta.env.VITE_API_URL || "https://app.buildhomemartsquares.com/api";

export interface FeaturedVendor {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  companyName?: string;
  specialization: string[];
  location: {
    city?: string;
    state?: string;
  };
  badges: {
    topRated: boolean;
    verifiedBadge: boolean;
    marketingManager: boolean;
    commissionBased: boolean;
    [key: string]: boolean;
  } | Array<{
    key: string;
    name: string;
    description?: string;
    enabled: boolean;
    icon?: string;
  }>;
  rating: {
    average: number;
    count: number;
  };
  responseTime?: string;
  planName: string;
}

class FeaturedVendorsService {
  async getFeaturedVendors(limit: number = 8): Promise<{
    vendors: FeaturedVendor[];
    totalCount: number;
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/properties/featured-vendors?limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch featured vendors");
      }

      return {
        vendors: result.data.vendors || [],
        totalCount: result.data.totalCount || 0,
      };
    } catch (error) {
      console.error("Failed to fetch featured vendors:", error);
      // Silently return empty data instead of showing error toast
      return {
        vendors: [],
        totalCount: 0,
      };
    }
  }
}

export const featuredVendorsService = new FeaturedVendorsService();
export default featuredVendorsService;
