import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Calendar, CreditCard, Plus, Crown, Star, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { addonService } from '@/services/addonService';
import { paymentService } from '@/services/paymentService';

interface Feature {
  name: string;
  description?: string;
  enabled?: boolean;
  _id?: string;
  id?: string;
}

interface Subscription {
  id: string;
  planName: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  features: (string | Feature)[]; // Support both string and object features
  billingCycle: string;
  addons?: AddonService[]; // Add addons to the interface
  amount?: number;
  currency?: string;
}

interface AddonService {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  billingType: 'monthly' | 'yearly' | 'per_property' | 'one_time';
  isActive: boolean;
}

const VendorSubscriptionManager: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [availableAddons, setAvailableAddons] = useState<AddonService[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AddonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptionData();
    loadAvailableAddons();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/vendors/subscription-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Subscription API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Subscription API response data:', data);
        
        if (data.success && data.data.hasActiveSubscription) {
          console.log('Setting subscription data:', data.data.subscription);
          setSubscription(data.data.subscription);
        } else {
          console.log('No active subscription found:', data);
        }
      } else {
        console.log('Subscription API response not ok:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAddons = async () => {
    try {
      const addons = await addonService.getAddons();
      setAvailableAddons(addons.filter((addon: AddonService) => addon.isActive));
    } catch (error) {
      console.error('Failed to load addons:', error);
      // Use mock data if API fails
      setAvailableAddons([
        {
          _id: '1',
          name: 'Professional Photography',
          description: 'High-quality property photography service',
          price: 2999,
          category: 'photography',
          billingType: 'per_property',
          isActive: true
        },
        {
          _id: '2',
          name: 'Virtual Tours',
          description: '360° virtual property tours',
          price: 4999,
          category: 'technology',
          billingType: 'per_property',
          isActive: true
        },
        {
          _id: '3',
          name: 'Social Media Marketing',
          description: 'Promote your listings on social platforms',
          price: 1999,
          category: 'marketing',
          billingType: 'monthly',
          isActive: true
        }
      ]);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case 'basic':
        return <Circle className="w-8 h-8 text-blue-500" />;
      case 'premium':
        return <Star className="w-8 h-8 text-yellow-500" />;
      case 'enterprise':
        return <Shield className="w-8 h-8 text-purple-500" />;
      default:
        return <Crown className="w-8 h-8 text-green-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isAddonActive = (addonId: string) => {
    return subscription?.addons?.some(addon => addon._id === addonId) || false;
  };

  const handleAddonToggle = (addon: AddonService) => {
    // Check if addon is already active
    if (isAddonActive(addon._id)) {
      toast({
        title: "Addon Already Active",
        description: `${addon.name} is already included in your subscription`,
        variant: "default",
      });
      return;
    }

    setSelectedAddons(prev => {
      const exists = prev.find(a => a._id === addon._id);
      if (exists) {
        return prev.filter(a => a._id !== addon._id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const calculateAddonTotal = () => {
    return selectedAddons.reduce((total, addon) => total + addon.price, 0);
  };

  const purchaseAddons = async () => {
    if (selectedAddons.length === 0) {
      toast({
        title: "No addons selected",
        description: "Please select at least one addon to purchase",
        variant: "destructive",
      });
      return;
    }

    if (!subscription) {
      toast({
        title: "No active subscription",
        description: "Please subscribe to a plan first before purchasing addons",
        variant: "destructive",
      });
      return;
    }

    setPaymentLoading(true);
    try {
      // Use addon-specific payment method for existing subscription holders
      const paymentData = {
        addons: selectedAddons.map(addon => addon._id),
        totalAmount: calculateAddonTotal()
      };

      const result = await paymentService.processAddonPayment(paymentData);
      
      if (result.success) {
        toast({
          title: "Addons Purchased Successfully!",
          description: `Successfully purchased ${selectedAddons.length} addon service(s)`,
        });
        
        setSelectedAddons([]);
        
        // Refresh subscription data both locally and globally
        loadSubscriptionData(); // Local refresh
        
        try {
          const { vendorService } = await import('../../services/vendorService');
          await vendorService.refreshSubscriptionData();
        } catch (refreshError) {
          console.warn('Failed to refresh subscription data globally:', refreshError);
        }
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Addon purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase addons",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Manage your subscription and addon services
            </p>
          </div>
        </div>
        {!subscription && (
          <Button onClick={() => navigate('/vendor/subscription-plans')}>
            <Plus className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        )}
      </div>

      {/* Current Subscription */}
      {subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              {getPlanIcon(subscription.planName)}
              <div>
                <h2 className="text-2xl font-bold">{subscription.planName} Plan</h2>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status.toUpperCase()}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">{formatDate(subscription.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">{formatDate(subscription.endDate)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Days Remaining</p>
                  <p className="font-medium text-green-600">
                    {getDaysRemaining(subscription.endDate)} days
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Plan Features</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {subscription.features.map((feature, index) => {
                  // Handle both string features and object features
                  const featureName = typeof feature === 'string' 
                    ? feature 
                    : (typeof feature === 'object' && feature !== null && 'name' in feature) 
                      ? feature.name 
                      : String(feature);
                  
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{String(featureName)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Purchased Addons */}
            {subscription.addons && subscription.addons.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Purchased Add-ons</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {subscription.addons.map((addon, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 rounded bg-blue-100">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{addon.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{addon.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">₹{addon.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {addon.billingType.replace('_', ' ').replace('per property', 'per listing')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Summary */}
            {subscription.amount && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-black">Total Amount</p>
                    <p className="font-semibold text-lg dark:text-black">₹{subscription.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-black">Billing</p>
                    <p className="font-medium dark:text-black">{subscription.billingCycle}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <Button 
                variant="outline"
                onClick={() => navigate('/vendor/subscription-plans')}
              >
                Upgrade Plan
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/vendor/billing')}
              >
                View Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">Choose a subscription plan to get started with premium features</p>
            <Button onClick={() => navigate('/vendor/subscription-plans')}>
              Choose Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Addons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Addon Services</span>
            {selectedAddons.length > 0 && (
              <Badge variant="outline">
                {selectedAddons.length} selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const purchasedAddonIds = subscription?.addons?.map(addon => addon._id) || [];
              console.log('Purchased addon IDs:', purchasedAddonIds);
              console.log('Available addons:', availableAddons.map(a => ({ id: a._id, name: a.name })));
              
              const filteredAddons = availableAddons.filter(addon => 
                !subscription?.addons?.some(purchasedAddon => purchasedAddon._id === addon._id)
              );
              console.log('Filtered addons (after removing purchased):', filteredAddons.map(a => ({ id: a._id, name: a.name })));
              
              return filteredAddons;
            })().map((addon) => {
              const isSelected = selectedAddons.some(a => a._id === addon._id);
              return (
                <Card 
                  key={addon._id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleAddonToggle(addon)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{addon.name}</CardTitle>
                      {isSelected ? (
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      ₹{addon.price.toLocaleString()}
                      <span className="text-sm text-gray-500 font-normal">
                        /{addon.billingType.replace('_', ' ').replace('per property', 'per listing')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-3">{addon.description}</p>
                    <Badge variant="outline" className="capitalize">
                      {addon.category}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Show message if all addons are purchased */}
          {subscription && availableAddons.length > 0 && 
           availableAddons.every(addon => subscription.addons?.some(purchasedAddon => purchasedAddon._id === addon._id)) && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Addons Purchased!</h3>
              <p className="text-gray-600">You have already purchased all available addon services.</p>
            </div>
          )}

          {/* Purchase Addons Button */}
          {selectedAddons.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedAddons.length} addon(s) selected
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: ₹{calculateAddonTotal().toLocaleString()}
                  </p>
                </div>
                <Button 
                  onClick={purchaseAddons}
                  disabled={paymentLoading}
                  size="lg"
                >
                  {paymentLoading ? "Processing..." : `Purchase Addons - ₹${calculateAddonTotal().toLocaleString()}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorSubscriptionManager;