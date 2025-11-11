import { useState, useEffect } from "react";
import { Loader2, Eye, XCircle, RefreshCw, Calendar, CreditCard, User, Package, Star, Camera, Megaphone, Laptop, HeadphonesIcon, Users, Circle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";
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
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Calculate metrics
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired');
      const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

      const totalActiveRevenue = activeSubscriptions.reduce((sum, sub) => {
        const paymentTotal = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        return sum + paymentTotal;
      }, 0);

      const totalRevenueAll = subscriptions.reduce((sum, sub) => {
        const paymentTotal = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        return sum + paymentTotal;
      }, 0);

      const addonRevenue = subscriptions.reduce((sum, sub) => {
        const addonTotal = sub.addons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0;
        return sum + addonTotal;
      }, 0);

      const grandTotalRevenue = totalRevenueAll + addonRevenue;

      // Summary Statistics Sheet
      const summaryData = [
        { 'Metric': 'Total Clients', 'Count / Amount': subscriptions.length },
        { 'Metric': 'Active Subscriptions', 'Count / Amount': activeSubscriptions.length },
        { 'Metric': 'Cancelled Subscriptions', 'Count / Amount': cancelledSubscriptions.length },
        { 'Metric': 'Expired Subscriptions', 'Count / Amount': expiredSubscriptions.length },
        { 'Metric': 'Total Subscriptions', 'Count / Amount': subscriptions.length },
        { 'Metric': 'Total Active Revenue', 'Count / Amount': `₹${totalActiveRevenue.toLocaleString()}` },
        { 'Metric': 'Total Revenue (All)', 'Count / Amount': `₹${totalRevenueAll.toLocaleString()}` },
        { 'Metric': 'Add-on Revenue', 'Count / Amount': `₹${addonRevenue.toLocaleString()}` },
        { 'Metric': 'Grand Total Revenue', 'Count / Amount': `₹${grandTotalRevenue.toLocaleString()}` },
      ];

      // Subscription Details Sheet
      const subscriptionDetails = activeSubscriptions.map((subscription, index) => ({
        '#': index + 1,
        'Client Name': subscription.user.name,
        'Email': subscription.user.email,
        'Plan': subscription.plan?.name || 'N/A',
        'Plan Price': subscription.plan?.price ? `₹${subscription.plan.price}` : 'N/A',
        'Total Amount': subscriptionService.formatAmount(subscription),
        'Status': subscriptionService.formatSubscriptionStatus(subscription.status).label,
        'Start Date': ExportUtils.formatDate(subscription.startDate),
        'End Date': ExportUtils.formatDate(subscription.endDate),
        'Auto Renew': subscription.autoRenew ? 'Yes' : 'No',
        'Add-ons': subscription.addons?.length || 0,
        'Add-on Amount': `₹${subscription.addons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0}`,
      }));

      // Add total row for active subscriptions
      subscriptionDetails.push({
        '#': '',
        'Client Name': 'Total Active Revenue',
        'Email': '',
        'Plan': '',
        'Plan Price': '',
        'Total Amount': `₹${totalActiveRevenue.toLocaleString()}`,
        'Status': '',
        'Start Date': '',
        'End Date': '',
        'Auto Renew': '',
        'Add-ons': '',
        'Add-on Amount': '',
      });

      // Add-on Details Sheet
      const addonDetails = [];
      subscriptions.forEach((subscription) => {
        if (subscription.addons && subscription.addons.length > 0) {
          subscription.addons.forEach((addon) => {
            // Find the latest payment date for this addon
            const latestPayment = subscription.paymentHistory
              ?.filter(payment => payment.type === 'addon_purchase' && payment.addons?.includes(addon._id))
              ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            addonDetails.push({
              '#': addonDetails.length + 1,
              'Client Name': subscription.user.name,
              'Add-on Name': addon.name,
              'Category': addon.category || 'N/A',
              'Price': `₹${addon.price || 0}`,
              'Billing Type': addon.billingType?.replace('_', ' ') || 'N/A',
              'Last Payment Date': latestPayment ? ExportUtils.formatDate(latestPayment.date) : 'N/A',
            });
          });
        }
      });

      // Add total row for addons
      if (addonDetails.length > 0) {
        addonDetails.push({
          '#': '',
          'Client Name': 'Total Add-on Revenue',
          'Add-on Name': '',
          'Category': '',
          'Price': `₹${addonRevenue.toLocaleString()}`,
          'Billing Type': '',
          'Last Payment Date': '',
        });
      }

      // Key Insights Sheet
      const activeClients = activeSubscriptions.length;
      const arpc = activeClients > 0 ? Math.round(totalActiveRevenue / activeClients) : 0;

      // Find highest-grossing plan
      const planRevenue = {};
      activeSubscriptions.forEach(sub => {
        const planName = sub.plan?.name || 'Unknown';
        const revenue = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        planRevenue[planName] = (planRevenue[planName] || 0) + revenue;
      });
      const topPlan = Object.entries(planRevenue).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      // Find most purchased addon
      const addonCount = {};
      subscriptions.forEach(sub => {
        sub.addons?.forEach(addon => {
          addonCount[addon.name] = (addonCount[addon.name] || 0) + 1;
        });
      });
      const topAddon = Object.entries(addonCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const insightsData = [
        { 'Insight': 'Total Active Clients', 'Value': activeClients },
        { 'Insight': 'Average Revenue per Active Client (ARPC)', 'Value': `₹${arpc.toLocaleString()}` },
        { 'Insight': 'Highest-Grossing Plan', 'Value': topPlan },
        { 'Insight': 'Most Purchased Add-on', 'Value': topAddon },
        { 'Insight': 'Total Monthly Recurring Revenue (MRR)', 'Value': `₹${totalActiveRevenue.toLocaleString()}` },
      ];

      const config = {
        filename: 'subscribed_clients_revenue_report',
        title: 'Subscribed Clients Revenue Report',
        metadata: {
          'Generated on': currentDate,
          'Report Period': 'All Time',
          'Prepared by': 'Admin System',
        }
      };

      const sheets = [
        {
          name: 'Summary Statistics',
          data: summaryData,
          columns: [{ wch: 30 }, { wch: 20 }]
        },
        {
          name: 'Subscription Details',
          data: subscriptionDetails,
          columns: [
            { wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
          ]
        },
        {
          name: 'Add-on Details',
          data: addonDetails,
          columns: [
            { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
            { wch: 20 }, { wch: 15 }
          ]
        },
        {
          name: 'Key Insights',
          data: insightsData,
          columns: [{ wch: 35 }, { wch: 25 }]
        }
      ];

      ExportUtils.generateExcelReport(config, sheets);

      toast({
        title: "Export Successful",
        description: "Comprehensive revenue report has been generated successfully",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Calculate metrics
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired');
      const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

      const totalActiveRevenue = activeSubscriptions.reduce((sum, sub) => {
        const paymentTotal = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        return sum + paymentTotal;
      }, 0);

      const totalRevenueAll = subscriptions.reduce((sum, sub) => {
        const paymentTotal = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        return sum + paymentTotal;
      }, 0);

      const addonRevenue = subscriptions.reduce((sum, sub) => {
        const addonTotal = sub.addons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0;
        return sum + addonTotal;
      }, 0);

      const grandTotalRevenue = totalRevenueAll + addonRevenue;

      // Summary Statistics Table
      const summaryTable = {
        head: [['Metric', 'Count / Amount']],
        body: [
          ['Total Clients', subscriptions.length.toString()],
          ['Active Subscriptions', activeSubscriptions.length.toString()],
          ['Cancelled Subscriptions', cancelledSubscriptions.length.toString()],
          ['Expired Subscriptions', expiredSubscriptions.length.toString()],
          ['Total Subscriptions', subscriptions.length.toString()],
          ['Total Active Revenue', `₹${totalActiveRevenue.toLocaleString()}`],
          ['Total Revenue (All)', `₹${totalRevenueAll.toLocaleString()}`],
          ['Add-on Revenue', `₹${addonRevenue.toLocaleString()}`],
          ['Grand Total Revenue', `₹${grandTotalRevenue.toLocaleString()}`],
        ].map(row => [row[0], row[1]]),
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'right' },
        },
        theme: 'striped' as const,
        fontSize: 9,
      };

      // Subscription Details Table
      const subscriptionTable = {
        head: [['#', 'Client Name', 'Email', 'Plan', 'Plan Price', 'Total Amount', 'Status', 'Start Date', 'End Date', 'Auto Renew', 'Add-ons', 'Add-on Amount']],
        body: [
          ...activeSubscriptions.map((subscription, index) => [
            (index + 1).toString(),
            subscription.user.name,
            subscription.user.email,
            subscription.plan?.name || 'N/A',
            subscription.plan?.price ? `₹${subscription.plan.price}` : 'N/A',
            subscriptionService.formatAmount(subscription),
            subscriptionService.formatSubscriptionStatus(subscription.status).label,
            ExportUtils.formatDate(subscription.startDate),
            ExportUtils.formatDate(subscription.endDate),
            subscription.autoRenew ? 'Yes' : 'No',
            (subscription.addons?.length || 0).toString(),
            `₹${subscription.addons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0}`,
          ]),
          // Total row
          ['', 'Total Active Revenue', '', '', '', `₹${totalActiveRevenue.toLocaleString()}`, '', '', '', '', '', ''],
        ],
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 20, halign: 'center' },
          9: { cellWidth: 15, halign: 'center' },
          10: { cellWidth: 12, halign: 'center' },
          11: { cellWidth: 20, halign: 'right' },
        },
        theme: 'striped' as const,
        fontSize: 7,
      };

      // Add-on Details Table
      const addonDetails = [];
      subscriptions.forEach((subscription) => {
        if (subscription.addons && subscription.addons.length > 0) {
          subscription.addons.forEach((addon) => {
            const latestPayment = subscription.paymentHistory
              ?.filter(payment => payment.type === 'addon_purchase' && payment.addons?.includes(addon._id))
              ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            addonDetails.push([
              subscription.user.name,
              addon.name,
              addon.category || 'N/A',
              `₹${addon.price || 0}`,
              addon.billingType?.replace('_', ' ') || 'N/A',
              latestPayment ? ExportUtils.formatDate(latestPayment.date) : 'N/A',
            ]);
          });
        }
      });

      const addonTable = {
        head: [['Client Name', 'Add-on Name', 'Category', 'Price', 'Billing Type', 'Last Payment Date']],
        body: addonDetails.length > 0 ? [
          ...addonDetails,
          ['Total Add-on Revenue', '', '', `₹${addonRevenue.toLocaleString()}`, '', ''],
        ] : [],
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
        },
        theme: 'striped' as const,
        fontSize: 8,
      };

      // Key Insights Table
      const activeClients = activeSubscriptions.length;
      const arpc = activeClients > 0 ? Math.round(totalActiveRevenue / activeClients) : 0;

      const planRevenue = {};
      activeSubscriptions.forEach(sub => {
        const planName = sub.plan?.name || 'Unknown';
        const revenue = sub.paymentHistory?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;
        planRevenue[planName] = (planRevenue[planName] || 0) + revenue;
      });
      const topPlan = Object.entries(planRevenue).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const addonCount = {};
      subscriptions.forEach(sub => {
        sub.addons?.forEach(addon => {
          addonCount[addon.name] = (addonCount[addon.name] || 0) + 1;
        });
      });
      const topAddon = Object.entries(addonCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const insightsTable = {
        head: [['Insight', 'Value']],
        body: [
          ['Total Active Clients', activeClients.toString()],
          ['Average Revenue per Active Client (ARPC)', `₹${arpc.toLocaleString()}`],
          ['Highest-Grossing Plan', topPlan],
          ['Most Purchased Add-on', topAddon],
          ['Total Monthly Recurring Revenue (MRR)', `₹${totalActiveRevenue.toLocaleString()}`],
        ],
        columnStyles: {
          0: { cellWidth: 100, fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'right' },
        },
        theme: 'striped' as const,
        fontSize: 9,
      };

      const config = {
        filename: 'subscribed_clients_revenue_report',
        title: 'Subscribed Clients Revenue Report',
        metadata: {
          'Generated on': currentDate,
          'Report Period': 'All Time',
          'Prepared by': 'Admin System',
        }
      };

      const tables = [summaryTable, subscriptionTable];

      if (addonDetails.length > 0) {
        tables.push(addonTable);
      }

      tables.push(insightsTable);

      ExportUtils.generatePDFReport(config, tables, {
        orientation: 'landscape',
        format: 'a4',
        includeHeader: true,
        includeFooter: true,
        headerColor: [52, 144, 220],
      });

      toast({
        title: "Export Successful",
        description: "Comprehensive revenue report has been generated successfully",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF report. Please try again.",
        variant: "destructive",
      });
    }
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
      <div className="space-y-6">
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

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No subscriptions found
                </div>
              ) : (
                subscriptions.map((subscription) => (
                  <Card key={subscription._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Client Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-base truncate">{subscription.user.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{subscription.user.email}</div>
                          </div>
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "default"
                                : subscription.status === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                            className="ml-2 flex-shrink-0"
                          >
                            {subscriptionService.formatSubscriptionStatus(subscription.status).label}
                          </Badge>
                        </div>

                        {/* Plan Info */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Plan:</span>
                          <div className="text-right">
                            <div className="font-medium">{subscription.plan?.name || 'N/A'}</div>
                            <div className="text-muted-foreground capitalize">
                              {subscription.plan?.billingPeriod || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-semibold">
                            {subscriptionService.formatAmount(subscription)}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Start:</span>
                            <div className="font-medium">
                              {new Date(subscription.startDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">End:</span>
                            <div className="font-medium">
                              {new Date(subscription.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(subscription)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-lg border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-[250px] min-w-[200px]">Client</TableHead>
                    <TableHead className="font-semibold w-[200px] min-w-[150px]">Plan</TableHead>
                    <TableHead className="font-semibold w-[120px] min-w-[100px]">Amount</TableHead>
                    <TableHead className="font-semibold w-[130px] min-w-[110px]">Start Date</TableHead>
                    <TableHead className="font-semibold w-[130px] min-w-[110px]">End Date</TableHead>
                    <TableHead className="font-semibold w-[120px] min-w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-center w-[120px] min-w-[100px]">Actions</TableHead>
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
                        <TableCell className="w-[250px] min-w-[200px]">
                          <div className="space-y-1">
                            <div className="font-medium truncate">{subscription.user.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{subscription.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] min-w-[150px]">
                          <div className="space-y-1">
                            <div className="font-medium truncate">{subscription.plan?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground capitalize truncate">
                              {subscription.plan?.billingPeriod || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px] min-w-[100px]">
                          <span className="font-semibold whitespace-nowrap">
                            {subscriptionService.formatAmount(subscription)}
                          </span>
                        </TableCell>
                        <TableCell className="w-[130px] min-w-[110px]">
                          <span className="whitespace-nowrap">
                            {new Date(subscription.startDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="w-[130px] min-w-[110px]">
                          <span className="whitespace-nowrap">
                            {new Date(subscription.endDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="w-[120px] min-w-[100px]">
                          <Badge
                            variant={
                              subscription.status === "active"
                                ? "default"
                                : subscription.status === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                            className="whitespace-nowrap"
                          >
                            {subscriptionService.formatSubscriptionStatus(subscription.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center w-[120px] min-w-[100px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(subscription)}
                            className="whitespace-nowrap"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="ml-2">View</span>
                          </Button>
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