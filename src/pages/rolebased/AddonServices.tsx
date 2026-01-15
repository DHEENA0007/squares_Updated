import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Eye, Search, Calendar, User, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Helper functions
const formatPrice = (price: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price);
};

const getAddonCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    photography: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    videography: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'virtual_tour': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'drone_photography': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'floor_plan': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    staging: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    inspection: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[category] || colors.other;
};

interface AddonService {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingType: string;
  category: string;
  icon?: string;
}

interface Schedule {
  _id: string;
  addon: {
    _id: string;
    name: string;
    category: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  completedDate?: string;
  completedAt?: string;
  inProgressAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  emailSubject: string;
  emailMessage: string;
  vendorResponse?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledBy: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  notes: Array<{
    message: string;
    author: {
      _id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface VendorAddon {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  totalAddons: number;
  activeAddons: AddonService[];
  subscriptions: Array<{
    _id: string;
    status: string;
    startDate: string;
    endDate: string;
    addons: AddonService[];
  }>;
  schedules?: Schedule[];
}

const AddonServices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = user?.rolePermissions || [];
  const { toast } = useToast();

  // Check if user has admin role
  const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin';

  // Permission checks
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canViewAddonServices = hasAdminRole || hasPermission(PERMISSIONS.ADDON_SERVICES_READ);
  const canScheduleServices = hasAdminRole || hasPermission(PERMISSIONS.ADDON_SERVICES_SCHEDULE);
  const canManageSchedules = hasAdminRole || hasPermission(PERMISSIONS.ADDON_SERVICES_MANAGE);
  const canUpdateStatus = hasAdminRole || hasPermission(PERMISSIONS.ADDON_SERVICES_STATUS);
  const canAddNotes = hasAdminRole || hasPermission(PERMISSIONS.ADDON_SERVICES_NOTES);

  const [vendorAddons, setVendorAddons] = useState<VendorAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedVendor, setSelectedVendor] = useState<VendorAddon | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AddonService | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [scheduledServiceDate, setScheduledServiceDate] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [vendorResponse, setVendorResponse] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [newNote, setNewNote] = useState<string>("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({
    activeVendors: 0,
    totalAddons: 0,
    totalSchedules: 0,
    completedSchedules: 0,
    inProgressSchedules: 0,
    scheduledSchedules: 0,
    categories: 0
  });

  useEffect(() => {
    if (!canViewAddonServices) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view addon services.",
        variant: "destructive",
      });
      navigate('/rolebased');
      return;
    }
    fetchVendorAddons();
    fetchStats();
  }, [activeTab, searchTerm, currentPage]);

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const fetchVendorAddons = async () => {
    if (!canViewAddonServices) return;
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/addon-services?status=${activeTab}&search=${searchTerm}&page=${currentPage}&limit=${itemsPerPage}`);
      const data = await handleApiResponse<{ data: { vendorAddons: VendorAddon[], total: number, totalPages: number } }>(response);
      setVendorAddons(data.data.vendorAddons || []);
      setTotalPages(data.data.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching addon services:', error);
      toast({
        title: "Error",
        description: error.message || "Error fetching addon services",
        variant: "destructive",
      });
      setVendorAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth(`/subadmin/addon-services/stats?status=${activeTab}`);
      const data = await handleApiResponse<{ data: any }>(response);
      setStats(data.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleScheduleService = async (addon: AddonService) => {
    if (!canScheduleServices) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to schedule services.",
        variant: "destructive",
      });
      return;
    }
    setSelectedAddon(addon);
    setPriority('medium');
    setScheduledServiceDate(""); // Reset date
    setEmailSubject(`Schedule ${addon.name} Service`);
    setEmailMessage(`Dear Vendor,\n\nWe would like to schedule the ${addon.name} service that you have purchased.\n\nPlease confirm the scheduled date and time for the service.\n\nService Details:\n- Name: ${addon.name}\n- Description: ${addon.description}\n- Category: ${addon.category.charAt(0).toUpperCase() + addon.category.slice(1)}\n\nThank you!\n\nBest regards,\nAdmin Team`);
    setScheduleDialogOpen(true);
  };

  const sendSchedulingEmail = async () => {
    if (!selectedVendor || !selectedAddon) return;

    if (!scheduledServiceDate) {
      toast({
        title: "Error",
        description: "Please select a scheduled date for the service",
        variant: "destructive",
      });
      return;
    }

    // Get the subscription ID from the vendor's subscriptions
    const subscription = selectedVendor.subscriptions.find(sub =>
      sub.addons.some(a => a._id === selectedAddon._id)
    );

    if (!subscription) {
      toast({
        title: "Error",
        description: "No subscription found for this addon",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, email: true });
      const response = await fetchWithAuth('/subadmin/addon-services/schedule', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: selectedVendor.user._id,
          addonId: selectedAddon._id,
          subscriptionId: subscription._id,
          subject: emailSubject,
          message: emailMessage,
          vendorEmail: selectedVendor.user.email,
          priority,
          scheduledDate: scheduledServiceDate
        })
      });

      const data = await handleApiResponse(response);
      toast({
        title: "Success",
        description: "Service scheduled successfully and email sent to vendor",
      });
      setScheduleDialogOpen(false);
      setSelectedAddon(null);
      setScheduledServiceDate("");
      fetchVendorAddons(); // Refresh to show new schedule
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule service",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, email: false });
    }
  };

  const handleUpdateScheduleStatus = async () => {
    if (!canManageSchedules) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update schedule status.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedSchedule) return;

    // Validate cancellation reason if status is cancelled
    if (scheduleStatus === 'cancelled' && !cancellationReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a cancellation reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading({ ...actionLoading, status: true });
      const response = await fetchWithAuth(`/subadmin/addon-services/schedule/${selectedSchedule._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: scheduleStatus,
          scheduledDate: scheduleDate || undefined,
          vendorResponse: vendorResponse || undefined,
          cancellationReason: scheduleStatus === 'cancelled' ? cancellationReason : undefined
        })
      });

      await handleApiResponse(response);
      toast({
        title: "Success",
        description: scheduleStatus === 'cancelled'
          ? "Service cancelled successfully"
          : scheduleStatus === 'completed'
            ? "Service marked as completed"
            : "Schedule status updated successfully",
      });
      setStatusDialogOpen(false);
      setSelectedSchedule(null);
      setCancellationReason("");
      fetchVendorAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule status",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, status: false });
    }
  };

  const handleAddNote = async () => {
    if (!canManageSchedules) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add notes.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedSchedule || !newNote.trim()) return;

    try {
      setActionLoading({ ...actionLoading, note: true });
      const response = await fetchWithAuth(`/subadmin/addon-services/schedule/${selectedSchedule._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          message: newNote
        })
      });

      const data = await handleApiResponse<{ data: { schedule: Schedule } }>(response);
      toast({
        title: "Success",
        description: "Note added successfully",
      });
      setNewNote("");

      // Update the selected schedule with the new data
      if (data.data?.schedule) {
        setSelectedSchedule(data.data.schedule);
      }

      fetchVendorAddons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, note: false });
    }
  };

  const openStatusDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setScheduleStatus(schedule.status);
    setScheduleDate(schedule.scheduledDate ? new Date(schedule.scheduledDate).toISOString().slice(0, 16) : "");
    setVendorResponse(schedule.vendorResponse || "");
    setCancellationReason(schedule.cancellationReason || "");
    setStatusDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const handleViewDetails = (vendor: VendorAddon) => {
    setSelectedVendor(vendor);
    setSheetOpen(true);
  };

  if (loading && vendorAddons.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Addon Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor addon services and schedule appointments
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Addon Services</h1>
          <p className="text-muted-foreground mt-1">
            View vendors who have purchased addon services and schedule appointments
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeVendors}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Addons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAddons}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSchedules}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedSchedules} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.inProgressSchedules}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.scheduledSchedules} scheduled
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.categories}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Active Addons</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorAddons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorAddons.map((vendor) => (
                    <TableRow key={vendor._id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(vendor)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{vendor.user.profile.firstName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{vendor.user.profile.firstName} {vendor.user.profile.lastName}</span>
                            <span className="text-xs text-muted-foreground md:hidden">{vendor.user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{vendor.user.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {vendor.activeAddons.slice(0, 2).map((addon) => (
                            <Badge key={addon._id} variant="secondary" className="text-xs">
                              {addon.name}
                            </Badge>
                          ))}
                          {vendor.activeAddons.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{vendor.activeAddons.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(vendor.activeAddons.reduce((sum, addon) => sum + addon.price, 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(vendor);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* View Vendor Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Vendor Addon Services</SheetTitle>
            <SheetDescription>
              Detailed information about vendor's purchased addon services
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            {selectedVendor && (
              <div className="space-y-8">
                {/* Vendor Info */}
                <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">{selectedVendor.user.profile.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedVendor.user.profile.firstName} {selectedVendor.user.profile.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedVendor.user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedVendor.totalAddons} Addons</Badge>
                      <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                        Total Value: {formatPrice(selectedVendor.activeAddons.reduce((sum, addon) => sum + addon.price, 0))}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Active Addons */}
                <div>
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Active Services</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedVendor.activeAddons.map((addon) => {
                      const existingSchedule = selectedVendor.schedules?.find(
                        schedule => schedule.addon._id === addon._id &&
                          ['scheduled', 'in_progress'].includes(schedule.status)
                      );

                      return (
                        <Card key={addon._id} className="overflow-hidden border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold">{addon.name}</h5>
                                  <Badge className={getAddonCategoryColor(addon.category)} variant="secondary">
                                    {addon.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                                <p className="font-medium text-primary">{formatPrice(addon.price)}</p>
                              </div>
                              {canScheduleServices && !existingSchedule && (
                                <Button size="sm" onClick={() => handleScheduleService(addon)}>
                                  Schedule Service
                                </Button>
                              )}
                              {existingSchedule && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {existingSchedule.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Schedules */}
                {selectedVendor.schedules && selectedVendor.schedules.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground mb-4">Service History</h4>
                    <div className="space-y-4">
                      {selectedVendor.schedules.map((schedule) => (
                        <div key={schedule._id} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
                          <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background ${schedule.status === 'completed' ? 'bg-green-500' :
                            schedule.status === 'cancelled' ? 'bg-red-500' :
                              schedule.status === 'in_progress' ? 'bg-blue-500' : 'bg-purple-500'
                            }`} />

                          <div className="bg-muted/30 rounded-lg p-4 border">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-medium">{schedule.addon.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getStatusColor(schedule.status)} variant="secondary">
                                    {schedule.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge className={getPriorityColor(schedule.priority)} variant="outline">
                                    {schedule.priority}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {canManageSchedules && (
                                  <Button size="sm" variant="ghost" onClick={() => openStatusDialog(schedule)}>
                                    Manage
                                  </Button>
                                )}
                                {!canManageSchedules && canUpdateStatus && (
                                  <Button size="sm" variant="ghost" onClick={() => openStatusDialog(schedule)}>
                                    Update
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                              {schedule.scheduledDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(schedule.scheduledDate).toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Created: {new Date(schedule.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Notes Section */}
                            {schedule.notes && schedule.notes.length > 0 && (
                              <div className="bg-background rounded p-3 text-sm border">
                                <p className="font-medium text-xs uppercase text-muted-foreground mb-2">Latest Note</p>
                                <p className="mb-1">{schedule.notes[schedule.notes.length - 1].message}</p>
                                <p className="text-xs text-muted-foreground">
                                  — {schedule.notes[schedule.notes.length - 1].author?.profile?.firstName || 'Unknown'}, {new Date(schedule.notes[schedule.notes.length - 1].createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Schedule Service Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Service</DialogTitle>
            <DialogDescription>
              Set a date and time for the {selectedAddon?.name} service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledServiceDate}
                onChange={(e) => setScheduledServiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Tabs value={priority} onValueChange={(v) => setPriority(v as any)}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="low">Low</TabsTrigger>
                  <TabsTrigger value="medium">Med</TabsTrigger>
                  <TabsTrigger value="high">High</TabsTrigger>
                  <TabsTrigger value="urgent">Urg</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Message</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={sendSchedulingEmail} disabled={actionLoading.email}>
              {actionLoading.email ? "Sending..." : "Schedule & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Service Status</DialogTitle>
            <DialogDescription>
              Manage the status of this scheduled service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Tabs value={scheduleStatus} onValueChange={setScheduleStatus}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="scheduled">Sched</TabsTrigger>
                  <TabsTrigger value="in_progress">Active</TabsTrigger>
                  <TabsTrigger value="completed">Done</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancel</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {scheduleStatus === 'cancelled' && (
              <div className="space-y-2">
                <Label>Cancellation Reason</Label>
                <Textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Why is this service being cancelled?"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Add Note</Label>
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this service..."
                />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || actionLoading.note}>
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Close</Button>
            <Button onClick={handleUpdateScheduleStatus} disabled={actionLoading.status}>
              {actionLoading.status ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddonServices;