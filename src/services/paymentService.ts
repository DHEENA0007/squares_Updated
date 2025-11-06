import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
  userEmail: string;
  isMockPayment?: boolean;
}

export interface PaymentOptions {
  planId: string;
  billingCycle?: 'monthly' | 'yearly';
  onSuccess?: (response: any) => void;
  onFailure?: (error: any) => void;
}

class PaymentService {
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
      
      console.log("Payment API request:", { url, method: config.method || 'GET' });
      console.log("Payment API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        console.log("Payment API error data:", errorData);
        throw new Error(errorData.message || "An error occurred");
      }

      return await response.json();
    } catch (error) {
      console.error("Payment API request failed:", error);
      throw error;
    }
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  }

  async createPaymentOrder(planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<PaymentOrder> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: PaymentOrder;
      }>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle })
      });

      if (!response.success) {
        throw new Error('Failed to create payment order');
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create payment order";
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
  }): Promise<any> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
        message: string;
      }>('/payments/verify-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (!response.success) {
        throw new Error(response.message || 'Payment verification failed');
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  async initiatePayment(options: PaymentOptions): Promise<void> {
    try {
      // Load Razorpay script
      await this.loadRazorpayScript();

      // Create payment order
      const order = await this.createPaymentOrder(options.planId, options.billingCycle);

      // Configure Razorpay options
      const razorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Ninety Nine Acres",
        description: `Subscription to ${order.planName}`,
        order_id: order.orderId,
        prefill: {
          email: order.userEmail,
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verificationData = await this.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: options.planId,
              billingCycle: options.billingCycle || 'monthly'
            });

            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated successfully.",
            });

            if (options.onSuccess) {
              options.onSuccess(verificationData);
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            if (options.onFailure) {
              options.onFailure(error);
            }
          }
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user.",
              variant: "destructive",
            });
            if (options.onFailure) {
              options.onFailure(new Error('Payment cancelled'));
            }
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();

    } catch (error) {
      console.error('Payment initiation failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to initiate payment";
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (options.onFailure) {
        options.onFailure(error);
      }
    }
  }

  async processSubscriptionPayment(paymentData: {
    planId: string;
    addons: string[];
    billingCycle: 'monthly' | 'yearly';
    totalAmount: number;
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      // Load Razorpay script
      await this.loadRazorpayScript();

      // Create payment order for subscription with addons
      const response = await this.makeRequest<{
        success: boolean;
        data: PaymentOrder & { addons?: any[] };
      }>('/payments/create-subscription-order', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (!response.success) {
        throw new Error('Failed to create payment order');
      }

      const order = response.data;

      return new Promise((resolve, reject) => {
        // Configure Razorpay options
        const razorpayOptions = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Ninety Nine Acres",
          description: `Subscription to ${order.planName}${paymentData.addons.length > 0 ? ` with ${paymentData.addons.length} addon(s)` : ''}`,
          order_id: order.orderId,
          prefill: {
            email: order.userEmail,
          },
          theme: {
            color: "#2563eb",
          },
          handler: async (response: any) => {
            try {
              // Verify payment
              const verificationData = await this.verifySubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: paymentData.planId,
                addons: paymentData.addons,
                billingCycle: paymentData.billingCycle,
                totalAmount: paymentData.totalAmount
              });

              resolve({
                success: true,
                data: verificationData
              });
            } catch (error) {
              console.error('Payment verification failed:', error);
              reject({
                success: false,
                message: error instanceof Error ? error.message : 'Payment verification failed'
              });
            }
          },
          modal: {
            ondismiss: () => {
              reject({
                success: false,
                message: 'Payment was cancelled by user'
              });
            },
          },
        };

        // Open Razorpay checkout
        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
      });

    } catch (error) {
      console.error('Subscription payment failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process subscription payment"
      };
    }
  }

  async verifySubscriptionPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    addons: string[];
    billingCycle: 'monthly' | 'yearly';
    totalAmount: number;
  }): Promise<any> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
        message: string;
      }>('/payments/verify-subscription-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (!response.success) {
        throw new Error(response.message || 'Subscription payment verification failed');
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Subscription payment verification failed";
      throw new Error(errorMessage);
    }
  }

  async processAddonPayment(paymentData: {
    addons: string[];
    totalAmount: number;
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      // Create payment order for addons only
      const response = await this.makeRequest<{
        success: boolean;
        data: PaymentOrder & { addons?: any[]; isMockPayment?: boolean };
      }>('/payments/create-addon-order', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (!response.success) {
        throw new Error('Failed to create addon payment order');
      }

      const order = response.data;
      console.log('Addon payment order created:', order);

      // Handle mock payment for development
      if (order.isMockPayment || order.keyId === 'mock_key_for_development') {
        console.log('Processing mock addon payment for development');
        
        // Simulate successful payment for development
        try {
          const verificationData = await this.verifyAddonPayment({
            razorpay_order_id: order.orderId,
            razorpay_payment_id: `mock_payment_${Date.now()}`,
            razorpay_signature: 'mock_signature',
            addons: paymentData.addons,
            totalAmount: paymentData.totalAmount
          });
          
          console.log('Mock addon payment verification result:', verificationData);

          toast({
            title: "Payment Successful!",
            description: "Addons have been added to your subscription successfully.",
          });

          return {
            success: true,
            data: verificationData
          };
        } catch (error) {
          console.error('Mock addon payment verification failed:', error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Mock addon payment verification failed'
          };
        }
      }

      // Load Razorpay script for real payments
      await this.loadRazorpayScript();

      return new Promise((resolve, reject) => {
        // Configure Razorpay options
        const razorpayOptions = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Ninety Nine Acres",
          description: `Addon purchase - ${paymentData.addons.length} addon(s)`,
          order_id: order.orderId,
          prefill: {
            email: order.userEmail,
          },
          theme: {
            color: "#2563eb",
          },
          handler: async (response: any) => {
            try {
              console.log('Verifying addon payment with data:', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                addons: paymentData.addons,
                totalAmount: paymentData.totalAmount
              });
              
              // Verify addon payment
              const verificationData = await this.verifyAddonPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                addons: paymentData.addons,
                totalAmount: paymentData.totalAmount
              });
              
              console.log('Addon payment verification result:', verificationData);

              toast({
                title: "Payment Successful!",
                description: "Addons have been added to your subscription successfully.",
              });

              resolve({
                success: true,
                data: verificationData
              });
            } catch (error) {
              console.error('Addon payment verification failed:', error);
              reject({
                success: false,
                message: error instanceof Error ? error.message : 'Addon payment verification failed'
              });
            }
          },
          modal: {
            ondismiss: () => {
              reject({
                success: false,
                message: 'Payment was cancelled by user'
              });
            },
          },
        };

        // Open Razorpay checkout
        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
      });

    } catch (error) {
      console.error('Addon payment failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process addon payment"
      };
    }
  }

  async verifyAddonPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    addons: string[];
    totalAmount: number;
  }): Promise<any> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
        message: string;
      }>('/payments/verify-addon-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (!response.success) {
        throw new Error(response.message || 'Addon payment verification failed');
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Addon payment verification failed";
      throw new Error(errorMessage);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: any;
      }>(`/payments/${paymentId}/status`);

      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
