import { useState, useEffect } from "react";
import { Eye, Trash2, Loader2, User as UserIcon, Mail, Phone, MapPin, Calendar, Shield, Activity, ArrowUpCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userService, User } from "@/services/userService";
import roleService, { Role } from "@/services/roleService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";

interface UserTableProps {
  searchQuery: string;
  roleFilter?: string;
  monthFilter?: string;
}

const UserTable = ({ searchQuery, roleFilter, monthFilter }: UserTableProps) => {
  const { isSuperAdmin, user } = useAuth();
  const userPermissions = user?.rolePermissions || [];
  const hasPermission = (permission: string) => userPermissions.includes(permission);
  const canPromoteUsers = isSuperAdmin || hasPermission(PERMISSIONS.USERS_PROMOTE);
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const itemsPerPage = 10;

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getRoles({ limit: 100, isActive: true });
        setRoles(response.data.roles);
      } catch (error) {
        console.error("Failed to fetch roles", error);
      }
    };
    fetchRoles();
  }, []);

  // Fetch users when page, search, or filters change
  useEffect(() => {
    const fetchUsers = async () => {
      if (isInitialLoading) {
        // Keep initial loading true
      } else {
        setIsTableLoading(true);
      }
      try {
        const response = await userService.getUsers({
          page: currentPage,
          limit: itemsPerPage,
          search: searchQuery || undefined,
          role: roleFilter || undefined,
          month: monthFilter || undefined,
        });

        if (response.success) {
          setUsers(response.data.users);
          setTotalPages(response.data.pagination.totalPages);
          setTotalUsers(response.data.pagination.totalUsers);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsInitialLoading(false);
        setIsTableLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, searchQuery, roleFilter, monthFilter]);

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      await userService.deleteUser(userId);
      // Refresh the user list
      const response = await userService.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.totalUsers);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const handlePromoteUser = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsPromoteDialogOpen(true);
  };

  const handlePromoteSubmit = async () => {
    if (!selectedUser || !selectedRole) return;

    setPromotingUserId(selectedUser._id);
    try {
      await userService.promoteUser(selectedUser._id, selectedRole);
      // Refresh the user list
      const response = await userService.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
      });
      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.totalUsers);
      }
      setIsPromoteDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
    } catch (error) {
      console.error("Failed to promote user:", error);
    } finally {
      setPromotingUserId(null);
    }
  };



  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading users...</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table className={isMobile ? 'min-w-[450px]' : ''}>
          <TableHeader>
            <TableRow>
              <TableHead className={isMobile ? 'text-xs' : ''}>S.No</TableHead>
              <TableHead className={isMobile ? 'text-xs' : ''}>Name</TableHead>
              <TableHead className={isMobile ? 'text-xs' : ''}>Email</TableHead>
              <TableHead className={`hidden md:table-cell ${isMobile ? 'text-xs' : ''}`}>Phone</TableHead>
              <TableHead className={`hidden sm:table-cell ${isMobile ? 'text-xs' : ''}`}>Role</TableHead>
              <TableHead className={`hidden lg:table-cell ${isMobile ? 'text-xs' : ''}`}>Status</TableHead>
              <TableHead className={`hidden lg:table-cell ${isMobile ? 'text-xs' : ''}`}>Created</TableHead>
              <TableHead className={`text-right ${isMobile ? 'text-xs' : ''}`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => (
                <TableRow key={user._id}>
                  <TableCell className={isMobile ? 'text-xs' : ''}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                    {userService.getFullName(user)}
                  </TableCell>
                  <TableCell className={isMobile ? 'text-xs' : ''}>{user.email}</TableCell>
                  <TableCell className={`hidden md:table-cell ${isMobile ? 'text-xs' : ''}`}>
                    {user.profile.phone || "-"}
                  </TableCell>
                  <TableCell className={`hidden sm:table-cell ${isMobile ? 'text-xs' : ''}`}>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className={isMobile ? 'text-xs px-1 py-0' : ''}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className={`hidden lg:table-cell ${isMobile ? 'text-xs' : ''}`}>
                    <Badge
                      variant={
                        user.status === "active"
                          ? "default"
                          : user.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                      className={isMobile ? 'text-xs px-1 py-0' : ''}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`hidden lg:table-cell ${isMobile ? 'text-xs' : ''}`}>
                    {userService.formatCreationDate(user.createdAt)}
                  </TableCell>
                  <TableCell className={`text-right ${isMobile ? 'text-xs' : ''}`}>
                    <div className={`flex justify-end gap-1 ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
                      <Button
                        variant="ghost"
                        size={isMobile ? "sm" : "icon"}
                        onClick={() => handleViewUser(user)}
                        title="View User Details"
                        className={isMobile ? 'h-6 w-6 p-1' : ''}
                      >
                        <Eye className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                      {canPromoteUsers && (
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "icon"}
                          onClick={() => handlePromoteUser(user)}
                          title="Promote User"
                          className={isMobile ? 'h-6 w-6 p-1' : ''}
                        >
                          <ArrowUpCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size={isMobile ? "sm" : "icon"} className={isMobile ? 'h-6 w-6 p-1' : ''}>
                            <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user
                              account and remove their data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user._id)}
                              disabled={deletingUserId === user._id}
                            >
                              {deletingUserId === user._id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <PaginationItem key={pageNum}>...</PaginationItem>;
              }
              return null;
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* User Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedUser ? userService.getFullName(selectedUser) : 'user'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-base">{userService.getFullName(selectedUser)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-base">{selectedUser.profile?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User ID</p>
                      <p className="text-base font-mono text-sm">{selectedUser._id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <Badge variant={selectedUser.role === "admin" ? "default" : "secondary"} className="mt-1">
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge
                        variant={
                          selectedUser.status === "active"
                            ? "default"
                            : selectedUser.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="mt-1"
                      >
                        {selectedUser.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                      <Badge variant={selectedUser.profile?.emailVerified ? "default" : "destructive"} className="mt-1">
                        {selectedUser.profile?.emailVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone Verified</p>
                      <Badge variant={selectedUser.profile?.phoneVerified ? "default" : "destructive"} className="mt-1">
                        {selectedUser.profile?.phoneVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              {selectedUser.profile?.address && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      {selectedUser.profile?.address?.street && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Street</p>
                          <p className="text-base">{selectedUser.profile.address.street}</p>
                        </div>
                      )}
                      {selectedUser.profile?.address?.city && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">City</p>
                          <p className="text-base">{selectedUser.profile.address.city}</p>
                        </div>
                      )}
                      {selectedUser.profile?.address?.state && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">State</p>
                          <p className="text-base">{selectedUser.profile.address.state}</p>
                        </div>
                      )}
                      {selectedUser.profile?.address?.zipCode && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pincode</p>
                          <p className="text-base">{selectedUser.profile.address.zipCode}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    User Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Language</p>
                      <p className="text-base">Not available</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Currency</p>
                      <p className="text-base">Not available</p>
                    </div>
                  </div>

                  {selectedUser.profile?.preferences?.notifications && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Notification Preferences</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={selectedUser.profile.preferences.notifications.email ? "default" : "secondary"}>
                          Email: {selectedUser.profile.preferences.notifications.email ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant={selectedUser.profile.preferences.notifications.sms ? "default" : "secondary"}>
                          SMS: {selectedUser.profile.preferences.notifications.sms ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant={selectedUser.profile.preferences.notifications.push ? "default" : "secondary"}>
                          Push: {selectedUser.profile.preferences.notifications.push ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Timestamps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Account Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created At</p>
                      <p className="text-base">{userService.formatCreationDate(selectedUser.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p className="text-base">{userService.formatCreationDate(selectedUser.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDetailsDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote User Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote User</DialogTitle>
            <DialogDescription>
              Change the role of {selectedUser ? userService.getFullName(selectedUser) : 'user'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Role</p>
                <Badge variant="secondary">{selectedUser.role}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">New Role</p>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role._id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="agent">Vendor/Agent</SelectItem>
                        <SelectItem value="subadmin">Sub Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> Changing a user's role will affect their permissions and access to features.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPromoteDialogOpen(false);
                    setSelectedUser(null);
                    setSelectedRole("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePromoteSubmit}
                  disabled={!selectedRole || selectedRole === selectedUser.role || promotingUserId === selectedUser._id}
                >
                  {promotingUserId === selectedUser._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Promoting...
                    </>
                  ) : (
                    "Promote User"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserTable;