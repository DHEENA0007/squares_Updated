import { useState, useEffect } from "react";
import { Loader2, Eye, XCircle, RefreshCw, Calendar, CreditCard, User, Package, Star, Camera, Megaphone, Laptop, HeadphonesIcon, Users, Circle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import subscriptionService, { Subscription } from "@/services/subscriptionService";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const getAddonIcon = (category: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (category?.toLowerCase()) {
      case 'photography':
        return <Camera {...iconProps} />;
      case 'marketing':
        return <Megaphone {...iconProps} />;
      case 'technology':
        return <Laptop {...iconProps} />;
      case 'support':
        return <HeadphonesIcon {...iconProps} />;
      case 'crm':
        return <Users {...iconProps} />;
      default:
        return <Package {...iconProps} />;
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      };

      const response = await subscriptionService.getSubscriptions(filters);
      console.log('Admin Clients - API Response:', response.data.subscriptions);
      // Debug: Log payment history for subscriptions that have it
      response.data.subscriptions.forEach((sub, index) => {
        if (sub.paymentHistory && sub.paymentHistory.length > 0) {
          console.log(`Subscription ${index} Payment History:`, sub.paymentHistory);
        }
      });
      setSubscriptions(response.data.subscriptions);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Admin access required')) {
          toast({
            title: "Access Denied",
            description: "Admin privileges required to view subscriptions.",
            variant: "destructive",
          });
        } else if (error.message.includes('Authentication required')) {
          toast({
            title: "Authentication Required",
            description: "Please log in to continue.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load subscriptions. Please try again.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
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

  const handleExportExcel = () => {
    toast({
      title: "Exporting to Excel",
      description: "Your data is being exported to Excel format.",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exporting to PDF",
      description: "Your data is being exported to PDF format.",
    });
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsDialogOpen(true);
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    if (subscription.status !== 'active') {
      toast({
        title: "Cannot Cancel",
        description: "Only active subscriptions can be cancelled.",
        variant: "destructive",
      });
      return;
    }

    try {
      await subscriptionService.cancelSubscription(subscription._id);
      toast({
        title: "Subscription Cancelled",
        description: `${subscription.user.name}'s subscription has been cancelled.`,
      });
      fetchSubscriptions(); // Refresh the data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRenewSubscription = async (subscription: Subscription) => {
    if (subscription.status === 'active') {
      toast({
        title: "Cannot Renew",
        description: "Subscription is already active.",
        variant: "destructive",
      });
      return;
    }

    try {
      await subscriptionService.renewSubscription(subscription._id);
      toast({
        title: "Subscription Renewed",
        description: `${subscription.user.name}'s subscription has been renewed.`,
      });
      fetchSubscriptions(); // Refresh the data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to renew subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading clients...</span>
      </div>
    );
  }

  return (
      <div className="space-y-6 relative top-[60px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscribed Clients</h1>
            <p className="text-muted-foreground mt-2">
              Manage client subscriptions and details
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" />
              <span className="ml-2">Export Excel</span>
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="w-4 h-4" />
              <span className="ml-2">Export PDF</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
            <CardDescription>
              {subscriptions.length} client{subscriptions.length !== 1 ? "s" : ""} found
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
                { label: "Expired", value: "expired" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              filterPlaceholder="Filter by status"
            />

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Plan</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">End Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((subscription) => (
                      <TableRow key={subscription._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.user.name}</div>
                            <div className="text-sm text-muted-foreground">{subscription.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.plan?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{subscription.plan?.billingPeriod || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{subscriptionService.formatAmount(subscription)}</span>
                        </TableCell>
                        <TableCell>
                          {new Date(subscription.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(subscription.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "default"
                                : subscription.status === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {subscriptionService.formatSubscriptionStatus(subscription.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(subscription)}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="ml-2">View</span>
                            </Button>
                            
                            {subscription.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelSubscription(subscription)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4" />
                                <span className="ml-2">Cancel</span>
                              </Button>
                            )}
                            
                            {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRenewSubscription(subscription)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <RefreshCw className="w-4 h-4" />
                                <span className="ml-2">Renew</span>
                              </Button>
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

        {/* Subscription Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
              <DialogDescription>
                Complete information about {selectedSubscription?.user.name}'s subscription
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubscription && (
              <div className="space-y-6">
                {/* Client Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-base">{selectedSubscription.user.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base">{selectedSubscription.user.email}</p>
                      </div>
                      {selectedSubscription.user.phone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Phone</p>
                          <p className="text-base">{selectedSubscription.user.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">User ID</p>
                        <p className="text-sm font-mono">{selectedSubscription.user._id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Plan Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan Name</p>
                        <p className="text-base font-semibold">{selectedSubscription.plan?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-base">{selectedSubscription.plan?.description || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan Price</p>
                        <p className="text-base font-semibold">
                          {selectedSubscription.plan?.price 
                            ? subscriptionService.formatAmount({
                                ...selectedSubscription,
                                amount: selectedSubscription.plan.price
                              })
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
                        <p className="text-base">{selectedSubscription.plan?.billingPeriod || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan ID</p>
                        <p className="text-sm font-mono">{selectedSubscription.plan?._id || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Purchased Addons */}
                {selectedSubscription.addons && selectedSubscription.addons.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Purchased Addons ({selectedSubscription.addons.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-4">
                        {selectedSubscription.addons.map((addon, index) => (
                          <div 
                            key={addon._id || index}
                            className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30"
                          >
                            <div className="p-2 rounded-lg bg-background border">
                              {getAddonIcon(addon.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-base text-foreground">
                                    {addon.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {addon.description}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {addon.category}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {addon.billingType?.replace('_', ' ') || 'N/A'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-lg text-foreground">
                                    {addon.price 
                                      ? `${addon.currency === 'INR' ? '₹' : '$'}${addon.price}`
                                      : 'Free'
                                    }
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {addon.billingType === 'monthly' ? '/month' :
                                     addon.billingType === 'yearly' ? '/year' :
                                     addon.billingType === 'per_property' ? '/property' :
                                     addon.billingType === 'one_time' ? 'one-time' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Addons Summary */}
                      <div className="mt-4 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-900">Total Addons</p>
                            <p className="text-sm text-blue-700">
                              {selectedSubscription.addons.length} addon{selectedSubscription.addons.length !== 1 ? 's' : ''} purchased
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-900">
                              {selectedSubscription.addons
                                .reduce((total, addon) => total + (addon.price || 0), 0) > 0
                                ? `${selectedSubscription.currency === 'INR' ? '₹' : '$'}${selectedSubscription.addons
                                    .reduce((total, addon) => total + (addon.price || 0), 0)}`
                                : 'Free'}
                            </p>
                            <p className="text-xs text-blue-700">addons value</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Subscription Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Subscription Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge
                          variant={
                            selectedSubscription.status === "active"
                              ? "default"
                              : selectedSubscription.status === "expired"
                              ? "destructive"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {subscriptionService.formatSubscriptionStatus(selectedSubscription.status).label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Auto Renew</p>
                        <Badge variant={selectedSubscription.autoRenew ? "default" : "secondary"} className="mt-1">
                          {selectedSubscription.autoRenew ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="text-base">{new Date(selectedSubscription.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">End Date</p>
                        <p className="text-base">{new Date(selectedSubscription.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                        <p className="text-base">
                          {selectedSubscription.status === 'active' 
                            ? `${subscriptionService.getDaysUntilExpiry(selectedSubscription)} days`
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Created At</p>
                        <p className="text-base">{new Date(selectedSubscription.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
                        <p className="text-base font-semibold">{subscriptionService.formatAmount(selectedSubscription)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Currency</p>
                        <p className="text-base">{selectedSubscription.currency}</p>
                      </div>
                      {selectedSubscription.paymentMethod && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                          <p className="text-base capitalize">{selectedSubscription.paymentMethod.replace('_', ' ')}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Subscription ID</p>
                        <p className="text-sm font-mono">{selectedSubscription._id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment History */}
                {selectedSubscription.paymentHistory && selectedSubscription.paymentHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payment History ({selectedSubscription.paymentHistory.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-4">
                        {selectedSubscription.paymentHistory
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((payment, index) => (
                          <div 
                            key={payment._id || index}
                            className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/20"
                          >
                            <div className="p-2 rounded-lg bg-background border">
                              {payment.type === 'addon_purchase' ? (
                                <Star className="w-4 h-4 text-orange-600" />
                              ) : payment.type === 'subscription_purchase' ? (
                                <Package className="w-4 h-4 text-blue-600" />
                              ) : payment.type === 'renewal' ? (
                                <RefreshCw className="w-4 h-4 text-green-600" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-base text-foreground">
                                    {payment.type === 'addon_purchase' 
                                      ? `Addon Purchase (${payment.addons?.length || 0} addon${(payment.addons?.length || 0) !== 1 ? 's' : ''})`
                                      : payment.type === 'subscription_purchase'
                                      ? 'Subscription Purchase'
                                      : payment.type === 'renewal'
                                      ? 'Subscription Renewal'
                                      : 'Subscription Upgrade'
                                    }
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(payment.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  
                                  {/* Show addon details for addon purchases */}
                                  {payment.type === 'addon_purchase' && payment.addons && payment.addons.length > 0 && (
                                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                      <p className="text-xs font-medium text-orange-800 mb-1">Purchased Addons:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {payment.addons.map((addonId, idx) => {
                                          // Try to find the addon details from the main subscription addons
                                          const addonDetails = selectedSubscription.addons?.find(
                                            addon => addon._id === addonId || addon._id === addonId.toString()
                                          );
                                          return (
                                            <Badge key={idx} variant="outline" className="text-xs text-orange-700">
                                              {addonDetails?.name || `Addon ${idx + 1}`}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge 
                                      variant={payment.type === 'addon_purchase' ? "default" : "secondary"} 
                                      className="capitalize text-xs"
                                    >
                                      {payment.type.replace('_', ' ')}
                                    </Badge>
                                    {payment.transactionId && (
                                      <p className="text-xs text-muted-foreground font-mono">
                                        ID: {payment.transactionId}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-lg text-foreground">
                                    {selectedSubscription.currency === 'INR' ? '₹' : '$'}{payment.amount}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {payment.paymentMethod?.replace('_', ' ') || 'razorpay'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Payment History Summary */}
                      <div className="mt-4 p-4 bg-green-50/50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">Total Payments</p>
                            <p className="text-sm text-green-700">
                              {selectedSubscription.paymentHistory.length} transaction{selectedSubscription.paymentHistory.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-900">
                              {selectedSubscription.currency === 'INR' ? '₹' : '$'}
                              {selectedSubscription.paymentHistory
                                .reduce((total, payment) => total + (payment.amount || 0), 0)}
                            </p>
                            <p className="text-xs text-green-700">total paid</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSubscription.status === 'active' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            handleCancelSubscription(selectedSubscription);
                            setIsDetailsDialogOpen(false);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Subscription
                        </Button>
                      )}
                      
                      {(selectedSubscription.status === 'expired' || selectedSubscription.status === 'cancelled') && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            handleRenewSubscription(selectedSubscription);
                            setIsDetailsDialogOpen(false);
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Renew Subscription
                        </Button>
                      )}
                      
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
      </div>
  );
};

export default Clients;
