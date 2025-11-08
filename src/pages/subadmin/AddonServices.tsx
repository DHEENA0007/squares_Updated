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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

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
}

const AddonServices = () => {
  const [vendorAddons, setVendorAddons] = useState<VendorAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedVendor, setSelectedVendor] = useState<VendorAddon | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AddonService | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorAddons();
  }, [activeTab, searchTerm]);

  const fetchVendorAddons = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/subadmin/addon-services?status=${activeTab}&search=${searchTerm}`);
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
    setEmailSubject(`Schedule ${addon.name} Service`);
    setEmailMessage(`Dear Vendor,\n\nWe would like to schedule the ${addon.name} service that you have purchased.\n\nPlease reply to this email with your preferred dates and times for the service.\n\nService Details:\n- Name: ${addon.name}\n- Description: ${addon.description}\n- Category: ${addon.category.charAt(0).toUpperCase() + addon.category.slice(1)}\n\nThank you!\n\nBest regards,\nAdmin Team`);
    setScheduleDialogOpen(true);
  };

  const sendSchedulingEmail = async () => {
    if (!selectedVendor || !selectedAddon) return;

    try {
      setActionLoading({ ...actionLoading, email: true });
      const response = await fetch('/api/subadmin/addon-services/schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorId: selectedVendor.user._id,
          addonId: selectedAddon._id,
          subject: emailSubject,
          message: emailMessage,
          vendorEmail: selectedVendor.user.email
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Scheduling email sent successfully",
        });
        setScheduleDialogOpen(false);
        setSelectedAddon(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to send scheduling email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send scheduling email",
        variant: "destructive",
      });
    } finally {
      setActionLoading({ ...actionLoading, email: false });
    }
  };

  const getAddonCategoryColor = (category: string) => {
    switch (category) {
      case 'photography':
        return 'bg-blue-600';
      case 'marketing':
        return 'bg-green-600';
      case 'technology':
        return 'bg-purple-600';
      case 'support':
        return 'bg-orange-600';
      case 'crm':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatPrice = (price: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Unique Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(vendorAddons.flatMap(v => v.activeAddons.map(a => a._id))).size}
            </div>
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
          {vendorAddons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Addon Services Found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'active' 
                    ? 'No vendors with active addon subscriptions'
                    : `No vendors with ${activeTab} addon subscriptions`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            vendorAddons.map((vendor) => (
              <Card key={vendor._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {vendor.user.profile.firstName} {vendor.user.profile.lastName}
                        </CardTitle>
                        <Badge variant="outline">
                          {vendor.totalAddons} Addon{vendor.totalAddons !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-4 text-sm">
                          <span>{vendor.user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {vendor.activeAddons.slice(0, 3).map((addon) => (
                            <Badge 
                              key={addon._id} 
                              className={getAddonCategoryColor(addon.category)}
                            >
                              {addon.name}
                            </Badge>
                          ))}
                          {vendor.activeAddons.length > 3 && (
                            <Badge variant="outline">
                              +{vendor.activeAddons.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-muted-foreground">
                        Total Value
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {formatPrice(vendor.activeAddons.reduce((sum, addon) => sum + addon.price, 0))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        // If only one addon, directly open schedule for it
                        if (vendor.activeAddons.length === 1) {
                          handleScheduleService(vendor.activeAddons[0]);
                        } else {
                          setViewDialogOpen(true);
                        }
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Schedule Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* View Vendor Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
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
                  {selectedVendor.activeAddons.map((addon) => (
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

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
              disabled={actionLoading.email || !emailSubject || !emailMessage}
            >
              {actionLoading.email ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddonServices;