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
import { ArrowLeft, Loader2, Info, Shield, Key, CheckCircle2, XCircle } from "lucide-react";
import roleService, { Role } from "@/services/roleService";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSION_GROUPS } from "@/config/permissionConfig";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const EditRole = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const roleResponse = await roleService.getRole(id);
        const fetchedRole = roleResponse.data.role;
        // Ensure pages and permissions are arrays
        setRole({
          ...fetchedRole,
          pages: fetchedRole.pages || [],
          permissions: fetchedRole.permissions || []
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

    try {
      setSaving(true);
      await roleService.updateRole(id, {
        name: role.name,
        description: role.description,
        pages: role.pages, // Keep existing pages
        permissions: role.permissions, // Update permissions
        isActive: role.isActive,
        level: role.level
      });
      
      toast({
        title: "Role Updated",
        description: "Role permissions have been updated successfully. Users with this role will need to refresh their page or re-login to see the changes.",
      });
      
      navigate("/admin/roles");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({
        title: "Error",
        description: "Failed to update role permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!role) return;
    if (role.isSystemRole && !isSuperAdmin) return;

    const currentPermissions = role.permissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((p) => p !== permissionId)
      : [...currentPermissions, permissionId];

    setRole({ ...role, permissions: newPermissions });
  };

  const toggleGroup = (groupId: string) => {
    if (!role) return;
    if (role.isSystemRole && !isSuperAdmin) return;

    const group = PERMISSION_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const groupPermissionIds = group.permissions.map(p => p.id);
    const currentPermissions = role.permissions || [];
    const allSelected = groupPermissionIds.every(id => currentPermissions.includes(id));

    if (allSelected) {
      setRole({
        ...role,
        permissions: currentPermissions.filter(p => !groupPermissionIds.includes(p))
      });
    } else {
      setRole({
        ...role,
        permissions: [...new Set([...currentPermissions, ...groupPermissionIds])]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg font-medium text-muted-foreground">Loading role data...</span>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Role Not Found</h1>
        <p className="text-muted-foreground">The requested role could not be found.</p>
        <Button onClick={() => navigate("/admin/roles")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4 border-b pb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/roles")} className="h-10 w-10 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Role: {role.name}</h1>
          <p className="text-muted-foreground mt-1">Update role details and manage permissions</p>
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
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">
                      Role Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={role.name}
                      onChange={(e) => setRole({ ...role, name: e.target.value })}
                      disabled={role.isSystemRole && !isSuperAdmin}
                      className="h-11"
                      required
                    />
                    {role.isSystemRole && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Info className="w-3 h-3" /> System role names cannot be changed
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level" className="text-base">Access Level (1-10)</Label>
                    <Input
                      id="level"
                      type="number"
                      min="1"
                      max="10"
                      value={role.level}
                      onChange={(e) => setRole({ ...role, level: parseInt(e.target.value) || 1 })}
                      disabled={role.isSystemRole && !isSuperAdmin}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">Description</Label>
                  <Textarea
                    id="description"
                    value={role.description}
                    onChange={(e) => setRole({ ...role, description: e.target.value })}
                    className="min-h-[100px] resize-none"
                    rows={3}
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
                    {role.permissions?.length || 0} Selected
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
                      {role.isSystemRole && !isSuperAdmin && " Note: Some permissions for system roles cannot be modified."}
                    </p>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPermissionIds = group.permissions.map(p => p.id);
                    const currentPermissions = role.permissions || [];
                    const selectedCount = groupPermissionIds.filter(id => currentPermissions.includes(id)).length;
                    const isAllSelected = selectedCount === groupPermissionIds.length;

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
                              className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-md
                                ${role.isSystemRole && !isSuperAdmin
                                  ? 'text-muted-foreground cursor-not-allowed opacity-50'
                                  : 'text-primary hover:text-primary/80 hover:bg-primary/10 cursor-pointer'}`}
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
                                  ${currentPermissions.includes(permission.id)
                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                    : 'hover:bg-accent/50 border-transparent hover:border-border'}
                                `}
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={currentPermissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  disabled={role.isSystemRole && !isSuperAdmin}
                                  className="mt-1"
                                />
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={permission.id}
                                    className={`text-sm font-medium leading-none block ${role.isSystemRole && !isSuperAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
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
                <CardTitle className="text-lg">Save Changes</CardTitle>
                <CardDescription>Review and update role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={role.isActive ? "default" : "secondary"}>
                    {role.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Permissions</span>
                  <span className="font-bold">{role.permissions?.length || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Type</span>
                  <Badge variant={role.isSystemRole ? "destructive" : "outline"}>
                    {role.isSystemRole ? "System" : "Custom"}
                  </Badge>
                </div>

                <Separator />

                <div className="grid gap-3">
                  <Button type="submit" disabled={saving} className="w-full h-11 text-base">
                    {saving ? "Saving Changes..." : "Save Changes"}
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

export default EditRole;