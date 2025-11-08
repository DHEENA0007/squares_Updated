import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Edit, Trash2, Shield, Users, ToggleLeft, ToggleRight, MoreHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";
import { toast } from "@/hooks/use-toast";
import roleService, { Role } from "@/services/roleService";
import { useAuth } from "@/contexts/AuthContext";

const Roles = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  
  // Role type stats
  const [superAdminRole, setSuperAdminRole] = useState<Role | null>(null);
  const [subAdminRole, setSubAdminRole] = useState<Role | null>(null);
  
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      };

      const response = await roleService.getRoles(filters);
      // Ensure each role has pages array initialized
      const rolesWithPages = response.data.roles.map(role => ({
        ...role,
        pages: role.pages || []
      }));
      
      setRoles(rolesWithPages);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRoles(response.data.pagination.totalRoles);
      
      // Extract SuperAdmin and SubAdmin roles
      const superAdmin = rolesWithPages.find(r => r.name.toLowerCase() === 'superadmin');
      const subAdmin = rolesWithPages.find(r => r.name.toLowerCase() === 'subadmin');
      
      setSuperAdminRole(superAdmin || null);
      setSubAdminRole(subAdmin || null);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, searchTerm, statusFilter]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleToggleStatus = async (role: Role) => {
    try {
      const updatedRole = await roleService.toggleRoleStatus(role._id);
      // Realtime update: Update the role in state
      setRoles(prev => prev.map(r => 
        r._id === updatedRole.data.role._id ? updatedRole.data.role : r
      ));
      toast({
        title: "Success",
        description: `Role ${updatedRole.data.role.isActive ? 'activated' : 'deactivated'} successfully!`,
      });
    } catch (error) {
      console.error("Failed to toggle role status:", error);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      setDeleting(true);
      await roleService.deleteRole(selectedRole._id);
      setIsDeleteDialogOpen(false);
      const deletedId = selectedRole._id;
      setSelectedRole(null);
      // Realtime update: Remove the role from state
      setRoles(prev => prev.filter(role => role._id !== deletedId));
      setTotalRoles(prev => prev - 1);
      toast({
        title: "Success",
        description: "Role deleted successfully!",
      });
    } catch (error) {
      console.error("Failed to delete role:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  // Helper function to get role type badge
  const getRoleTypeBadge = (role: Role) => {
    const roleName = role.name.toLowerCase();
    if (roleName === 'superadmin') {
      return (
        <Badge variant="destructive" className="text-xs bg-red-600">
          <Shield className="w-3 h-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    if (roleName === 'subadmin') {
      return (
        <Badge variant="default" className="text-xs bg-orange-600">
          <Shield className="w-3 h-3 mr-1" />
          Sub Admin
        </Badge>
      );
    }
    if (role.isSystemRole) {
      return (
        <Badge variant="outline" className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          System
        </Badge>
      );
    }
    return null;
  };

  // Create extended type for DataTable
  type RoleWithId = Role & { id: string };

  const columns: Column<RoleWithId>[] = [
    { 
      key: "name", 
      label: "Role Name",
      render: (role) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {role.name}
            {getRoleTypeBadge(role)}
          </div>
          <div className="text-sm text-muted-foreground">
            {role.description}
          </div>
        </div>
      )
    },
    {
      key: "level",
      label: "Level",
      render: (role) => (
        <Badge variant={role.level >= 8 ? 'destructive' : role.level >= 5 ? 'default' : 'secondary'}>
          Level {role.level}
        </Badge>
      ),
    },
    {
      key: "pages",
      label: "Pages",
      render: (role) => (
        <div className="flex flex-wrap gap-1">
          {(role.pages || []).slice(0, 2).map((page, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {page.replace(/_/g, ' ')}
            </Badge>
          ))}
          {(role.pages?.length || 0) > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{(role.pages?.length || 0) - 2}
            </Badge>
          )}
        </div>
      ),
    },
    { 
      key: "userCount", 
      label: "Users",
      render: (role) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {role.userCount || 0}
          </span>
        </div>
      )
    },
    {
      key: "isActive",
      label: "Status",
      render: (role) => (
        <Badge variant={role.isActive ? "default" : "secondary"}>
          {role.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (role) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/roles/edit/${role._id}`);
              }}
              className="cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              {role.isSystemRole && !isSuperAdmin ? 'View Role' : 'Edit Role'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(role);
              }}
              disabled={role.isSystemRole && role.isActive && !isSuperAdmin}
              className="cursor-pointer"
            >
              {role.isActive ? (
                <ToggleLeft className="w-4 h-4 mr-2" />
              ) : (
                <ToggleRight className="w-4 h-4 mr-2" />
              )}
              {role.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(role);
              }}
              disabled={role.isSystemRole && !isSuperAdmin}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading roles...</span>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage user roles and permissions
            </p>
          </div>
          <Button
            onClick={() => navigate('/admin/roles/add')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Role
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-gray-600">Total Roles</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold">{totalRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-gray-600">Active Roles</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {roles.filter(role => role.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-gray-600">System Roles</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold text-blue-600">
                {roles.filter(role => role.isSystemRole).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-gray-600">Custom Roles</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold text-purple-600">
                {roles.filter(role => !role.isSystemRole).length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-red-700 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Super Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold text-red-600">
                {superAdminRole?.userCount || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Level {superAdminRole?.level || 10}
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-orange-700 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Sub Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-lg sm:text-xl font-bold text-orange-600">
                {subAdminRole?.userCount || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Level {subAdminRole?.level || 7}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Roles Section */}
        {(superAdminRole || subAdminRole) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {superAdminRole && (
              <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <Shield className="w-5 h-5" />
                    Super Admin Role
                  </CardTitle>
                  <CardDescription>{superAdminRole.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={superAdminRole.isActive ? "default" : "secondary"}>
                      {superAdminRole.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Access Level:</span>
                    <Badge variant="destructive">Level {superAdminRole.level}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Users:</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">{superAdminRole.userCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pages:</span>
                    <span className="font-bold text-red-600">{superAdminRole.pages?.length || 0}</span>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/admin/roles/edit/${superAdminRole._id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {subAdminRole && (
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Shield className="w-5 h-5" />
                    Sub Admin Role
                  </CardTitle>
                  <CardDescription>{subAdminRole.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={subAdminRole.isActive ? "default" : "secondary"}>
                      {subAdminRole.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Access Level:</span>
                    <Badge variant="default" className="bg-orange-600">Level {subAdminRole.level}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Users:</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">{subAdminRole.userCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pages:</span>
                    <span className="font-bold text-orange-600">{subAdminRole.pages?.length || 0}</span>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/admin/roles/edit/${subAdminRole._id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Roles</CardTitle>
            <CardDescription>
              {totalRoles} role{totalRoles !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              filterValue={statusFilter}
              onFilterChange={handleStatusFilter}
              filterOptions={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              filterPlaceholder="Filter by status"
            />

            <DataTable
              columns={columns}
              data={roles.map(role => ({ ...role, id: role._id }))}
              hideDefaultActions
            />

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={previousPage}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => goToPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={nextPage}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role "{selectedRole?.name}"? This action cannot be undone.
                {selectedRole?.userCount && selectedRole.userCount > 0 && (
                  <p className="text-destructive mt-2">
                    Warning: This role is currently assigned to {selectedRole.userCount} user(s).
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedRole(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default Roles;
