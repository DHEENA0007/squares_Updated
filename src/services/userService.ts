import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface User {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  emailVerified: boolean;
  phoneVerified: boolean;
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
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
      // First get current user to get their ID
      const currentUserResponse = await this.getCurrentUser();
      const userId = currentUserResponse.data.user._id;
      
      const response = await this.makeRequest<SingleUserResponse>(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ profile: userData.profile }),
      });

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
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