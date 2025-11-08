import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import roleService, { Role } from "@/services/roleService";
import { useAuth } from "@/contexts/AuthContext";
import { getPagesByCategory, type PageConfig } from "@/config/pages.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EditRole = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const categories = ['admin', 'subadmin', 'vendor', 'customer'] as const;

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const roleResponse = await roleService.getRole(id);
        const fetchedRole = roleResponse.data.role;
        // Ensure pages is always an array
        setRole({
          ...fetchedRole,
          pages: fetchedRole.pages || []
        });
      } catch (error) {
        console.error("Failed to fetch role:", error);
        toast({
          title: "Error",
          description: "Failed to load role data.",
          variant: "destructive",
        });
        navigate("/admin/roles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role || !id) return;

    if (!role.pages || role.pages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one page",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await roleService.updateRole(id, {
        name: role.name,
        description: role.description,
        pages: role.pages,
        isActive: role.isActive,
        level: role.level
      });
      navigate("/admin/roles");
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (pageId: string) => {
    if (!role) return;
    if (role.isSystemRole && !isSuperAdmin) return;
    
    const currentPages = role.pages || [];
    const newPages = currentPages.includes(pageId)
      ? currentPages.filter((p) => p !== pageId)
      : [...currentPages, pageId];
    
    setRole({ ...role, pages: newPages });
  };

  const toggleAllInCategory = (category: typeof categories[number]) => {
    if (!role) return;
    if (role.isSystemRole && !isSuperAdmin) return;

    const categoryPages = getPagesByCategory(category);
    const currentPages = role.pages || [];
    const allSelected = categoryPages.every(page => currentPages.includes(page.id));

    if (allSelected) {
      setRole({
        ...role,
        pages: currentPages.filter(p => !categoryPages.some(cp => cp.id === p))
      });
    } else {
      const newPages = categoryPages.map(p => p.id);
      setRole({
        ...role,
        pages: [...new Set([...currentPages, ...newPages])]
      });
    }
  };

  const PageCheckboxList = ({ pages }: { pages: PageConfig[] }) => {
    if (!role) return null;

    const currentPages = role.pages || [];

    return (
      <div className="space-y-2">
        {pages.map((page) => (
          <div key={page.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
            <Checkbox
              id={page.id}
              checked={currentPages.includes(page.id)}
              onCheckedChange={() => togglePage(page.id)}
              disabled={role.isSystemRole && !isSuperAdmin}
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading role...</span>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/roles")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Not Found</h1>
            <p className="text-muted-foreground mt-2">The requested role could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/roles")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Role: {role.name}</h1>
          <p className="text-muted-foreground">Update role details and page access</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core details about this role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Role Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={role.name}
                  onChange={(e) => setRole({ ...role, name: e.target.value })}
                  disabled={role.isSystemRole && !isSuperAdmin}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Access Level (1-10)</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="10"
                  value={role.level}
                  onChange={(e) => setRole({ ...role, level: parseInt(e.target.value) || 1 })}
                  disabled={role.isSystemRole && !isSuperAdmin}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={role.description}
                onChange={(e) => setRole({ ...role, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
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
                <p className="font-medium mb-1">Selected: {role.pages?.length || 0} pages</p>
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
                const currentPages = role.pages || [];
                const selectedInCategory = categoryPages.filter(p => currentPages.includes(p.id)).length;

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
                        disabled={role.isSystemRole && !isSuperAdmin}
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
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
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

export default EditRole;