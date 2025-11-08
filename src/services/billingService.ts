import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface SubscriptionPlan {
  _id: string;
  name: string;
  tier: 'basic' | 'premium' | 'enterprise';
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: string[];
  limits: {
    properties: number;
    leads: number;
    messages: number;
    analytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
  isPopular: boolean;
  isActive: boolean;
}

export interface VendorSubscription {
  _id: string;
  vendorId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  amount: number;
  currency: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface Payment {
  _id: string;
  vendorId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'bank_transfer' | 'upi' | 'wallet';
  paymentGateway: 'razorpay' | 'stripe' | 'payu';
  transactionId?: string;
  gatewayOrderId?: string;
  description: string;
  paidAt?: string;
  failureReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  vendorId: string;
  subscriptionId: string;
  paymentId?: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  vendorDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gst?: string;
  };
  downloadUrl?: string;
}

export interface BillingStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  nextBillingAmount: number;
  nextBillingDate: string;
  subscriptionStatus: string;
  usageStats: {
    properties: { used: number; limit: number };
    leads: { used: number; limit: number };
    messages: { used: number; limit: number };
  };
}

export interface BillingFilters {
  page?: number;
  limit?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: 'payments' | 'invoices' | 'subscriptions';
  sortBy?: 'createdAt' | 'amount' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}

class BillingService {
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
      console.error("Billing API request failed:", error);
      throw error;
    }
  }

  // Subscription Management
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: SubscriptionPlan[];
      }>("/billing/plans");

      return response.success ? response.data : [];
    } catch (error) {
      console.error("Failed to fetch subscription plans:", error);
      return [];
    }
  }

  async getCurrentSubscription(): Promise<VendorSubscription | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: VendorSubscription;
      }>("/vendors/subscription/current");

      return response.success ? response.data : null;
    } catch (error) {
      console.error("Failed to fetch current subscription:", error);
      return null;
    }
  }

  async upgradeSubscription(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<{ success: boolean; paymentUrl?: string; message: string }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: { paymentUrl?: string };
        message: string;
      }>("/vendors/subscription/upgrade", {
        method: "POST",
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Subscription upgrade initiated!",
        });
      }

      return {
        success: response.success,
        paymentUrl: response.data?.paymentUrl,
        message: response.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upgrade subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, message: errorMessage };
    }
  }

  async cancelSubscription(reason?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>("/vendors/subscription/cancel", {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Subscription cancelled successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to cancel subscription");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  async reactivateSubscription(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>("/vendors/subscription/reactivate", {
        method: "POST",
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Subscription reactivated successfully!",
        });
        return true;
      }

      throw new Error(response.message || "Failed to reactivate subscription");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reactivate subscription";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }

  // Payment Management
  async getPayments(filters: BillingFilters = {}): Promise<{
    payments: Payment[];
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

      const endpoint = `/vendors/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          payments: Payment[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        payments: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      return {
        payments: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  // Invoice Management
  async getInvoices(filters: BillingFilters = {}): Promise<{
    invoices: Invoice[];
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

      const endpoint = `/vendors/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          invoices: Invoice[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
        };
      }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        invoices: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      return {
        invoices: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  async downloadInvoice(invoiceId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/invoices/${invoiceId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      const blob = await response.blob();
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully!",
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to download invoice";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  // Statistics
  async getBillingStats(): Promise<BillingStats> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: BillingStats;
      }>("/vendors/billing/stats");

      if (response.success && response.data) {
        return response.data;
      }

      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        activeSubscriptions: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        nextBillingAmount: 0,
        nextBillingDate: new Date().toISOString(),
        subscriptionStatus: 'inactive',
        usageStats: {
          properties: { used: 0, limit: 0 },
          leads: { used: 0, limit: 0 },
          messages: { used: 0, limit: 0 },
        },
      };
    } catch (error) {
      console.error("Failed to fetch billing stats:", error);
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        activeSubscriptions: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        nextBillingAmount: 0,
        nextBillingDate: new Date().toISOString(),
        subscriptionStatus: 'inactive',
        usageStats: {
          properties: { used: 0, limit: 0 },
          leads: { used: 0, limit: 0 },
          messages: { used: 0, limit: 0 },
        },
      };
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusColor(status: string): string {
    const colors = {
      active: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100',
      expired: 'text-orange-600 bg-orange-100',
      pending: 'text-yellow-600 bg-yellow-100',
      trial: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      refunded: 'text-purple-600 bg-purple-100',
      paid: 'text-green-600 bg-green-100',
      overdue: 'text-red-600 bg-red-100',
      sent: 'text-blue-600 bg-blue-100',
      draft: 'text-gray-600 bg-gray-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  }

  getUsagePercentage(used: number, limit: number): number {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async getPaymentDetails(paymentId: string): Promise<Payment | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Payment;
      }>(`/vendors/payments/${paymentId}`);

      return response.success ? response.data : null;
    } catch (error) {
      console.error("Failed to fetch payment details:", error);
      toast({
        title: "Error",
        description: "Failed to load payment details",
        variant: "destructive",
      });
      return null;
    }
  }

  async getInvoiceDetails(invoiceId: string): Promise<Invoice | null> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Invoice;
      }>(`/vendors/invoices/${invoiceId}`);

      return response.success ? response.data : null;
    } catch (error) {
      console.error("Failed to fetch invoice details:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
      return null;
    }
  }

  async downloadReceipt(paymentId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/payments/${paymentId}/receipt`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download receipt");
      }

      const blob = await response.blob();
      
      toast({
        title: "Success",
        description: "Receipt downloaded successfully!",
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to download receipt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  async exportBillingData(format: 'csv' | 'pdf' | 'excel', filters: BillingFilters = {}): Promise<Blob | null> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/vendors/billing/export?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export billing data");
      }

      const blob = await response.blob();
      
      toast({
        title: "Success",
        description: "Billing data exported successfully!",
      });

      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export billing data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }
}

export const billingService = new BillingService();
export default billingService;