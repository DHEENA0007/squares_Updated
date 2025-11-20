import { authService } from './authService';
import { toast } from "@/hooks/use-toast";

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultCurrency: string;
  defaultLanguage: string;
  timezone: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  adminAlerts: boolean;
  systemAlerts: boolean;
  userActivityAlerts: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  maxLoginAttempts: number;
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  allowPasswordReset: boolean;
  autoLockAccount: boolean;
  ipWhitelisting: boolean;
}

export interface PaymentSettings {
  currency: string;
  taxRate: number;
  processingFee: number;
  refundPolicy: string;
  autoRefund: boolean;
  paymentMethods: string[];
  minimumAmount: number;
  maximumAmount: number;
}

export interface SystemSettings {
  backupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupRetention: number;
  maintenanceWindow: string;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  performanceMode: 'balanced' | 'performance' | 'memory';
}

export interface IntegrationSettings {
  emailProvider: 'smtp' | 'sendgrid' | 'aws-ses';
  emailApiKey?: string;
  smsProvider: 'twilio' | 'aws-sns' | 'firebase';
  smsApiKey?: string;
  paymentGateway: 'razorpay' | 'stripe' | 'paypal';
  paymentApiKey?: string;
  googleMapsApiKey?: string;
  cloudinaryApiKey?: string;
  firebaseConfig?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
  };
}

export interface LocationSettings {
  defaultCountry: string;
  defaultState: string;
  defaultDistrict: string;
  defaultCity: string;
  enableLocationAutodetection: boolean;
  locationDataSource: 'loca' | 'google' | 'mapbox';
  radiusUnit: 'km' | 'miles';
  defaultRadius: number;
}

export interface AdminSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  payment: PaymentSettings;
  system: SystemSettings;
  integrations: IntegrationSettings;
  location: LocationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettingsResponse {
  success: boolean;
  data: {
    settings: AdminSettings;
  };
  message?: string;
}

export interface UpdateSettingsRequest {
  category: 'general' | 'notifications' | 'security' | 'payment' | 'system' | 'integrations' | 'location';
  settings: Partial<GeneralSettings | NotificationSettings | SecuritySettings | PaymentSettings | SystemSettings | IntegrationSettings | LocationSettings>;
}

class SettingsService {
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

  async getSettings(): Promise<SettingsResponse> {
    try {
      const response = await this.makeRequest<SettingsResponse>('/admin/settings');
      return response;
    } catch (error) {
      // Return default settings if API call fails
      console.error('Failed to fetch settings, using defaults:', error);
      return {
        success: true,
        data: {
          settings: this.getDefaultSettings()
        }
      };
    }
  }

  async updateSettings(request: UpdateSettingsRequest): Promise<SettingsResponse> {
    try {
      const response = await this.makeRequest<SettingsResponse>(`/admin/settings/${request.category}`, {
        method: "PATCH",
        body: JSON.stringify(request.settings),
      });

      toast({
        title: "Success",
        description: `${this.capitalizeFirst(request.category)} settings updated successfully!`,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to update ${request.category} settings`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'general', settings });
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'notifications', settings });
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'security', settings });
  }

  async updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'payment', settings });
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'system', settings });
  }

  async updateIntegrationSettings(settings: Partial<IntegrationSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'integrations', settings });
  }

  async updateLocationSettings(settings: Partial<LocationSettings>): Promise<SettingsResponse> {
    return this.updateSettings({ category: 'location', settings });
  }

  async resetSettings(category: 'general' | 'notifications' | 'security' | 'payment' | 'system' | 'integrations' | 'location'): Promise<SettingsResponse> {
    try {
      const response = await this.makeRequest<SettingsResponse>(`/admin/settings/${category}/reset`, {
        method: "POST",
      });

      toast({
        title: "Success",
        description: `${this.capitalizeFirst(category)} settings reset to defaults!`,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to reset ${category} settings`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async testNotification(type: 'email' | 'sms' | 'push'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(`/admin/settings/test-notification`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });

      toast({
        title: response.success ? "Success" : "Failed",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to send test ${type} notification`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async testIntegration(type: 'email' | 'sms' | 'payment' | 'maps'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(`/admin/settings/test-integration`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });

      toast({
        title: response.success ? "Integration Test Successful" : "Integration Test Failed",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to test ${type} integration`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async syncSettingRealtime(category: keyof AdminSettings, key: string, value: any): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>(`/admin/settings/sync`, {
        method: "POST",
        body: JSON.stringify({ category, key, value }),
      });

      return response;
    } catch (error) {
      console.error('Real-time sync failed:', error);
      // Fail silently for real-time sync, will be saved on next batch save
      return { success: false, message: 'Sync failed, will retry' };
    }
  }

  async exportSettings(): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/settings/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export settings');
      }

      return await response.blob();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async importSettings(file: File): Promise<SettingsResponse> {
    try {
      const formData = new FormData();
      formData.append('settings', file);

      const response = await fetch(`${this.baseUrl}/admin/settings/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import settings');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: "Settings imported successfully!",
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  private getDefaultSettings(): AdminSettings {
    return {
      general: {
        siteName: "BuildHomeMart Squares",
        siteDescription: "Premium Real Estate Platform",
        contactEmail: "contact@buildhomemartsquares.com",
        supportEmail: "support@buildhomemartsquares.com",
        maintenanceMode: false,
        registrationEnabled: true,
        defaultCurrency: "INR",
        defaultLanguage: "en",
        timezone: "Asia/Kolkata",
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        adminAlerts: true,
        systemAlerts: true,
        userActivityAlerts: false,
        marketingEmails: true,
        weeklyReports: true,
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordMinLength: 8,
        maxLoginAttempts: 5,
        requireEmailVerification: true,
        requirePhoneVerification: false,
        allowPasswordReset: true,
        autoLockAccount: true,
        ipWhitelisting: false,
      },
      payment: {
        currency: "INR",
        taxRate: 18,
        processingFee: 2.5,
        refundPolicy: "7 days",
        autoRefund: false,
        paymentMethods: ["card", "upi", "netbanking"],
        minimumAmount: 100,
        maximumAmount: 1000000,
      },
      system: {
        backupEnabled: true,
        backupFrequency: 'daily',
        backupRetention: 30,
        maintenanceWindow: '02:00-04:00',
        debugMode: false,
        logLevel: 'info',
        performanceMode: 'balanced',
      },
      integrations: {
        emailProvider: 'smtp',
        smsProvider: 'twilio',
        paymentGateway: 'razorpay',
      },
      location: {
        defaultCountry: 'India',
        defaultState: 'Karnataka',
        defaultCity: 'Bangalore',
        enableLocationAutodetection: true,
        locationDataSource: 'loca',
        radiusUnit: 'km',
        defaultRadius: 25,
      }
    };
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper methods for validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateSettings(category: string, settings: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (category) {
      case 'general':
        if (!settings.siteName?.trim()) errors.push('Site name is required');
        if (settings.contactEmail && !this.validateEmail(settings.contactEmail)) {
          errors.push('Invalid contact email');
        }
        if (settings.supportEmail && !this.validateEmail(settings.supportEmail)) {
          errors.push('Invalid support email');
        }
        break;

      case 'security':
        if (settings.sessionTimeout && (settings.sessionTimeout < 5 || settings.sessionTimeout > 480)) {
          errors.push('Session timeout must be between 5 and 480 minutes');
        }
        if (settings.passwordMinLength && (settings.passwordMinLength < 6 || settings.passwordMinLength > 50)) {
          errors.push('Password minimum length must be between 6 and 50 characters');
        }
        if (settings.maxLoginAttempts && (settings.maxLoginAttempts < 3 || settings.maxLoginAttempts > 20)) {
          errors.push('Max login attempts must be between 3 and 20');
        }
        break;

      case 'payment':
        if (settings.taxRate && (settings.taxRate < 0 || settings.taxRate > 100)) {
          errors.push('Tax rate must be between 0% and 100%');
        }
        if (settings.processingFee && (settings.processingFee < 0 || settings.processingFee > 20)) {
          errors.push('Processing fee must be between 0% and 20%');
        }
        if (settings.minimumAmount && settings.minimumAmount < 0) {
          errors.push('Minimum amount cannot be negative');
        }
        if (settings.maximumAmount && settings.minimumAmount && settings.maximumAmount < settings.minimumAmount) {
          errors.push('Maximum amount cannot be less than minimum amount');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const settingsService = new SettingsService();
export default settingsService;
