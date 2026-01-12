import { useState, useEffect } from "react";
import { Eye, Ban, Loader2, User as UserIcon, Mail, Phone, MapPin, Calendar, Shield, Activity, ArrowUpCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { locaService, PincodeSuggestion } from "@/services/locaService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { CheckCircle, AlertCircle } from "lucide-react";

interface UserTableProps {
  searchQuery: string;
  roleFilter?: string;
  monthFilter?: string;
  statusFilter?: string;
}

const UserTable = ({ searchQuery, roleFilter, monthFilter, statusFilter }: UserTableProps) => {
  const { isSuperAdmin, user } = useAuth();
  const userPermissions = user?.rolePermissions || [];
  const hasPermission = (permission: string) => userPermissions.includes(permission);
  const canPromoteUsers = isSuperAdmin || hasPermission(PERMISSIONS.USERS_PROMOTE);
  const canManageUserStatus = isSuperAdmin || hasPermission(PERMISSIONS.USERS_STATUS);
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const itemsPerPage = 10;

  // Business Info State
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    businessType: "",
    businessDescription: "",
    experience: "0",
    licenseNumber: "",
    gstNumber: "",
    panNumber: "",
    website: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
  });

  // Location service states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locaInitialized, setLocaInitialized] = useState(false);

  // Initialize locaService
  useEffect(() => {
    const initLocaService = async () => {
      try {
        if (!locaService.isReady()) {
          await locaService.initialize();
        }
        const loadedStates = locaService.getStates();
        setStates(loadedStates);
        setLocaInitialized(true);
      } catch (error) {
        console.error('Failed to initialize loca service:', error);
        setStates([]);
      }
    };

    initLocaService();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (selectedState && locaInitialized) {
      const loadedDistricts = locaService.getDistricts(selectedState);
      setDistricts(loadedDistricts);
      // Only reset if the current district is not valid for the new state
      if (!loadedDistricts.includes(selectedDistrict)) {
        setSelectedDistrict("");
        setBusinessInfo(prev => ({ ...prev, district: "", city: "" })); // Reset district and city in form
      }
      setCities([]);
    } else {
      setDistricts([]);
      if (!selectedState) { // Only reset if state is cleared
        setSelectedDistrict("");
        setBusinessInfo(prev => ({ ...prev, district: "", city: "" }));
        setCities([]);
      }
    }
  }, [selectedState, locaInitialized]);

  // Load cities when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict && locaInitialized) {
      const loadedCities = locaService.getCities(selectedState, selectedDistrict);
      setCities(loadedCities);
      // Only reset if current city is not valid
      if (!loadedCities.includes(selectedCity)) {
        setSelectedCity("");
        setBusinessInfo(prev => ({ ...prev, city: "" }));
      }
    } else {
      setCities([]);
      if (!selectedDistrict) {
        setSelectedCity("");
        setBusinessInfo(prev => ({ ...prev, city: "" }));
      }
    }
  }, [selectedState, selectedDistrict, locaInitialized]);

  // Update form when location state changes
  useEffect(() => {
    setBusinessInfo(prev => ({
      ...prev,
      state: selectedState,
      district: selectedDistrict,
      city: selectedCity
    }));
  }, [selectedState, selectedDistrict, selectedCity]);

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
          status: statusFilter || undefined,
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
  }, [currentPage, searchQuery, roleFilter, monthFilter, statusFilter]);

  const handleSuspendUser = async (user: User) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setSuspendingUserId(user._id);
    try {
      await userService.updateUserStatus(user._id, newStatus);
      // Refresh the user list
      const response = await userService.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        month: monthFilter || undefined,
        status: statusFilter || undefined,
      });
      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.totalUsers);
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setSuspendingUserId(null);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const handlePromoteUser = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    // Pre-fill business info if available
    if (user.businessInfo) {
      setBusinessInfo({
        businessName: user.businessInfo.businessName || "",
        businessType: user.businessInfo.businessType || "",
        businessDescription: user.businessInfo.businessDescription || "",
        experience: user.businessInfo.experience?.toString() || "0",
        licenseNumber: user.businessInfo.licenseNumber || "",
        gstNumber: user.businessInfo.gstNumber || "",
        panNumber: user.businessInfo.panNumber || "",
        website: user.businessInfo.website || "",
        address: user.businessInfo.address || "",
        city: user.businessInfo.city || "",
        district: user.businessInfo.district || "",
        state: user.businessInfo.state || "",
        pincode: user.businessInfo.pincode || "",
      });
      // Set location states if available
      if (user.businessInfo.state) setSelectedState(user.businessInfo.state);
      if (user.businessInfo.district) setSelectedDistrict(user.businessInfo.district);
      if (user.businessInfo.city) setSelectedCity(user.businessInfo.city);
    } else {
      // Reset form
      setBusinessInfo({
        businessName: "",
        businessType: "",
        businessDescription: "",
        experience: "0",
        licenseNumber: "",
        gstNumber: "",
        panNumber: "",
        website: "",
        address: "",
        city: "",
        district: "",
        state: "",
        pincode: "",
      });
      setSelectedState("");
      setSelectedDistrict("");
      setSelectedCity("");
    }
    setIsPromoteDialogOpen(true);
  };

  const handlePromoteSubmit = async () => {
    if (!selectedUser || !selectedRole) return;

    // Validation for agent/vendor role
    const isVendorRole = selectedRole.toLowerCase() === 'agent' || selectedRole.toLowerCase() === 'vendor';
    let finalBusinessInfo = null;

    if (isVendorRole) {
      // Check if we need to collect data
      const needsData = !selectedUser.businessInfo;

      if (needsData) {
        // Validate required fields
        if (!businessInfo.businessName) return alert("Business Name is required");
        if (!businessInfo.businessType) return alert("Business Type is required");
        if (!businessInfo.businessDescription || businessInfo.businessDescription.length < 10) return alert("Description must be at least 10 chars");
        if (!businessInfo.panNumber) return alert("PAN Number is required");
        if (!businessInfo.address) return alert("Address is required");
        if (!businessInfo.city) return alert("City is required");
        if (!businessInfo.district) return alert("District is required");
        if (!businessInfo.state) return alert("State is required");
        if (!businessInfo.pincode) return alert("Pincode is required");

        finalBusinessInfo = {
          ...businessInfo,
          experience: parseInt(businessInfo.experience) || 0
        };
      }
    }

    setPromotingUserId(selectedUser._id);
    try {
      await userService.promoteUser(selectedUser._id, selectedRole, finalBusinessInfo);
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
                      {canManageUserStatus && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size={isMobile ? "sm" : "icon"}
                              className={isMobile ? 'h-6 w-6 p-1' : ''}
                              title={user.status === 'suspended' ? "Activate User" : "Suspend User"}
                            >
                              {user.status === 'suspended' ? (
                                <CheckCircle className={`text-green-600 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              ) : (
                                <Ban className={`text-red-600 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{user.status === 'suspended' ? "Activate User?" : "Suspend User?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.status === 'suspended'
                                  ? "This will restore the user's access to the platform."
                                  : "This will temporarily disable the user's access to the platform. They won't be able to log in."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSuspendUser(user)}
                                disabled={suspendingUserId === user._id}
                                className={user.status === 'suspended' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                              >
                                {suspendingUserId === user._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {user.status === 'suspended' ? "Activate" : "Suspend"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
                      roles
                        .filter(role => role.name.toLowerCase() !== 'superadmin')
                        .map((role) => (
                          <SelectItem key={role._id} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))
                    ) : (
                      <>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="agent">Vendor/Agent</SelectItem>
                        <SelectItem value="subadmin">Sub Admin</SelectItem>
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

              {/* Business Info Form for Agent/Vendor */}
              {(selectedRole.toLowerCase() === 'agent' || selectedRole.toLowerCase() === 'vendor') && !selectedUser.businessInfo && (
                <ScrollArea className="h-[300px] pr-4 border rounded-md p-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Business Information Required</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Business Name *</Label>
                        <Input
                          value={businessInfo.businessName}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                          placeholder="Enter business name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Business Type *</Label>
                        <Select
                          value={businessInfo.businessType}
                          onValueChange={(val) => setBusinessInfo({ ...businessInfo, businessType: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                            <SelectItem value="property_developer">Property Developer</SelectItem>
                            <SelectItem value="construction_company">Construction Company</SelectItem>
                            <SelectItem value="interior_designer">Interior Designer</SelectItem>
                            <SelectItem value="legal_services">Legal Services</SelectItem>
                            <SelectItem value="home_loan_provider">Home Loan Provider</SelectItem>
                            <SelectItem value="packers_movers">Packers & Movers</SelectItem>
                            <SelectItem value="property_management">Property Management</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description * (min 10 chars)</Label>
                      <Textarea
                        value={businessInfo.businessDescription}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, businessDescription: e.target.value })}
                        placeholder="Describe your business..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Experience (Years)</Label>
                        <Input
                          type="number"
                          value={businessInfo.experience}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, experience: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PAN Number *</Label>
                        <Input
                          value={businessInfo.panNumber}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, panNumber: e.target.value.toUpperCase() })}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>GST Number</Label>
                        <Input
                          value={businessInfo.gstNumber}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, gstNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>License Number</Label>
                        <Input
                          value={businessInfo.licenseNumber}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, licenseNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={businessInfo.website}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Address *</Label>
                      <Input
                        value={businessInfo.address}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>State *</Label>
                        <Select
                          value={selectedState}
                          onValueChange={(value) => {
                            setSelectedState(value);
                            setSelectedDistrict("");
                            setSelectedCity("");
                            setBusinessInfo(prev => ({ ...prev, state: value, district: "", city: "" }));
                          }}
                          disabled={!locaInitialized}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={locaInitialized ? "Select state" : "Loading..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>District *</Label>
                        <Select
                          value={selectedDistrict}
                          onValueChange={(value) => {
                            setSelectedDistrict(value);
                            setSelectedCity("");
                            setBusinessInfo(prev => ({ ...prev, district: value, city: "" }));
                          }}
                          disabled={!selectedState || districts.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedState ? "Select district" : "Select state first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((district) => (
                              <SelectItem key={district} value={district}>
                                {district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Select
                          value={selectedCity}
                          onValueChange={(value) => {
                            setSelectedCity(value);
                            setBusinessInfo(prev => ({ ...prev, city: value }));
                          }}
                          disabled={!selectedDistrict || cities.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedDistrict ? "Select city" : "Select district first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Pincode *</Label>
                        <PincodeAutocomplete
                          value={businessInfo.pincode}
                          onChange={(value, locationData) => {
                            setBusinessInfo(prev => ({ ...prev, pincode: value }));

                            // Auto-fill logic
                            if (locationData) {
                              const stateValue = locationData.state;
                              // Find exact case match for state
                              const matchingState = states.find(s => s.toUpperCase() === stateValue.toUpperCase());

                              if (matchingState) {
                                setSelectedState(matchingState);

                                // Wait for districts to load
                                setTimeout(() => {
                                  const districtsForState = locaService.getDistricts(matchingState);
                                  const matchingDistrict = districtsForState.find(d => d.toUpperCase() === locationData.district.toUpperCase());

                                  if (matchingDistrict) {
                                    setSelectedDistrict(matchingDistrict);

                                    // Wait for cities to load
                                    setTimeout(() => {
                                      if (locationData.city) {
                                        const citiesForDistrict = locaService.getCities(matchingState, matchingDistrict);
                                        const matchingCity = citiesForDistrict.find(c => c.toUpperCase() === locationData.city.toUpperCase());

                                        if (matchingCity) {
                                          setSelectedCity(matchingCity);
                                          setBusinessInfo(prev => ({
                                            ...prev,
                                            state: matchingState,
                                            district: matchingDistrict,
                                            city: matchingCity,
                                            pincode: value
                                          }));
                                        }
                                      }
                                    }, 100);
                                  }
                                }, 100);
                              }
                            }
                          }}
                          state={selectedState}
                          district={selectedDistrict}
                          city={selectedCity}
                          placeholder="Enter pincode"
                        />
                        {businessInfo.pincode && businessInfo.pincode.length === 6 && locaService.isReady() && (
                          <div className="text-xs">
                            {locaService.validatePincode(businessInfo.pincode) ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Valid PIN code
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                PIN code not found
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}

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