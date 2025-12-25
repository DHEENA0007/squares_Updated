import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Eye, Search, Calendar, Mail, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [vendorAddons, setVendorAddons] = useState<VendorAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedVendor, setSelectedVendor] = useState<VendorAddon | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
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
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorAddons();
  }, [activeTab, searchTerm]);

  const fetchVendorAddons = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/subadmin/addon-services?status=${activeTab}&search=${searchTerm}`);
      const data = await handleApiResponse<{ data: { vendorAddons: VendorAddon[] } }>(response);
      setVendorAddons(data.data.vendorAddons || []);
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

  const handleScheduleService = async (addon: AddonService) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Addon Services</h1>
          <p className="text-muted-foreground mt-1">
            View vendors who have purchased addon services and schedule appointments
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorAddons.filter(v => v.totalAddons > 0).length}
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
              {vendorAddons.reduce((sum, v) => sum + v.totalAddons, 0)}
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
              {vendorAddons.reduce((sum, v) => sum + (v.schedules?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vendorAddons.reduce((sum, v) => sum + (v.schedules?.filter(s => s.status === 'completed').length || 0), 0)} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorAddons.reduce((sum, v) => sum + (v.schedules?.filter(s => s.status === 'in_progress').length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vendorAddons.reduce((sum, v) => sum + (v.schedules?.filter(s => s.status === 'scheduled').length || 0), 0)} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(vendorAddons.flatMap(v => v.activeAddons.map(a => a.category))).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Active Addons</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorAddons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground mb-2" />
                        <p>No addon services found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorAddons.map((vendor) => (
                    <TableRow key={vendor._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {vendor.user.profile.firstName} {vendor.user.profile.lastName}
                          </span>
                          <Badge variant="outline" className="w-fit mt-1">
                            {vendor.totalAddons} Addon{vendor.totalAddons !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {vendor.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vendor.activeAddons.slice(0, 2).map((addon) => (
                            <Badge
                              key={addon._id}
                              className={getAddonCategoryColor(addon.category)}
                              variant="secondary"
                            >
                              {addon.name}
                            </Badge>
                          ))}
                          {vendor.activeAddons.length > 2 && (
                            <Badge variant="outline">
                              +{vendor.activeAddons.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-primary">
                          {formatPrice(vendor.activeAddons.reduce((sum, addon) => sum + addon.price, 0))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.schedules && vendor.schedules.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {vendor.schedules.slice(0, 1).map(s => (
                              <Badge key={s._id} className={getStatusColor(s.status)} variant="outline">
                                {s.status.replace('_', ' ')}
                              </Badge>
                            ))}
                            {vendor.schedules.length > 1 && (
                              <span className="text-xs text-muted-foreground">
                                +{vendor.schedules.length - 1} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Vendor Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Addon Services</DialogTitle>
            <DialogDescription>
              Detailed information about vendor's purchased addon services
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Vendor Information</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">
                    {selectedVendor.user.profile.firstName} {selectedVendor.user.profile.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedVendor.user.email}</p>
                  <p className="text-sm mt-2">
                    <strong>Total Addons:</strong> {selectedVendor.totalAddons}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Active Addon Services</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedVendor.activeAddons.map((addon) => {
                    // Check if this addon is scheduled
                    const existingSchedule = selectedVendor.schedules?.find(
                      schedule => schedule.addon._id === addon._id &&
                        ['scheduled', 'in_progress'].includes(schedule.status)
                    );
                    const isScheduled = !!existingSchedule;

                    // Check if there is an active subscription for this addon
                    const hasActiveSubscription = selectedVendor.subscriptions.some(sub =>
                      sub.addons.some(a => a._id === addon._id) &&
                      sub.status === 'active' &&
                      new Date(sub.endDate) > new Date()
                    );

                    return (
                      <Card key={addon._id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm">{addon.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getAddonCategoryColor(addon.category)}>
                                  {addon.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {addon.billingType.replace('_', ' ')}
                                </span>
                                {isScheduled && (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Scheduled
                                  </Badge>
                                )}
                                {!hasActiveSubscription && (
                                  <Badge variant="destructive" className="text-[10px] h-5">
                                    Expired
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">
                                {formatPrice(addon.price, addon.currency)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground mb-3">
                            {addon.description}
                          </p>
                          {isScheduled ? (
                            hasActiveSubscription ? (
                              <Button
                                size="sm"
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => {
                                  setViewDialogOpen(false);
                                  handleScheduleService(addon);
                                }}
                              >
                                <Calendar className="h-3 w-3 mr-2" />
                                Re-schedule Service
                              </Button>
                            ) : (
                              <div className="w-full py-2 text-center text-sm text-muted-foreground bg-muted rounded-md border border-border">
                                Service Scheduled (Expired)
                              </div>
                            )
                          ) : hasActiveSubscription ? (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setViewDialogOpen(false);
                                handleScheduleService(addon);
                              }}
                            >
                              <Calendar className="h-3 w-3 mr-2" />
                              Schedule This Service
                            </Button>
                          ) : (
                            <div className="w-full py-2 text-center text-sm text-muted-foreground bg-muted rounded-md border border-border">
                              Subscription Expired
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Service Schedules */}
              {selectedVendor.schedules && selectedVendor.schedules.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-4">Service Schedules ({selectedVendor.schedules.length})</h4>
                  <div className="space-y-3">
                    {selectedVendor.schedules.map((schedule) => (
                      <Card key={schedule._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{schedule.addon.name}</span>
                                <Badge className={getStatusColor(schedule.status)}>
                                  {schedule.status.replace('_', ' ')}
                                </Badge>
                                <Badge className={getPriorityColor(schedule.priority)} variant="outline">
                                  {schedule.priority}
                                </Badge>
                              </div>

                              {schedule.scheduledDate && (
                                <p className="text-sm text-muted-foreground">
                                  📅 {new Date(schedule.scheduledDate).toLocaleString()}
                                </p>
                              )}

                              <p className="text-xs text-muted-foreground">
                                Created: {new Date(schedule.createdAt).toLocaleDateString()}
                              </p>

                              {schedule.notes && schedule.notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium">Latest Note:</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {schedule.notes[schedule.notes.length - 1].message.substring(0, 100)}
                                    {schedule.notes[schedule.notes.length - 1].message.length > 100 ? '...' : ''}
                                  </p>
                                </div>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setViewDialogOpen(false);
                                openStatusDialog(schedule);
                              }}
                            >
                              Manage
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedVendor.subscriptions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-4">Subscription History</h4>
                  <div className="space-y-2">
                    {selectedVendor.subscriptions.map((subscription) => (
                      <div key={subscription._id} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Status: <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                              {subscription.status}
                            </Badge>
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(subscription.startDate).toLocaleDateString()} - {new Date(subscription.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Service Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Addon Service</DialogTitle>
            <DialogDescription>
              Send a scheduling email to the vendor for their purchased addon service
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && selectedAddon && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">
                  Vendor: {selectedVendor.user.profile.firstName} {selectedVendor.user.profile.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{selectedVendor.user.email}</p>
                <p className="text-sm mt-1">
                  <strong>Service:</strong> {selectedAddon.name}
                </p>
              </div>

              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="scheduledDate">Scheduled Service Date & Time *</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={scheduledServiceDate}
                  onChange={(e) => setScheduledServiceDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select when this service will be performed
                </p>
              </div>

              <div>
                <Label htmlFor="message">Email Message</Label>
                <Textarea
                  id="message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Enter email message"
                  rows={8}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendSchedulingEmail}
              disabled={actionLoading.email || !emailSubject || !emailMessage || !scheduledServiceDate}
            >
              {actionLoading.email ? "Scheduling..." : "Schedule & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Service Schedule</DialogTitle>
            <DialogDescription>
              Update status, add notes, and track service progress
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-6">
              {/* Schedule Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-lg">{selectedSchedule.addon.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedSchedule.status)}>
                      {selectedSchedule.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(selectedSchedule.priority)}>
                      {selectedSchedule.priority}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Scheduled by: {selectedSchedule.scheduledBy.profile.firstName} {selectedSchedule.scheduledBy.profile.lastName} ({selectedSchedule.scheduledBy.email})
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(selectedSchedule.createdAt).toLocaleString()}
                </p>
                {selectedSchedule.scheduledDate && (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    🗓️ Service Date: {new Date(selectedSchedule.scheduledDate).toLocaleString()}
                  </p>
                )}
                {selectedSchedule.inProgressAt && (
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    🔄 Started: {new Date(selectedSchedule.inProgressAt).toLocaleString()}
                  </p>
                )}
                {selectedSchedule.completedAt && (
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    ✓ Completed: {new Date(selectedSchedule.completedAt).toLocaleString()}
                  </p>
                )}
                {selectedSchedule.cancelledAt && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      ✗ Cancelled: {new Date(selectedSchedule.cancelledAt).toLocaleString()}
                    </p>
                    {selectedSchedule.cancellationReason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-950 rounded">
                        Reason: {selectedSchedule.cancellationReason}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 p-2 bg-amber-50 dark:bg-amber-950 rounded">
                  ⚠️ Status updates will automatically send email notifications to the vendor
                </p>
              </div>

              {/* Original Email */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Original Email</h4>
                <div className="bg-muted/50 p-3 rounded-md space-y-2 border">
                  <p className="font-medium text-sm">{selectedSchedule.emailSubject}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedSchedule.emailMessage}
                  </p>
                </div>
              </div>

              {/* Status Update Section */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Update Status</h4>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={scheduleStatus}
                    onChange={(e) => setScheduleStatus(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    disabled={selectedSchedule?.status === 'completed' || selectedSchedule?.status === 'cancelled'}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {(selectedSchedule?.status === 'completed' || selectedSchedule?.status === 'cancelled') && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Cannot change status from {selectedSchedule.status}
                    </p>
                  )}
                  {selectedSchedule?.scheduledDate && (scheduleStatus === 'in_progress' || scheduleStatus === 'completed') && (
                    new Date(selectedSchedule.scheduledDate) > new Date() ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 p-2 bg-red-50 dark:bg-red-950 rounded">
                        ⚠️ Cannot mark as "{scheduleStatus.replace('_', ' ')}" before scheduled date ({new Date(selectedSchedule.scheduledDate).toLocaleString()})
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Service date has passed, can proceed
                      </p>
                    )
                  )}
                </div>

                {scheduleStatus === 'cancelled' && (
                  <div>
                    <Label htmlFor="cancellationReason">Cancellation Reason *</Label>
                    <Textarea
                      id="cancellationReason"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Please provide the reason for cancellation..."
                      rows={3}
                      required
                      className="border-red-300 focus:border-red-500"
                    />
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      * Cancellation reason is required. Email will be sent to vendor.
                    </p>
                  </div>
                )}

                {scheduleStatus === 'in_progress' && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      🔄 "In Progress" timestamp will be automatically recorded and vendor will be notified via email
                    </p>
                    {selectedSchedule?.inProgressAt && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Started on: {new Date(selectedSchedule.inProgressAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {scheduleStatus === 'completed' && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Completion date will be automatically set and vendor will receive completion email
                    </p>
                    {selectedSchedule?.completedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Completed on: {new Date(selectedSchedule.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {scheduleStatus !== 'completed' && scheduleStatus !== 'cancelled' && (
                  <>
                    <div>
                      <Label htmlFor="scheduledDate">
                        {scheduleStatus === 'in_progress' ? 'In Progress Since' : 'Scheduled Date & Time'}
                      </Label>
                      <Input
                        id="scheduledDate"
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedSchedule?.scheduledDate
                          ? `Current: ${new Date(selectedSchedule.scheduledDate).toLocaleString()}`
                          : 'Not set'
                        }
                      </p>
                      {scheduleDate && scheduleDate !== new Date(selectedSchedule?.scheduledDate || '').toISOString().slice(0, 16) && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 p-2 bg-orange-50 dark:bg-orange-950 rounded">
                          📧 Re-scheduling email will be sent to vendor with new date
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vendorResponse">Vendor Response/Notes</Label>
                      <Textarea
                        id="vendorResponse"
                        value={vendorResponse}
                        onChange={(e) => setVendorResponse(e.target.value)}
                        placeholder="Enter vendor response or status update notes..."
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleUpdateScheduleStatus}
                  disabled={
                    actionLoading.status ||
                    selectedSchedule?.status === 'completed' ||
                    selectedSchedule?.status === 'cancelled' ||
                    (scheduleStatus === 'cancelled' && !cancellationReason.trim())
                  }
                  className="w-full"
                >
                  {actionLoading.status ? "Updating..." : "Update Status & Send Email"}
                </Button>
              </div>

              {/* Notes Section */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold">Communication Notes</h4>

                {/* Existing Notes */}
                {selectedSchedule.notes && selectedSchedule.notes.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Previous notes:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedSchedule.notes.map((note, idx) => (
                        <div key={idx} className="bg-muted/50 p-3 rounded-md border text-sm">
                          <p className="whitespace-pre-wrap">{note.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            - {note.author.profile.firstName} {note.author.profile.lastName} on {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Note */}
                <div className="space-y-2">
                  <Label htmlFor="newNote">Add New Note</Label>
                  <Textarea
                    id="newNote"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a communication note or update..."
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={actionLoading.note || !newNote.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading.note ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddonServices;