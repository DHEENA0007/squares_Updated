import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2, Info, AlertCircle, Users, TrendingUp, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import planService, { Plan } from "@/services/planService";

const EditPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Local state type with normalized features
  type LocalPlan = Omit<Plan, 'features'> & {
    features: Array<{ name: string; description?: string; enabled: boolean }>;
  };
  
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });
  const [impactInfo, setImpactInfo] = useState<{ activeSubscriptions: number; note: string } | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await planService.getPlan(id);
        const fetchedPlan = response.data.plan;
        
        // Normalize features to always be objects
        const normalizedFeatures = fetchedPlan.features.map(feature => {
          if (typeof feature === 'string') {
            return { name: feature, description: '', enabled: true };
          }
          return feature;
        });
        
        // Ensure all required fields have default values
        setPlan({
          ...fetchedPlan,
          features: normalizedFeatures,
          limits: {
            properties: fetchedPlan.limits?.properties || 0,
            featuredListings: fetchedPlan.limits?.featuredListings || 0,
            photos: fetchedPlan.limits?.photos || 10,
            propertyImages: fetchedPlan.limits?.propertyImages || 10,
            videoTours: fetchedPlan.limits?.videoTours || 0,
            leads: fetchedPlan.limits?.leads || 0,
            videos: fetchedPlan.limits?.videos || 0,
            messages: fetchedPlan.limits?.messages || 0,
            leadManagement: fetchedPlan.limits?.leadManagement || 'basic'
          },
          benefits: {
            topRated: fetchedPlan.benefits?.topRated || false,
            verifiedBadge: fetchedPlan.benefits?.verifiedBadge || false,
            marketingManager: fetchedPlan.benefits?.marketingManager || false,
            commissionBased: fetchedPlan.benefits?.commissionBased || false,
          },
        });

        // Set impact info
        setImpactInfo({
          activeSubscriptions: fetchedPlan.subscriberCount || 0,
          note: 'Existing subscribers will keep their current plan features (snapshot). Only new subscriptions will get updated features.'
        });
      } catch (error) {
        console.error("Failed to fetch plan:", error);
        toast({
          title: "Error",
          description: "Failed to load plan data.",
          variant: "destructive",
        });
        navigate("/admin/plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !id) return;

    try {
      setSaving(true);
      await planService.updatePlan(id, plan);
      navigate("/admin/plans");
    } catch (error) {
      console.error("Failed to update plan:", error);
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (!plan || !newFeature.name.trim()) return;
    setPlan({ ...plan, features: [...plan.features, { ...newFeature, enabled: true }] });
    setNewFeature({ name: "", description: "" });
  };

  const removeFeature = (index: number) => {
    if (!plan) return;
    setPlan({ ...plan, features: plan.features.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading plan...</span>
      </div>
    );
  }

  if (!plan) {
    return <div>Plan not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Plan: {plan.name}</h1>
          <p className="text-muted-foreground mt-2">Update plan details and pricing</p>
        </div>
        {plan.isActive && (
          <Badge variant="default" className="ml-auto">Active</Badge>
        )}
        {!plan.isActive && (
          <Badge variant="secondary" className="ml-auto">Inactive</Badge>
        )}
      </div>

      {/* Plan Impact Summary */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{impactInfo?.activeSubscriptions || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{plan.price}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Billing</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{plan.billingPeriod}</p>
              </div>
            </div>
          </div>

          {plan.priceHistory && plan.priceHistory.length > 1 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Price History:</strong> Last updated from ₹{plan.priceHistory[plan.priceHistory.length - 2]?.price || 'N/A'} to ₹{plan.price}
                  {plan.priceHistory[plan.priceHistory.length - 1]?.changedAt && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({new Date(plan.priceHistory[plan.priceHistory.length - 1].changedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <strong>Important:</strong> {impactInfo?.note || 'Changes to this plan will only affect new subscriptions. Existing subscribers will keep their current plan features and pricing.'}
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core plan details visible to all users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
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
                {plan.priceHistory && plan.priceHistory.length > 1 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Previous: ₹{plan.priceHistory[plan.priceHistory.length - 2]?.price || 'N/A'}
                    </p>
                  </div>
                )}
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
                  value={plan.billingCycleMonths || 1}
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
            <CardDescription>Define usage quotas for this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="properties">Property Listings</Label>
                <Input
                  id="properties"
                  type="number"
                  min="0"
                  value={plan.limits.properties}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, properties: parseInt(e.target.value) || 0 } 
                  })}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited properties</p>
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
                <Label htmlFor="propertyImages">Property Images</Label>
                <Input
                  id="propertyImages"
                  type="number"
                  min="1"
                  max="100"
                  value={plan.limits.propertyImages}
                  onChange={(e) => setPlan({
                    ...plan,
                    limits: { ...plan.limits, propertyImages: parseInt(e.target.value) || 10 }
                  })}
                />
                <p className="text-xs text-muted-foreground">Max images per property</p>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="topRated"
                  checked={plan.benefits?.topRated || false}
                  onCheckedChange={(checked) => setPlan({ 
                    ...plan, 
                    benefits: { ...plan.benefits, topRated: checked as boolean } 
                  })}
                />
                <Label htmlFor="topRated" className="cursor-pointer text-sm">Top Rated Badge</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verifiedBadge"
                  checked={plan.benefits?.verifiedBadge || false}
                  onCheckedChange={(checked) => setPlan({ 
                    ...plan, 
                    benefits: { ...plan.benefits, verifiedBadge: checked as boolean } 
                  })}
                />
                <Label htmlFor="verifiedBadge" className="cursor-pointer text-sm">Verified Owner Badge</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={plan.benefits?.marketingManager || false}
                  onCheckedChange={(checked) => setPlan({ 
                    ...plan, 
                    benefits: { ...plan.benefits, marketingManager: checked as boolean } 
                  })}
                />
                <Label htmlFor="marketing" className="cursor-pointer text-sm">Marketing Manager</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="commission"
                  checked={plan.benefits?.commissionBased || false}
                  onCheckedChange={(checked) => setPlan({ 
                    ...plan, 
                    benefits: { ...plan.benefits, commissionBased: checked as boolean } 
                  })}
                />
                <Label htmlFor="commission" className="cursor-pointer text-sm">Commission Based Revenue</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>List all features included in this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex-1">
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
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No features added yet. Add features to help users understand what's included in this plan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Subscription Management</h4>
                <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  <li>✓ All changes are tracked in plan history</li>
                  <li>✓ Existing {impactInfo?.activeSubscriptions || 0} subscriber(s) keep their current plan details</li>
                  <li>✓ New subscriptions will use the updated plan configuration</li>
                  <li>✓ Price changes won't affect active subscribers until renewal</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/plans")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditPlan;
