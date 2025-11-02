import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [newFeature, setNewFeature] = useState("");

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
            videoTours: fetchedPlan.limits?.videoTours || 0,
            leads: fetchedPlan.limits?.leads || 0,
            posters: fetchedPlan.limits?.posters || 0,
            topRated: fetchedPlan.limits?.topRated || false,
            verifiedBadge: fetchedPlan.limits?.verifiedBadge || false,
            messages: fetchedPlan.limits?.messages || 1000,
          },
          benefits: {
            topRatedInWebsite: fetchedPlan.benefits?.topRatedInWebsite || false,
            verifiedOwnerBadge: fetchedPlan.benefits?.verifiedOwnerBadge || false,
            marketingConsultation: fetchedPlan.benefits?.marketingConsultation || false,
            commissionBased: fetchedPlan.benefits?.commissionBased || false,
          }
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
    if (!plan || !newFeature.trim()) return;
    // Add feature as object to match the schema
    const newFeatureObj = {
      name: newFeature.trim(),
      description: '',
      enabled: true
    };
    setPlan({ ...plan, features: [...plan.features, newFeatureObj] });
    setNewFeature("");
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
    <div className="space-y-6 relative top-[60px]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Plan</h1>
          <p className="text-muted-foreground mt-2">Update plan details and pricing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
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
                  <p className="text-xs text-muted-foreground">
                    Previous price: ₹{plan.priceHistory[plan.priceHistory.length - 2]?.price || 'N/A'}
                  </p>
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
                <Label htmlFor="billing">Billing Period *</Label>
                <Select 
                  value={plan.billingPeriod} 
                  onValueChange={(value: "monthly" | "yearly" | "lifetime") => setPlan({ ...plan, billingPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardTitle>Limits & Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="properties">Properties Limit</Label>
                <Input
                  id="properties"
                  type="number"
                  min="-1"
                  value={plan.limits.properties}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, properties: parseInt(e.target.value) || 0 } 
                  })}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leads">Leads Limit</Label>
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
                <p className="text-xs text-muted-foreground">Monthly limit</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="posters">Promotional Posters</Label>
                <Input
                  id="posters"
                  type="number"
                  min="0"
                  value={plan.limits.posters}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, posters: parseInt(e.target.value) || 0 } 
                  })}
                />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Photos per Property</Label>
                <Input
                  id="photos"
                  type="number"
                  min="0"
                  value={plan.limits.photos}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, photos: parseInt(e.target.value) || 0 } 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoTours">Video Tours</Label>
                <Input
                  id="videoTours"
                  type="number"
                  min="0"
                  value={plan.limits.videoTours}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, videoTours: parseInt(e.target.value) || 0 } 
                  })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Benefits</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="topRated"
                    checked={plan.benefits?.topRatedInWebsite || false}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      benefits: { ...plan.benefits, topRatedInWebsite: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="topRated" className="cursor-pointer">Top Rated in Website</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verifiedBadge"
                    checked={plan.benefits?.verifiedOwnerBadge || false}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      benefits: { ...plan.benefits, verifiedOwnerBadge: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="verifiedBadge" className="cursor-pointer">Verified Owner Badge</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={plan.benefits?.marketingConsultation || false}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      benefits: { ...plan.benefits, marketingConsultation: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="marketing" className="cursor-pointer">Marketing Consultation</Label>
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
                  <Label htmlFor="commission" className="cursor-pointer">Commission Based</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new feature..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
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
                  <span className="text-sm">{feature.name}</span>
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
