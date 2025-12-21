import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2, Info, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import planService from "@/services/planService";

const CreatePlan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });
  const [newBenefit, setNewBenefit] = useState({ name: "", description: "", icon: "" });
  
  const [plan, setPlan] = useState({
    identifier: "",
    name: "",
    description: "",
    price: 0,
    currency: "INR",
    billingPeriod: "monthly" as "monthly" | "yearly" | "lifetime" | "one-time" | "custom",
    billingCycleMonths: 1,
    features: [] as Array<{name: string; description?: string; enabled: boolean}>,
    limits: {
      properties: 5 as number | null,
      featuredListings: 0,
      photos: 10,
      videoTours: 0,
      leads: 0,
      videos: 0,
      posters: 0,
      messages: 0,
      leadManagement: "basic" as "none" | "basic" | "advanced" | "premium" | "enterprise"
    },
    benefits: [] as Array<{key: string; name: string; description?: string; enabled: boolean; icon?: string}>,
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plan.identifier.trim()) {
      toast({
        title: "Error",
        description: "Plan identifier is required",
        variant: "destructive",
      });
      return;
    }

    if (plan.features.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one feature",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await planService.createPlan(plan);
      navigate("/admin/plans");
    } catch (error) {
      console.error("Failed to create plan:", error);
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (!newFeature.name.trim()) return;
    setPlan({ ...plan, features: [...plan.features, { ...newFeature, enabled: true }] });
    setNewFeature({ name: "", description: "" });
  };

  const removeFeature = (index: number) => {
    setPlan({ ...plan, features: plan.features.filter((_, i) => i !== index) });
  };

  const addBenefit = () => {
    if (!newBenefit.name.trim()) return;
    const benefitKey = newBenefit.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    setPlan({ 
      ...plan, 
      benefits: [
        ...plan.benefits, 
        { 
          key: benefitKey,
          name: newBenefit.name,
          description: newBenefit.description,
          enabled: true,
          icon: newBenefit.icon || 'star'
        }
      ] 
    });
    setNewBenefit({ name: "", description: "", icon: "" });
  };

  const removeBenefit = (index: number) => {
    setPlan({ ...plan, benefits: plan.benefits.filter((_, i) => i !== index) });
  };

  const toggleBenefit = (index: number) => {
    const updatedBenefits = [...plan.benefits];
    updatedBenefits[index] = { ...updatedBenefits[index], enabled: !updatedBenefits[index].enabled };
    setPlan({ ...plan, benefits: updatedBenefits });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Create New Plan</h1>
          <p className="text-muted-foreground mt-2">Add a new subscription plan for your users</p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Plan Snapshot Protection:</strong> Once users subscribe to this plan, they will keep these exact features and pricing even if you update the plan later. Only new subscribers will get the updated plan.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Define the core details of your subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="identifier">Plan Identifier *</Label>
                <Input
                  id="identifier"
                  placeholder="e.g., free, basic, premium"
                  value={plan.identifier}
                  onChange={(e) => setPlan({ ...plan, identifier: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                />
                <p className="text-xs text-muted-foreground">Unique identifier for the plan (lowercase, no spaces)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Free Listing, Premium"
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the plan benefits..."
                  value={plan.description}
                  onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.price}
                  onChange={(e) => setPlan({ ...plan, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={plan.currency} 
                  onValueChange={(value: "INR" | "USD" | "EUR") => setPlan({ ...plan, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCycleMonths">Billing Period (Months) *</Label>
                <Input
                  id="billingCycleMonths"
                  type="number"
                  min="1"
                  max="120"
                  value={plan.billingCycleMonths}
                  onChange={(e) => {
                    const months = parseInt(e.target.value) || 1;
                    let billingPeriod: "monthly" | "yearly" | "lifetime" | "one-time" | "custom" = "custom";
                    if (months === 1) billingPeriod = "monthly";
                    else if (months === 12) billingPeriod = "yearly";
                    setPlan({ ...plan, billingPeriod, billingCycleMonths: months });
                  }}
                  placeholder="Enter number of months (1-120)"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the billing cycle in months. Common values: 1 (monthly), 12 (yearly)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={plan.sortOrder}
                  onChange={(e) => setPlan({ ...plan, sortOrder: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={plan.isActive}
                  onCheckedChange={(checked) => setPlan({ ...plan, isActive: checked as boolean })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPopular"
                  checked={plan.isPopular}
                  onCheckedChange={(checked) => setPlan({ ...plan, isPopular: checked as boolean })}
                />
                <Label htmlFor="isPopular" className="cursor-pointer">Mark as Popular</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>Set usage limits for plan subscribers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="properties">Property Listings</Label>
                <div className="flex gap-2">
                  <Input
                    id="properties"
                    type="number"
                    min="1"
                    value={plan.limits.properties === null ? '' : plan.limits.properties}
                    onChange={(e) => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, properties: parseInt(e.target.value) || 1 } 
                    })}
                    placeholder={plan.limits.properties === null ? '∞ Unlimited' : 'Enter number'}
                    disabled={plan.limits.properties === null}
                  />
                  <Button
                    type="button"
                    variant={plan.limits.properties === null ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, properties: plan.limits.properties === null ? 5 : null } 
                    })}
                    title={plan.limits.properties === null ? "Set limited" : "Set unlimited (infinity)"}
                  >
                    ∞
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan.limits.properties === null ? 'Unlimited properties (∞)' : `Limited to ${plan.limits.properties} properties`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredListings">Featured Listings</Label>
                <Input
                  id="featuredListings"
                  type="number"
                  min="0"
                  value={plan.limits.featuredListings}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, featuredListings: parseInt(e.target.value) || 0 } 
                  })}
                />
                <p className="text-xs text-muted-foreground">Highlighted in search</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leads">Monthly Leads</Label>
                <Input
                  id="leads"
                  type="number"
                  min="0"
                  value={plan.limits.leads}
                  onChange={(e) => setPlan({
                    ...plan,
                    limits: { ...plan.limits, leads: parseInt(e.target.value) || 0 }
                  })}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Photos per Property</Label>
                <Input
                  id="photos"
                  type="number"
                  min="1"
                  max="100"
                  value={plan.limits.photos}
                  onChange={(e) => setPlan({
                    ...plan,
                    limits: { ...plan.limits, photos: parseInt(e.target.value) || 10 }
                  })}
                />
                <p className="text-xs text-muted-foreground">Max photos per property</p>
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="videos">Videos Allowed</Label>
                <Input
                  id="videos"
                  type="number"
                  min="0"
                  value={plan.limits.videos}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, videos: parseInt(e.target.value) || 0 } 
                  })}
                />
                <p className="text-xs text-muted-foreground">Property videos</p>
              </div> */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premium Benefits</CardTitle>
            <CardDescription>Special benefits and features for this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Benefit name..."
                value={newBenefit.name}
                onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                className="flex-1"
              />
              <Input
                placeholder="Description (optional)"
                value={newBenefit.description}
                onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                className="flex-1"
              />
              <Input
                placeholder="Icon name (optional)"
                value={newBenefit.icon}
                onChange={(e) => setNewBenefit({ ...newBenefit, icon: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                className="w-32"
              />
              <Button type="button" onClick={addBenefit} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {plan.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      id={`benefit-${index}`}
                      checked={benefit.enabled}
                      onCheckedChange={() => toggleBenefit(index)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`benefit-${index}`} className="cursor-pointer text-sm font-medium">
                        {benefit.name}
                      </Label>
                      {benefit.description && (
                        <p className="text-xs text-muted-foreground mt-1">{benefit.description}</p>
                      )}
                      {benefit.icon && (
                        <p className="text-xs text-muted-foreground">Icon: {benefit.icon}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBenefit(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {plan.benefits.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No benefits added yet. Add benefits to highlight special features of this plan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>List the key features included in this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                Add descriptive features to help users understand what they get with this plan. These will be displayed on the subscription selection page.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Input
                placeholder="Feature name..."
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                className="flex-1"
              />
              <Input
                placeholder="Description (optional)"
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                className="flex-1"
              />
              <Button type="button" onClick={addFeature} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium">{feature.name}</span>
                    {feature.description && (
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {plan.features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No features added yet. Add at least one feature.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Plan
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/plans")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePlan;
