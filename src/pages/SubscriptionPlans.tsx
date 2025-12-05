import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { planService, Plan } from "@/services/planService";
import { useToast } from "@/hooks/use-toast";

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await planService.getPlans({ isActive: true });
      if (response.success && response.data.plans) {
        setPlans(response.data.plans.sort((a, b) => a.sortOrder - b.sortOrder));
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Subscription Plans</h1>
        <p className="text-lg text-muted-foreground">
          Choose the perfect plan for your property listing needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`rounded-2xl border-2 p-8 ${
              plan.isPopular
                ? "border-primary bg-primary/5 relative"
                : "border-border bg-card"
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold">
                  {plan.currency === 'USD' ? '$' : '₹'}{plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">
                  /
                  {(() => {
                    const months = plan.billingCycleMonths || 1;
                    if (months === 1) return 'month';
                    if (months === 12) return 'year';
                    return `${months} months`;
                  })()}
                </span>
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => {
                const featureName = typeof feature === 'string' ? feature : (feature as any).name || '';
                return (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{featureName}</span>
                  </li>
                );
              })}
            </ul>

            <Button
              className="w-full"
              variant={plan.isPopular ? "default" : "outline"}
            >
              Get Started
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};

export default SubscriptionPlans;
