import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: string;
  agreeToTerms: boolean;
  businessInfo?: any; // For vendor registration
  documents?: any; // For vendor documents
  otp?: string; // OTP for email verification
}

export interface OTPResponse {
  success: boolean;
  message: string;
  expiryMinutes?: number;
  remainingSeconds?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
      profile?: any;
    };
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any;
}

class AuthService {
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

    // Add auth token if available
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
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || errorData.error || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (response.success && response.data) {
        // Store auth data
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      
      // Don't show toast for pending approval - let the calling component handle it
      if (!errorMessage.includes("profile is under review") && 
          !errorMessage.includes("pending approval") &&
          !errorMessage.includes("awaiting admin approval")) {
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (response.success) {
        toast({
          title: "Registration Successful",
          description: response.message || "Please check your email for verification.",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed";
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Only call API if we have a token
      const token = localStorage.getItem("token");
      if (token) {
        await this.makeRequest("/auth/logout", {
          method: "POST",
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    }
  }

  clearAuthData(): void {
    // Silent cleanup without API call or toast
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.makeRequest("/auth/me");
      return response;
    } catch (error) {
      // If auth fails, clear stored data
      this.logout();
      throw error;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem("token");
    return !!token;
  }

  getStoredUser(): any {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  // OTP-related methods
  async sendOTP(email: string, firstName: string, phone?: string): Promise<OTPResponse> {
    try {
      const requestBody: any = { email, firstName };
      if (phone) {
        requestBody.phone = phone;
      }

      const response = await this.makeRequest<OTPResponse>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (response.success) {
        toast({
          title: "OTP Sent",
          description: response.message || "OTP has been sent to your email address.",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
      toast({
        title: "OTP Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async verifyOTP(email: string, otp: string): Promise<OTPResponse> {
    try {
      const response = await this.makeRequest<OTPResponse>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });

      if (response.success) {
        toast({
          title: "Email Verified",
          description: response.message || "Your email has been verified successfully.",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "OTP verification failed";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async registerWithOTPVerification(userData: RegisterData, otp: string): Promise<AuthResponse> {
    try {
      // First verify OTP
      await this.verifyOTP(userData.email, otp);
      
      // Then proceed with registration
      const response = await this.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Validation methods
  async checkPhoneAvailability(phone: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; available: boolean }>("/auth/check-phone", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });

      return {
        available: response.available,
        message: response.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check phone availability";
      return {
        available: false,
        message: errorMessage
      };
    }
  }

  async checkBusinessNameAvailability(businessName: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; available: boolean }>("/auth/check-business-name", {
        method: "POST",
        body: JSON.stringify({ businessName }),
      });

      return {
        available: response.available,
        message: response.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check business name availability";
      return {
        available: false,
        message: errorMessage
      };
    }
  }
}

export const authService = new AuthService();
export default authService;