import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plan, samplePlans } from "@/components/data/sampleData";

const EditPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    const foundPlan = samplePlans.find((p) => p.id === id);
    if (foundPlan) {
      setPlan(foundPlan);
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Plan updated",
      description: "The plan has been updated successfully.",
    });
    navigate("/admin/plans");
  };

  const addFeature = () => {
    if (!plan || !newFeature.trim()) return;
    setPlan({ ...plan, features: [...plan.features, newFeature.trim()] });
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    if (!plan) return;
    setPlan({ ...plan, features: plan.features.filter((_, i) => i !== index) });
  };

  if (!plan) {
    return (
        <div>Plan not found</div>
    );
  }

  return (
      <div className="space-y-6 relative top-[60px]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/plans")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Plan</h1>
            <p className="text-muted-foreground mt-2">Update plan details and pricing</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={plan.name}
                    onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={plan.price}
                    onChange={(e) => setPlan({ ...plan, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing">Billing Period</Label>
                  <Select 
                    value={plan.billingPeriod} 
                    onValueChange={(value: "monthly" | "yearly") => setPlan({ ...plan, billingPeriod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={plan.status} 
                    onValueChange={(value: "active" | "inactive") => setPlan({ ...plan, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Features</Label>
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
                      <span className="text-sm">{feature}</span>
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
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit">Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/plans")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
};

export default EditPlan;
