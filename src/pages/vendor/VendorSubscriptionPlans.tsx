import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowLeft, ArrowRight, Star, Zap, Shield, Camera, Video, Share2, Search, Users, Headphones, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { addonService } from '@/services/addonService';
import { planService, Plan as PlanType } from '@/services/planService';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  recommended?: boolean;
  icon: React.ReactNode;
  description: string;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime' | 'one-time' | 'custom';
  billingCycleMonths: number;
}

interface AddonService {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingType: 'monthly' | 'yearly' | 'per_property' | 'one_time' | 'custom';
  billingPeriod?: 'custom' | 'monthly' | 'yearly' | 'lifetime' | 'one-time' | 'per_property';
  billingCycleMonths?: number;
  category: 'photography' | 'marketing' | 'technology' | 'support' | 'crm';
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

const VendorSubscriptionPlans: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonService[]>([]);
  const [addons, setAddons] = useState<AddonService[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [billingCycle] = useState<'monthly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
    loadAddons();
    loadCurrentSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await planService.getPlans({ isActive: true });
      if (response.success && response.data.plans) {
        const dbPlans: PlanType[] = response.data.plans.sort((a, b) => a.sortOrder - b.sortOrder);
        
        // Map database plans to UI format
        const mappedPlans: Plan[] = dbPlans.map(dbPlan => ({
          id: dbPlan._id,
          name: dbPlan.name,
          price: dbPlan.price,
          description: dbPlan.description,
          icon: getIconForPlan(dbPlan.name),
          recommended: dbPlan.isPopular,
          billingPeriod: dbPlan.billingPeriod,
          billingCycleMonths: dbPlan.billingCycleMonths || 1,
          features: Array.isArray(dbPlan.features)
            ? dbPlan.features.map(f => typeof f === 'string' ? f : f.name)
            : []
        }));
        
        setPlans(mappedPlans);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPlansLoading(false);
    }
  };

  const getIconForPlan = (name: string): React.ReactNode => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('free')) return <Circle className="w-8 h-8 text-gray-600" />;
    if (lowerName.includes('basic')) return <Star className="w-8 h-8 text-green-600" />;
    if (lowerName.includes('standard')) return <Zap className="w-8 h-8 text-blue-600" />;
    if (lowerName.includes('premium')) return <Shield className="w-8 h-8 text-purple-600" />;
    if (lowerName.includes('enterprise')) return <Shield className="w-8 h-8 text-gold-600" />;
    return <Star className="w-8 h-8 text-gray-600" />;
  };

  const getBillingPeriodText = (plan: Plan): string => {
    // The source of truth is billingCycleMonths, not billingPeriod
    const months = plan.billingCycleMonths || 1;

    if (months === 1) {
      return 'month';
    } else if (months === 12) {
      return 'year';
    } else {
      return `${months} months`;
    }
  };

  const getBillingDescription = (plan: Plan): string => {
    // The source of truth is billingCycleMonths, not billingPeriod
    const months = plan.billingCycleMonths || 1;

    if (months === 1) {
      return 'Billed monthly';
    } else if (months === 12) {
      return 'Billed annually';
    } else {
      return `Billed every ${months} months`;
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api'}/vendors/subscription-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.hasActiveSubscription) {
          setCurrentSubscription(data.data.subscription);
        }
      }
    } catch (error) {
      console.error('Failed to load current subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const getAddonIcon = (category: string, iconName?: string) => {
    const iconProps = { className: "w-6 h-6" };
    
    switch (category) {
      case 'photography':
        return iconName === 'video' ? <Video {...iconProps} /> : <Camera {...iconProps} />;
      case 'marketing':
        return iconName === 'search' ? <Search {...iconProps} /> : <Share2 {...iconProps} />;
      case 'technology':
        return <Zap {...iconProps} />;
      case 'support':
        return <Headphones {...iconProps} />;
      case 'crm':
        return <Users {...iconProps} />;
      default:
        return <Circle {...iconProps} />;
    }
  };

  const loadAddons = async () => {
    try {
      setAddonsLoading(true);
      const addonsList = await addonService.getAddons();
      setAddons(addonsList.filter((addon: AddonService) => addon.isActive));
    } catch (error) {
      console.error('Failed to load addons:', error);
      toast({
        title: "Failed to load addons",
        description: "Using default addon services",
        variant: "destructive",
      });
    } finally {
      setAddonsLoading(false);
    }
  };

  const calculatePlanPrice = (plan: Plan) => {
    if (plan.price === 0) return plan.id === 'free' ? 'FREE' : 'FREE';
    return `₹${plan.price.toLocaleString()}`;
  };

  const calculateAddonTotal = () => {
    return selectedAddons.reduce((total, addon) => total + addon.price, 0);
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.price + calculateAddonTotal();
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleAddonToggle = (addon: AddonService) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a._id === addon._id);
      if (exists) {
        return prev.filter(a => a._id !== addon._id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const proceedToNextStep = () => {
    if (currentStep === 1 && !selectedPlan) {
      toast({
        title: "Please select a plan",
        description: "You must select a subscription plan to continue",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const proceedToPayment = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      const paymentData = {
        planId: selectedPlan.id,
        addons: selectedAddons.map(addon => addon._id),
        billingCycle: 'monthly' as 'monthly',
        totalAmount: calculateTotal()
      };

      console.log("Proceeding to payment with:", paymentData);
      
      // Call the actual payment service
      const { paymentService } = await import('../../services/paymentService');
      const result = await paymentService.processSubscriptionPayment(paymentData);
      
      if (result.success) {
        toast({
          title: "Payment Successful!",
          description: `Successfully subscribed to ${selectedPlan.name}${selectedAddons.length > 0 ? ` with ${selectedAddons.length} addon(s)` : ''}`,
        });
        
        // Refresh subscription data globally after successful payment
        try {
          const { vendorService } = await import('../../services/vendorService');
          await vendorService.refreshSubscriptionData();
        } catch (refreshError) {
          console.warn('Failed to refresh subscription data:', refreshError);
        }
        
        navigate("/vendor/subscription-manager");
      } else {
        throw new Error(result.message || 'Payment failed');
      }
      
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { step: 1, label: "Choose Plan" },
        { step: 2, label: "Add Services" }, 
        { step: 3, label: "Payment" }
      ].map(({ step, label }, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep 
                ? 'bg-blue-600 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step}
            </div>
            <span className={`text-xs mt-2 ${
              step <= currentStep ? 'text-blue-600 font-medium' : 'text-muted-foreground'
            }`}>
              {label}
            </span>
          </div>
          {index < 2 && (
            <div className={`w-16 h-0.5 mx-4 mt-2 ${
              step < currentStep ? 'bg-blue-600' : 'bg-border'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderPlanSelection = () => {
    if (plansLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {currentSubscription ? 'Upgrade Your Subscription Plan' : 'Choose Your Subscription Plan'}
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {currentSubscription 
              ? `You currently have the ${currentSubscription.planName}. Select a higher-priced plan to upgrade.`
              : 'Select the plan that best fits your business needs'
            }
          </p>
          
          <div className="text-center mb-8">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Monthly Billing - No Long-term Commitments
            </Badge>
            {currentSubscription && (
              <div className="mt-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                  {plans.filter(plan => {
                    if (plan.id === 'free') return false;
                    // Find current plan's actual price by matching plan names
                    const currentPlan = plans.find(p => {
                      const planNameMatch = p.name.toLowerCase().includes(currentSubscription.planName?.toLowerCase()) ||
                                           currentSubscription.planName?.toLowerCase().includes(p.name.toLowerCase());
                      return planNameMatch;
                    });
                    const currentPlanPrice = currentPlan?.price || 0;
                    return plan.price > currentPlanPrice;
                  }).length} Upgrade Options Available
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans
            .filter(plan => {
              // Hide free plan from display in subscription page
              if (plan.id === 'free') {
                return false;
              }
              
              // If user has existing subscription, only show plans with higher price
              // Compare based on actual plan price, not monthly billing amount
              if (currentSubscription) {
                // Find current plan's actual price by matching plan names
                const currentPlan = plans.find(p => {
                  const planNameMatch = p.name.toLowerCase().includes(currentSubscription.planName?.toLowerCase()) ||
                                       currentSubscription.planName?.toLowerCase().includes(p.name.toLowerCase());
                  return planNameMatch;
                });
                const currentPlanPrice = currentPlan?.price || 0;
                
                // Only show plans with higher base price than current plan
                return plan.price > currentPlanPrice;
              }
              
              // For new subscribers, show all paid plans
              return true;
            })
            .map((plan) => {
            const isCurrentPlan = currentSubscription && 
              currentSubscription.planName?.toLowerCase().includes(plan.name.toLowerCase());
          
          return (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                selectedPlan?.id === plan.id 
                  ? 'border-blue-600 shadow-lg bg-blue-50/50' 
                  : 'border-border hover:border-blue-300'
              } ${plan.recommended ? 'border-yellow-400' : ''} ${
                isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => !isCurrentPlan && handlePlanSelect(plan)}
            >
              {plan.recommended && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-600 hover:bg-yellow-600">
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge className="absolute -top-3 right-4 bg-green-600 hover:bg-green-600">
                  Current Plan
                </Badge>
              )}
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">{plan.icon}</div>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="text-4xl font-bold text-blue-600 mt-4">
                {calculatePlanPrice(plan)}
                {plan.price > 0 && (
                  <span className="text-lg text-muted-foreground font-normal">
                    /{getBillingPeriodText(plan)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-2">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {plan.features.map((feature, index) => {
                  const featureName = typeof feature === 'string' ? feature : (feature as any).name || '';
                  return (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                      <span className="text-sm text-foreground">{featureName}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          );
        })}
        
        {/* Show message if no upgrades available */}
        {currentSubscription && plans.filter(plan => {
          // Hide free plan from display
          if (plan.id === 'free') {
            return false;
          }
          
          // If upgrading, only show higher-priced plans
          const currentPlanPrice = currentSubscription.amount || 0;
          return plan.price > currentPlanPrice;
        }).length === 0 && (
          <div className="col-span-full text-center py-12">
            <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">You're on the best plan available!</h3>
            <p className="text-gray-600 mb-2">
              You currently have the {currentSubscription.planName} (₹{currentSubscription.amount?.toLocaleString() || 0}/month)
            </p>
            <p className="text-gray-600 mb-6">There are no higher plans available to upgrade to at this time.</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/vendor/subscription-manager')}
            >
              Manage Current Plan
            </Button>
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderAddonSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Enhance Your Plan</h1>
        <p className="text-muted-foreground text-lg mb-8">
          {currentSubscription?.addons?.length > 0 
            ? `Add more services to boost your property marketing. You currently have ${currentSubscription.addons.length} addon(s).`
            : 'Add optional services to boost your property marketing'
          }
        </p>
      </div>

      {addonsLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="h-48 animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons
            .filter(addon => {
              // Hide already purchased addons
              if (currentSubscription?.addons) {
                return !currentSubscription.addons.some((purchasedAddon: any) => purchasedAddon._id === addon._id);
              }
              return true;
            })
            .map((addon) => {
            const isSelected = selectedAddons.some(a => a._id === addon._id);
            const isPurchased = currentSubscription?.addons?.some((purchasedAddon: any) => purchasedAddon._id === addon._id);
            
            return (
              <Card 
                key={addon._id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/50 shadow-md' 
                    : 'border-border hover:border-blue-300'
                } ${isPurchased ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isPurchased && handleAddonToggle(addon)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getAddonIcon(addon.category, addon.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{addon.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize text-xs">
                          {addon.category}
                        </Badge>
                      </div>
                    </div>
                    {isPurchased ? (
                      <Badge className="bg-green-600 hover:bg-green-600 text-white">
                        Purchased
                      </Badge>
                    ) : isSelected ? (
                      <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    ₹{addon.price.toLocaleString()}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{addon.billingType.replace('_', ' ').replace('per property', 'per listing')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{addon.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!addonsLoading && addons.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Circle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg">No addon services available at the moment.</p>
            <p className="text-sm">You can continue without addons or check back later.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPaymentSummary = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Payment Summary</h1>
        <p className="text-muted-foreground text-lg mb-8">Review your selection and complete payment</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Summary */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-blue-100">
                  {selectedPlan?.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{selectedPlan?.name} Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan && getBillingDescription(selectedPlan)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  ₹{selectedPlan?.price || 0}
                </p>
              </div>
            </div>

            {/* Addons Summary */}
            {selectedAddons.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Add-on Services</h4>
                {selectedAddons.map((addon) => (
                  <div key={addon._id} className="flex items-center justify-between py-3 border-b border-dashed">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 rounded bg-muted">
                        {getAddonIcon(addon.category, addon.icon)}
                      </div>
                      <div>
                        <p className="font-medium">{addon.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {addon.billingType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">₹{addon.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between py-4 border-t-2 border-border">
              <span className="text-xl font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">₹{calculateTotal().toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <Button 
            size="lg" 
            onClick={proceedToPayment}
            disabled={loading}
            className="min-w-[250px] h-12 text-lg"
          >
            {loading ? "Processing..." : `Pay ₹${calculateTotal().toLocaleString()}`}
          </Button>
          <p className="text-sm text-muted-foreground">
            🔒 Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderStepIndicator()}

      {currentStep === 1 && renderPlanSelection()}
      {currentStep === 2 && renderAddonSelection()}
      {currentStep === 3 && renderPaymentSummary()}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-8">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={currentStep === 1}
          className="flex items-center space-x-2"
          size="lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        {currentStep < 3 && (
          <Button
            onClick={proceedToNextStep}
            className="flex items-center space-x-2"
            size="lg"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default VendorSubscriptionPlans;
