import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface User {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    address?: {
      street?: string;
      city?: string;
      district?: string;
      state?: string;
      zipCode?: string;
    };
    preferences?: {
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
      privacy: {
        showEmail: boolean;
        showPhone: boolean;
      };
    };
  };
  role: string;
  rolePages?: string[];
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface UserResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SingleUserResponse {
  success: boolean;
  data: {
    user: User;
  };
}

class UserService {
  private baseUrl = import.meta.env.VITE_API_URL || 'https://api.buildhomemartsquares.com/api';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = authService.getToken();
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
        throw new Error(errorData.message || 'An error occurred');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getUsers(filters: UserFilters = {}): Promise<UserResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<UserResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getUser(id: string): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>(`/users/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createUser(userData: Partial<User>): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>("/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      toast({
        title: "Success",
        description: "User created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      toast({
        title: "Success",
        description: "User updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.makeRequest(`/users/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateUserStatus(id: string, status: User['status']): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      toast({
        title: "Success",
        description: `User status updated to ${status}!`,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async promoteUser(id: string, newRole: string): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>(`/users/${id}/promote`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      toast({
        title: "Success",
        description: `User promoted to ${newRole} successfully!`,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to promote user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getCurrentUser(): Promise<SingleUserResponse> {
    try {
      const response = await this.makeRequest<SingleUserResponse>("/auth/me");
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch current user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateCurrentUser(userData: Partial<User>): Promise<SingleUserResponse> {
    try {
      console.log('Update data being sent:', userData);
      
      // Validate and clean userData before sending
      if (userData.profile) {
        // Ensure preferences is never undefined
        if (userData.profile.preferences === undefined) {
          userData.profile.preferences = {
            notifications: {
              email: true,
              sms: false,
              push: true
            },
            privacy: {
              showEmail: false,
              showPhone: false
            }
          };
        } else if (userData.profile.preferences) {
          // Ensure nested objects are not undefined
          if (!userData.profile.preferences.notifications) {
            userData.profile.preferences.notifications = {
              email: true,
              sms: false,
              push: true
            };
          }
          if (!userData.profile.preferences.privacy) {
            userData.profile.preferences.privacy = {
              showEmail: false,
              showPhone: false
            };
          }
        }
      }

      console.log('Cleaned update data:', userData);
      
      // Get user ID and update user profile
      let userId = null;
      const storedUser = authService.getStoredUser();
      console.log('Stored user data:', storedUser);
      
      if (storedUser && (storedUser.id || storedUser._id)) {
        userId = storedUser.id || storedUser._id;
      }

      // If no stored user ID, try to get from API
      if (!userId) {
        console.log('No stored user ID, getting from API...');
        const currentUserResponse = await this.getCurrentUser();
        console.log('API response:', currentUserResponse);
        userId = currentUserResponse.data?.user?._id;
      }

      if (!userId) {
        console.error('No user ID available');
        throw new Error("Unable to get user ID. Please log in again.");
      }
      
      console.log('Updating user with ID:', userId);
      
      const response = await this.makeRequest<SingleUserResponse>(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      console.error('Update profile error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateUserPreferences(preferencesData: any): Promise<SingleUserResponse> {
    try {
      // Get current user data first to preserve all fields
      const currentUserResponse = await this.getCurrentUser();
      const currentUser = currentUserResponse.data.user;
      
      // Try to get user ID from stored user data first
      let userId = currentUser._id;
      
      if (!userId) {
        const storedUser = authService.getStoredUser();
        if (storedUser && storedUser.id) {
          userId = storedUser.id;
        }
      }

      if (!userId) {
        throw new Error("Unable to get user ID. Please log in again.");
      }
      
      // Deep merge preferences to preserve existing nested objects
      const mergedData = {
        profile: {
          ...currentUser.profile,
          ...preferencesData.profile,
          preferences: {
            ...currentUser.profile?.preferences,
            ...preferencesData.profile?.preferences
          }
        }
      };
      
      const response = await this.makeRequest<SingleUserResponse>(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(mergedData),
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update preferences";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/change-password', {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });

      toast({
        title: "Success",
        description: "Password updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async requestPasswordChangeOTP(currentPassword: string): Promise<{ success: boolean; message: string; expiryMinutes?: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; expiryMinutes?: number }>('/auth/request-password-change-otp', {
        method: "POST",
        body: JSON.stringify({ currentPassword }),
      });

      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async changePasswordWithOTP(otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/change-password-with-otp', {
        method: "POST",
        body: JSON.stringify({ 
          otp, 
          newPassword 
        }),
      });

      toast({
        title: "Success",
        description: "Password changed successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string; requiresOTP?: boolean; nextStep?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; requiresOTP?: boolean; nextStep?: string }>('/auth/change-password', {
        method: "POST",
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });

      // Check if OTP is required
      if (response.requiresOTP) {
        toast({
          title: "Enhanced Security",
          description: response.message,
          variant: "default",
        });
        return response;
      }

      toast({
        title: "Success",
        description: "Password changed successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Add OTP services for registration
  async sendOTP(email: string, firstName: string): Promise<{ success: boolean; message: string; expiryMinutes?: number }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; expiryMinutes: number }>('/auth/send-otp', {
        method: "POST",
        body: JSON.stringify({ 
          email: email,
          firstName: firstName 
        }),
      });

      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${email}. Valid for ${response.expiryMinutes} minutes.`,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw new Error(errorMessage);
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string; verified?: boolean }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string; verified: boolean }>('/auth/verify-otp', {
        method: "POST",
        body: JSON.stringify({ 
          email: email,
          otp: otp 
        }),
      });

      if (response.success) {
        toast({
          title: "Email Verified",
          description: "Your email has been verified successfully!",
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to verify OTP";
      
      toast({
        title: "Verification Failed", 
        description: errorMessage,
        variant: "destructive",
      });
      
      throw new Error(errorMessage);
    }
  }

  // Account Deactivation - Request deactivation link via email
  async requestAccountDeactivation(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/request-deactivation', {
        method: "POST",
        body: JSON.stringify({}),
      });

      toast({
        title: "Deactivation Email Sent",
        description: "Check your email for the confirmation link",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to request account deactivation";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Confirm Account Deactivation - Called when user clicks link in email
  async confirmAccountDeactivation(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/confirm-deactivation', {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      toast({
        title: "Account Deactivated",
        description: "Your account has been temporarily deactivated",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deactivate account";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Account Deletion - Request permanent deletion link via email
  async requestAccountDeletion(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/request-deletion', {
        method: "POST",
        body: JSON.stringify({}),
      });

      toast({
        title: "Deletion Email Sent",
        description: "Check your email for the confirmation link. Link expires in 24 hours.",
        variant: "destructive"
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to request account deletion";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Confirm Account Deletion - Called when user clicks link in email
  async confirmAccountDeletion(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/confirm-deletion', {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
        variant: "destructive"
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete account";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper method to get full name
  getFullName(user: User): string {
    return `${user.profile.firstName} ${user.profile.lastName}`.trim();
  }

  // Helper method to format creation date
  formatCreationDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export const userService = new UserService();
export default userService;