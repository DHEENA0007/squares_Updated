import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import roleService from "@/services/roleService";
import { getPagesByCategory, type PageConfig } from "@/config/pages.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AddRole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pages: [] as string[],
    level: 1,
    isActive: true,
  });

  const categories = ['admin', 'subadmin', 'vendor', 'customer'] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    // Pages validation removed - not required anymore
    // if (formData.pages.length === 0) {
    //   toast({
    //     title: "Validation Error",
    //     description: "Please select at least one page",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    try {
      setSaving(true);
      await roleService.createRole({
        name: formData.name,
        description: formData.description,
        pages: formData.pages,
        level: formData.level,
        isActive: formData.isActive,
        isSystemRole: false,
      });

      navigate("/admin/roles");
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (pageId: string) => {
    setFormData(prev => ({
      ...prev,
      pages: prev.pages.includes(pageId)
        ? prev.pages.filter(p => p !== pageId)
        : [...prev.pages, pageId]
    }));
  };

  const toggleAllInCategory = (category: typeof categories[number]) => {
    const categoryPages = getPagesByCategory(category);
    const allSelected = categoryPages.every(page => formData.pages.includes(page.id));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        pages: prev.pages.filter(p => !categoryPages.some(cp => cp.id === p))
      }));
    } else {
      const newPages = categoryPages.map(p => p.id);
      setFormData(prev => ({
        ...prev,
        pages: [...new Set([...prev.pages, ...newPages])]
      }));
    }
  };

  const PageCheckboxList = ({ pages }: { pages: PageConfig[] }) => (
    <div className="space-y-2">
      {pages.map((page) => (
        <div key={page.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
          <Checkbox
            id={page.id}
            checked={formData.pages.includes(page.id)}
            onCheckedChange={() => togglePage(page.id)}
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor={page.id}
              className="flex items-center gap-2 cursor-pointer font-medium"
            >
              <page.icon className="w-4 h-4" />
              {page.label}
              {page.subLabel && (
                <Badge variant="outline" className="text-xs">
                  {page.subLabel}
                </Badge>
              )}
            </Label>
            <p className="text-sm text-muted-foreground">{page.description}</p>
            <p className="text-xs text-muted-foreground font-mono">{page.path}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/roles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Role</h1>
          <p className="text-muted-foreground">Define a new role with specific page access</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic details for the role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Content Manager"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and responsibilities of this role"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Page Access</CardTitle>
            <CardDescription>
              Select which pages this role can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Selected: {formData.pages.length} pages</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Choose pages from different portal categories. Users with this role will only see and access the selected pages.
                </p>
              </div>
            </div>

            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="admin">Super Admin</TabsTrigger>
                <TabsTrigger value="subadmin">Sub Admin</TabsTrigger>
                <TabsTrigger value="vendor">Vendor</TabsTrigger>
                <TabsTrigger value="customer">Customer</TabsTrigger>
              </TabsList>

              {categories.map((category) => {
                const categoryPages = getPagesByCategory(category);
                const selectedInCategory = categoryPages.filter(p => formData.pages.includes(p.id)).length;

                return (
                  <TabsContent key={category} value={category} className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{category} Pages</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedInCategory} of {categoryPages.length} selected
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllInCategory(category)}
                      >
                        {selectedInCategory === categoryPages.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>

                    <PageCheckboxList pages={categoryPages} />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card> */}

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Role"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/roles")}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddRole;