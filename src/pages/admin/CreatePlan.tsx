import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import planService from "@/services/planService";

const CreatePlan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });
  
  const [plan, setPlan] = useState({
    identifier: "",
    name: "",
    description: "",
    price: 0,
    currency: "INR",
    billingPeriod: "monthly" as "monthly" | "yearly" | "lifetime" | "one-time",
    features: [] as Array<{name: string; description?: string; enabled: boolean}>,
    limits: {
      properties: 5,
      featuredListings: 0,
      photos: 10,
      videoTours: 0,
      videos: 0,
      leads: 0,
      posters: 0,
      topRated: false,
      verifiedBadge: false,
      messages: 100,
      marketingManager: false,
      commissionBased: false,
      support: "email" as "none" | "email" | "priority" | "phone" | "dedicated",
      leadManagement: "basic" as "none" | "basic" | "advanced" | "premium" | "enterprise"
    },
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

  return (
    <div className="space-y-6 relative top-[60px]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Plan</h1>
          <p className="text-muted-foreground mt-2">Add a new subscription plan</p>
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
                <Label htmlFor="billing">Billing Period *</Label>
                <Select 
                  value={plan.billingPeriod} 
                  onValueChange={(value: "monthly" | "yearly" | "lifetime" | "one-time") => setPlan({ ...plan, billingPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
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
                <p className="text-xs text-muted-foreground">0 = unlimited, -1 = no properties</p>
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
                <p className="text-xs text-muted-foreground">Monthly limit, 0 = unlimited</p>
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

              <div className="space-y-2">
                <Label htmlFor="videos">Videos</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="messages">Monthly Messages</Label>
                <Input
                  id="messages"
                  type="number"
                  min="0"
                  value={plan.limits.messages}
                  onChange={(e) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, messages: parseInt(e.target.value) || 0 } 
                  })}
                />
                <p className="text-xs text-muted-foreground">0 = unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support">Support Level</Label>
                <Select 
                  value={plan.limits.support} 
                  onValueChange={(value: any) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, support: value } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="dedicated">Dedicated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadManagement">Lead Management</Label>
                <Select 
                  value={plan.limits.leadManagement} 
                  onValueChange={(value: any) => setPlan({ 
                    ...plan, 
                    limits: { ...plan.limits, leadManagement: value } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Benefits</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="topRated"
                    checked={plan.limits.topRated}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, topRated: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="topRated" className="cursor-pointer">Top Rated in Website</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verifiedBadge"
                    checked={plan.limits.verifiedBadge}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, verifiedBadge: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="verifiedBadge" className="cursor-pointer">Verified Owner Badge</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={plan.limits.marketingManager}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, marketingManager: checked as boolean } 
                    })}
                  />
                  <Label htmlFor="marketing" className="cursor-pointer">Marketing Manager Access</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commission"
                    checked={plan.limits.commissionBased}
                    onCheckedChange={(checked) => setPlan({ 
                      ...plan, 
                      limits: { ...plan.limits, commissionBased: checked as boolean } 
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
