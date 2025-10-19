import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const SubscriptionPlans = () => {
  const plans = [
    {
      name: "Basic",
      price: "₹999",
      period: "/month",
      features: [
        "Post up to 3 properties",
        "Basic property listing",
        "Email support",
        "Valid for 30 days",
      ],
    },
    {
      name: "Professional",
      price: "₹2,499",
      period: "/month",
      features: [
        "Post up to 10 properties",
        "Featured property listing",
        "Priority support",
        "Analytics dashboard",
        "Valid for 30 days",
        "Highlighted in search results",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₹4,999",
      period: "/month",
      features: [
        "Unlimited property listings",
        "Premium featured listings",
        "24/7 Priority support",
        "Advanced analytics",
        "Valid for 30 days",
        "Dedicated account manager",
        "Custom branding options",
      ],
    },
  ];

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
            key={plan.name}
            className={`rounded-2xl border-2 p-8 ${
              plan.popular
                ? "border-primary bg-primary/5 relative"
                : "border-border bg-card"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground ml-1">
                  {plan.period}
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={plan.popular ? "default" : "outline"}
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
