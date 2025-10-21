import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Check, 
  X, 
  Star, 
  Infinity,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  limitations: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  color: string;
}

const MySubscription = () => {
  const [currentPlan] = useState("basic");
  const [loading, setLoading] = useState(false);

  const plans: Plan[] = [
    {
      id: "basic",
      name: "Basic",
      price: 0,
      duration: "Forever",
      color: "gray",
      features: [
        "Post up to 2 properties",
        "Basic property listing",
        "Standard support",
        "Profile creation"
      ],
      limitations: [
        "Limited to 2 property posts",
        "No featured listings",
        "Basic analytics only",
        "No priority support"
      ],
      isCurrentPlan: currentPlan === "basic"
    },
    {
      id: "premium",
      name: "Premium",
      price: 999,
      duration: "Per Month",
      color: "blue",
      isPopular: true,
      features: [
        "Post up to 10 properties",
        "Featured listings",
        "Advanced analytics",
        "Priority support",
        "Multiple property images",
        "Property promotion tools",
        "Lead management"
      ],
      limitations: [
        "Limited to 10 property posts",
        "Basic lead insights"
      ],
      isCurrentPlan: currentPlan === "premium"
    },
    {
      id: "professional",
      name: "Professional",
      price: 2499,
      duration: "Per Month",
      color: "purple",
      features: [
        "Unlimited property posts",
        "Premium featured listings",
        "Advanced lead analytics",
        "24/7 dedicated support",
        "Unlimited property images",
        "Advanced promotion tools",
        "CRM integration",
        "Custom branding",
        "Priority placement"
      ],
      limitations: [],
      isCurrentPlan: currentPlan === "professional"
    }
  ];

  const currentPlanData = plans.find(plan => plan.isCurrentPlan);

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    // TODO: Implement payment gateway integration
    setTimeout(() => {
      console.log(`Upgrading to ${planId}`);
      setLoading(false);
    }, 2000);
  };

  const usageStats = {
    propertiesPosted: 1,
    maxProperties: currentPlanData?.id === "basic" ? 2 : 
                   currentPlanData?.id === "premium" ? 10 : 999,
    viewsThisMonth: 145,
    inquiriesReceived: 8,
    favoritesReceived: 23
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-8 h-8 text-primary" />
            My Subscription
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and unlock more features
          </p>
        </div>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Current Plan Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{usageStats.viewsThisMonth}</p>
              <p className="text-sm text-muted-foreground">Views This Month</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{usageStats.inquiriesReceived}</p>
              <p className="text-sm text-muted-foreground">Inquiries Received</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{usageStats.favoritesReceived}</p>
              <p className="text-sm text-muted-foreground">Favorites Received</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">
                {usageStats.propertiesPosted}/{usageStats.maxProperties === 999 ? '∞' : usageStats.maxProperties}
              </p>
              <p className="text-sm text-muted-foreground">Properties Posted</p>
            </div>
          </div>

          {currentPlanData && (
            <div className="mt-6 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {currentPlanData.name} Plan
                  </h3>
                  <p className="text-muted-foreground">
                    {currentPlanData.price === 0 ? 'Free' : `₹${currentPlanData.price}/${currentPlanData.duration}`}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.isCurrentPlan ? 'ring-2 ring-primary' : ''} ${
                plan.isPopular ? 'border-primary shadow-lg' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {plan.isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      ₹{plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.duration.toLowerCase()}
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-green-600">What's Included:</h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-amber-600">Limitations:</h4>
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <X className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4">
                  {plan.isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading}
                      variant={plan.isPopular ? "default" : "outline"}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits of Upgrading */}
      <Card>
        <CardHeader>
          <CardTitle>Why Upgrade?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">More Visibility</h3>
              <p className="text-sm text-muted-foreground">
                Get your properties featured and seen by more potential buyers
              </p>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track performance with detailed insights and lead analytics
              </p>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Get faster response times and dedicated customer support
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Can I change my plan anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">What happens to my listings if I downgrade?</h4>
              <p className="text-sm text-muted-foreground">
                Your existing listings will remain active, but you won't be able to post new ones beyond the plan limit.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Is there a refund policy?</h4>
              <p className="text-sm text-muted-foreground">
                We offer a 7-day money-back guarantee for all paid plans if you're not satisfied with our service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MySubscription;