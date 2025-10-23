import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  isActive: boolean;
  level: number;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface RoleResponse {
  success: boolean;
  data: {
    roles: Role[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalRoles: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface SingleRoleResponse {
  success: boolean;
  data: {
    role: Role;
  };
}

class RoleService {
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

  async getRoles(filters: RoleFilters = {}): Promise<RoleResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const endpoint = `/roles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<RoleResponse>(endpoint);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch roles";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getRole(id: string): Promise<SingleRoleResponse> {
    try {
      const response = await this.makeRequest<SingleRoleResponse>(`/roles/${id}`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createRole(roleData: Partial<Role>): Promise<SingleRoleResponse> {
    try {
      const response = await this.makeRequest<SingleRoleResponse>("/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
      });

      toast({
        title: "Success",
        description: "Role created successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateRole(id: string, roleData: Partial<Role>): Promise<SingleRoleResponse> {
    try {
      const response = await this.makeRequest<SingleRoleResponse>(`/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(roleData),
      });

      toast({
        title: "Success",
        description: "Role updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteRole(id: string): Promise<void> {
    try {
      await this.makeRequest(`/roles/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Role deleted successfully!",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async toggleRoleStatus(id: string): Promise<SingleRoleResponse> {
    try {
      const response = await this.makeRequest<SingleRoleResponse>(`/roles/${id}/toggle-status`, {
        method: "PATCH",
      });

      toast({
        title: "Success",
        description: "Role status updated successfully!",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update role status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Helper method to get available permissions
  getAvailablePermissions(): string[] {
    return [
      'create_property',
      'read_property', 
      'update_property',
      'delete_property',
      'manage_users',
      'manage_roles',
      'manage_plans',
      'view_dashboard',
      'manage_settings',
      'manage_content',
      'send_messages',
      'moderate_content',
      'access_analytics'
    ];
  }

  // Helper method to format permissions for display
  formatPermissions(permissions: string[]): string {
    if (permissions.length <= 3) {
      return permissions.map(p => p.replace(/_/g, ' ')).join(', ');
    }
    return `${permissions.slice(0, 2).map(p => p.replace(/_/g, ' ')).join(', ')} and ${permissions.length - 2} more`;
  }

  // Helper method to get role level badge variant
  getRoleLevelVariant(level: number): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (level >= 8) return 'destructive'; // High level
    if (level >= 5) return 'default'; // Medium level
    return 'secondary'; // Low level
  }

  // Helper method to get role level text
  getRoleLevelText(level: number): string {
    if (level >= 8) return 'High';
    if (level >= 5) return 'Medium';
    return 'Low';
  }
}

export const roleService = new RoleService();
export default roleService;