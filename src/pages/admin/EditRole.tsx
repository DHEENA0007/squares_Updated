import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role, sampleRoles } from "@/components/data/sampleData";

const availablePermissions = ["create", "read", "update", "delete", "manage_users", "manage_content", "manage_settings"];

const EditRole = () => {
  const { id } = useParams();

  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const foundRole = sampleRoles.find((r) => r.id === id);
    if (foundRole) {
      setRole(foundRole);
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Role updated",
      description: "The role has been updated successfully.",
    });
    navigate("/admin/roles");
  };

  const togglePermission = (permission: string) => {
    if (!role) return;
    const newPermissions = role.permissions.includes(permission)
      ? role.permissions.filter((p) => p !== permission)
      : [...role.permissions, permission];
    setRole({ ...role, permissions: newPermissions });
  };

  if (!role) {
    return (
        <div>Role not found</div>
    );
  }

  return (

      <div className="space-y-6 relative top-[60px]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/roles")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Role</h1>
            <p className="text-muted-foreground mt-2">Update role details and permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={role.name}
                    onChange={(e) => setRole({ ...role, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={role.status} onValueChange={(value: "active" | "inactive") => setRole({ ...role, status: value })}>
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={role.description}
                  onChange={(e) => setRole({ ...role, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availablePermissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={role.permissions.includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <label
                        htmlFor={permission}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.replace(/_/g, " ")}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit">Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/roles")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

  );
};

export default EditRole;
