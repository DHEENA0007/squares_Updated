import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Info, Shield, Key, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import roleService from "@/services/roleService";
import { PERMISSION_GROUPS, type Permission } from "@/config/permissionConfig";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const AddRole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    level: 1,
    isActive: true,
  });

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

    try {
      setSaving(true);
      await roleService.createRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        pages: [], // New roles don't use page-based access
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

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleGroup = (groupId: string) => {
    const group = PERMISSION_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const groupPermissionIds = group.permissions.map(p => p.id);
    const allSelected = groupPermissionIds.every(id => formData.permissions.includes(id));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !groupPermissionIds.includes(p))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...groupPermissionIds])]
      }));
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b pb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/roles")} className="h-10 w-10 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Role</h1>
          <p className="text-muted-foreground mt-1">Define a new role with specific permissions and access levels</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="space-y-8">
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Core details about this role</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">
                    Role Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Content Manager"
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-muted-foreground">A unique name to identify this role</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose and responsibilities of this role..."
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Key className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle>Permissions</CardTitle>
                      <CardDescription>
                        Select which permissions this role has
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {formData.permissions.length} Selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Permission Control</p>
                    <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                      Permissions are grouped by module. Expand a group to see available actions.
                      Granting a permission allows users with this role to perform specific actions.
                    </p>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPermissionIds = group.permissions.map(p => p.id);
                    const selectedCount = groupPermissionIds.filter(id => formData.permissions.includes(id)).length;
                    const isAllSelected = selectedCount === groupPermissionIds.length;
                    const isPartial = selectedCount > 0 && !isAllSelected;

                    return (
                      <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4 bg-card">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg">{group.label}</span>
                              {selectedCount > 0 && (
                                <Badge variant={isAllSelected ? "default" : "secondary"} className="text-xs">
                                  {selectedCount}/{group.permissions.length}
                                </Badge>
                              )}
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(group.id);
                              }}
                              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-md hover:bg-primary/10"
                            >
                              {isAllSelected ? (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Deselect All
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Select All
                                </>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pt-2">
                          <Separator className="mb-4" />
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className={`
                                  flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200
                                  ${formData.permissions.includes(permission.id)
                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                    : 'hover:bg-accent/50 border-transparent hover:border-border'}
                                `}
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={formData.permissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  className="mt-1"
                                />
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={permission.id}
                                    className="text-sm font-medium leading-none cursor-pointer block"
                                  >
                                    {permission.label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.id}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Publish Role</CardTitle>
                <CardDescription>Review and save your changes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={formData.isActive ? "default" : "secondary"}>
                    {formData.isActive ? "Active" : "Draft"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Permissions</span>
                  <span className="font-bold">{formData.permissions.length}</span>
                </div>

                <Separator />

                <div className="grid gap-3">
                  <Button type="submit" disabled={saving} className="w-full h-11 text-base">
                    {saving ? "Creating Role..." : "Create Role"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/roles")}
                    disabled={saving}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddRole;