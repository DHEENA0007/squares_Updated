import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Plus,
  Eye,
  FileText,
  BarChart3
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { billingService, VendorSubscription, Payment, BillingStats, Invoice } from "@/services/billingService";

const VendorBilling: React.FC = () => {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const getDateFromPeriod = (period: string): string => {
    const now = new Date();
    const days = {
      'last_7_days': 7,
      'last_30_days': 30,
      'last_90_days': 90,
      'last_year': 365
    }[period] || 30;
    
    const fromDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return fromDate.toISOString().split('T')[0];
  };

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      
      const [subscriptionData, paymentsData, invoicesData, statsData] = await Promise.all([
        billingService.getCurrentSubscription(),
        billingService.getPayments({ 
          page: 1, 
          limit: 20,
          dateFrom: getDateFromPeriod(selectedPeriod)
        }),
        billingService.getInvoices({
          page: 1,
          limit: 10
        }),
        billingService.getBillingStats()
      ]);

      setSubscription(subscriptionData);
      setPayments(paymentsData.payments || []);
      setInvoices(invoicesData.invoices || []);
      setBillingStats(statsData);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
      case "paid":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
      case "sent":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "cancelled":
      case "expired":
      case "overdue":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
      case "sent":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
      case "expired":
      case "overdue":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatAmount = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusMessage = (payment: Payment) => {
    if (payment.status === 'failed' && payment.failureReason) {
      return payment.failureReason;
    }
    if (payment.status === 'refunded') {
      if (payment.failureReason?.includes('timeout') || payment.failureReason?.includes('exceeded')) {
        return 'Payment refunded - exceeded 15-minute Razorpay time limit';
      }
      return payment.failureReason || 'Payment refunded';
    }
    if (payment.status === 'pending') {
      const createdAt = new Date(payment.createdAt);
      const now = new Date();
      const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
      if (minutesElapsed > 15) {
        return 'Payment may have expired - please refresh';
      }
      return `Pending (${15 - minutesElapsed} minutes remaining)`;
    }
    return payment.description || '';
  };

  const handleExport = async () => {
    try {
      const periodName = selectedPeriod.replace(/_/g, '-'); // e.g., "last_30_days" -> "last-30-days"
      const blob = await billingService.exportBillingData('pdf', {
        dateFrom: getDateFromPeriod(selectedPeriod),
      });
      
      if (blob) {
        billingService.downloadBlob(blob, `billing-report-${periodName}-${new Date().toISOString().split('T')[0]}.pdf`);
        toast({
          title: "Success",
          description: "Billing report downloaded successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate billing report. No data received.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Error",
        description: "Failed to download billing report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewPayment = async (paymentId: string) => {
    setLoadingDetails(true);
    setIsPaymentDialogOpen(true);
    
    try {
      const paymentDetails = await billingService.getPaymentDetails(paymentId);
      if (paymentDetails) {
        setSelectedPayment(paymentDetails);
      }
    } catch (error) {
      console.error("Failed to load payment details:", error);
      setIsPaymentDialogOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      const blob = await billingService.downloadReceipt(payment._id);
      if (blob) {
        billingService.downloadBlob(blob, `receipt-${payment._id.slice(-8)}.pdf`);
        toast({
          title: "Success",
          description: "Payment receipt downloaded successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate receipt. No data received.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to download receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setLoadingDetails(true);
    setIsInvoiceDialogOpen(true);
    
    try {
      const invoiceDetails = await billingService.getInvoiceDetails(invoiceId);
      if (invoiceDetails) {
        setSelectedInvoice(invoiceDetails);
      }
    } catch (error) {
      console.error("Failed to load invoice details:", error);
      setIsInvoiceDialogOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const blob = await billingService.downloadInvoice(invoice._id);
      if (blob) {
        billingService.downloadBlob(blob, `invoice-${invoice.invoiceNumber}.pdf`);
        toast({
          title: "Success",
          description: `Invoice ${invoice.invoiceNumber} downloaded successfully.`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to generate invoice ${invoice.invoiceNumber}. No data received.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toast({
        title: "Error",
        description: `Failed to download invoice ${invoice.invoiceNumber}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleDownloadAllInvoices = async () => {
    try {
      for (const invoice of invoices) {
        await handleDownloadInvoice(invoice);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast({
        title: "Success",
        description: `Downloaded ${invoices.length} invoices`,
      });
    } catch (error) {
      console.error("Failed to download all invoices:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading billing information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Details Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information about this payment transaction
            </DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedPayment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="font-medium">{selectedPayment._id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{selectedPayment.transactionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedPayment.status)}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{selectedPayment.paymentMethod.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Gateway</p>
                  <p className="font-medium capitalize">{selectedPayment.paymentGateway}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(selectedPayment.createdAt)}</p>
                </div>
                {selectedPayment.paidAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Paid At</p>
                    <p className="font-medium">{formatDate(selectedPayment.paidAt)}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{selectedPayment.description}</p>
              </div>
              {selectedPayment.failureReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Failure Reason</p>
                  <p className="text-sm text-red-800">{selectedPayment.failureReason}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleDownloadReceipt(selectedPayment)} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No payment details available</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete information about this invoice
            </DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium text-lg">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                {selectedInvoice.paidDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Date</p>
                    <p className="font-medium">{formatDate(selectedInvoice.paidDate)}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Vendor Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {selectedInvoice.vendorDetails.name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedInvoice.vendorDetails.email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {selectedInvoice.vendorDetails.phone}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selectedInvoice.vendorDetails.address}</p>
                  {selectedInvoice.vendorDetails.gst && (
                    <p><span className="text-muted-foreground">GST:</span> {selectedInvoice.vendorDetails.gst}</p>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Qty</th>
                      <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3 text-sm">{item.description}</td>
                        <td className="p-3 text-sm text-right">{item.quantity}</td>
                        <td className="p-3 text-sm text-right">{formatAmount(item.unitPrice, selectedInvoice.currency)}</td>
                        <td className="p-3 text-sm text-right font-medium">{formatAmount(item.total, selectedInvoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 text-sm text-right font-medium">Subtotal</td>
                      <td className="p-3 text-sm text-right font-medium">{formatAmount(selectedInvoice.amount, selectedInvoice.currency)}</td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 text-sm text-right font-medium">Tax</td>
                      <td className="p-3 text-sm text-right font-medium">{formatAmount(selectedInvoice.tax, selectedInvoice.currency)}</td>
                    </tr>
                    <tr className="border-t bg-muted">
                      <td colSpan={3} className="p-3 text-base text-right font-bold">Total</td>
                      <td className="p-3 text-base text-right font-bold">{formatAmount(selectedInvoice.total, selectedInvoice.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No invoice details available</p>
          )}
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment history
          </p>
        </div>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'gap-2'}`}>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className={`${isMobile ? 'w-full' : 'w-40'}`}>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 days</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="last_90_days">Last 90 days</SelectItem>
              <SelectItem value="last_year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className={`${isMobile ? 'w-full h-11' : 'h-9'}`}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {billingStats && (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                {formatAmount(billingStats.totalRevenue)}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                {formatAmount(billingStats.nextBillingAmount)}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Next Payment</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>
                {billingStats.totalInvoices}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Invoices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>
                {subscription ? formatAmount(subscription.amount) : '₹0'}
              </div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Monthly Cost</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{subscription.plan?.name || 'N/A'}</h3>
                      <p className="text-muted-foreground">
                        {subscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(subscription.status)}
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                    <div>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Monthly Cost</p>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                        {formatAmount(subscription.amount, subscription.currency)}
                      </p>
                    </div>
                    <div>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Next Billing Date</p>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                        {formatDate(subscription.nextBillingDate)}
                      </p>
                    </div>
                    <div>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Auto Renewal</p>
                      <p className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                        {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'gap-2'}`}>
                      <Button variant="outline" onClick={() => window.location.href = '/vendor/subscription-plans'} className={`${isMobile ? 'w-full h-11' : ''}`}>
                        Change Plan
                      </Button>
                      <Button variant="outline" onClick={() => window.location.href = '/vendor/subscription-manager'} className={`${isMobile ? 'w-full h-11' : ''}`}>
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a plan to get started with our services
                  </p>
                  <Button onClick={() => window.location.href = '/vendor/subscription-plans'}>
                    <Plus className="w-4 h-4 mr-2" />
                    Choose Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.slice(0, 5).map((payment, index) => (
                    <div
                      key={payment?._id || `payment-${index}`}
                      className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} p-4 border rounded-lg`}
                    >
                      <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}`}>
                        <div className="p-2 bg-muted rounded-full">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`${isMobile ? 'text-sm' : 'font-medium'}`}>
                            {payment?.description || 'Subscription Payment'}
                          </p>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                            {payment?.paymentMethod || 'Credit Card'} • {payment?.createdAt ? formatDate(payment.createdAt) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className={`${isMobile ? 'text-left' : 'text-right'}`}>
                        <div className={`flex ${isMobile ? 'justify-between items-center' : 'items-center space-x-2'}`}>
                          {getStatusIcon(payment?.status || 'pending')}
                          <span className={`${isMobile ? 'text-sm' : 'font-semibold'}`}>
                            {formatAmount(payment?.amount || 0, payment?.currency || 'INR')}
                          </span>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(payment?.status || 'pending')}`}>
                          {payment?.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.map((payment, index) => (
                    <div
                      key={payment?._id || `payment-full-${index}`}
                      className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} p-4 border rounded-lg hover:shadow-sm transition-shadow`}
                    >
                      <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}`}>
                        <div className="p-2 bg-muted rounded-full">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`${isMobile ? 'text-sm' : 'font-medium'}`}>
                            {payment?.description || 'Subscription Payment'}
                          </p>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                            Payment ID: {payment?._id?.slice(-8) || 'N/A'}
                          </p>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                            {payment?.createdAt ? formatDate(payment.createdAt) : 'N/A'}
                          </p>
                          {(payment.status === 'failed' || payment.status === 'refunded') && payment.failureReason && (
                            <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-red-600 mt-1 max-w-md`}>
                              {payment.failureReason.includes('timeout') || payment.failureReason.includes('exceeded')
                                ? '⏱️ Payment expired - exceeded 15-minute time limit'
                                : `❌ ${payment.failureReason}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`${isMobile ? 'text-left' : 'text-right'}`}>
                        <div className={`flex ${isMobile ? 'justify-between items-center' : 'items-center space-x-2'} mb-1`}>
                          {getStatusIcon(payment.status)}
                          <span className={`${isMobile ? 'text-sm' : 'font-semibold'}`}>
                            {formatAmount(payment.amount, payment.currency)}
                          </span>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </Badge>
                        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'} mt-2`}>
                          <Button size="sm" variant="outline" onClick={() => handleViewPayment(payment._id)} className={`${isMobile ? 'w-full h-9' : ''}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(payment)} className={`${isMobile ? 'w-full h-9' : ''}`}>
                            <Download className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
                  <p className="text-muted-foreground">Your payment history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoices
                </span>
                <Button variant="outline" size="sm" onClick={handleDownloadAllInvoices} className={`${isMobile ? 'w-full h-9' : ''}`}>
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice, index) => (
                    <div
                      key={invoice?._id || `invoice-${index}`}
                      className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} p-4 border rounded-lg hover:shadow-sm transition-shadow`}
                    >
                      <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center space-x-4'}`}>
                        <div className="p-2 bg-muted rounded-full">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`${isMobile ? 'text-sm' : 'font-medium'}`}>Invoice #{invoice?.invoiceNumber || 'N/A'}</p>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                            Issued: {invoice?.issueDate ? formatDate(invoice.issueDate) : 'N/A'}
                          </p>
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                            Due: {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className={`${isMobile ? 'text-left' : 'text-right'}`}>
                        <div className={`flex ${isMobile ? 'justify-between items-center' : 'items-center space-x-2'} mb-1`}>
                          {getStatusIcon(invoice.status)}
                          <span className={`${isMobile ? 'text-sm' : 'font-semibold'}`}>
                            {formatAmount(invoice.total, invoice.currency)}
                          </span>
                        </div>
                        <Badge className={`text-xs ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </Badge>
                        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'} mt-2`}>
                          <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice._id)} className={`${isMobile ? 'w-full h-9' : ''}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(invoice)} className={`${isMobile ? 'w-full h-9' : ''}`}>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Invoices</h3>
                  <p className="text-muted-foreground">Your invoices will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingStats?.usageStats ? (
                <div className="space-y-6">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                    <div className={`${isMobile ? 'p-3' : 'p-4'} border rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Properties</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                          {billingStats?.usageStats?.properties?.used || 0} / {billingStats?.usageStats?.properties?.limit || 0}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((billingStats?.usageStats?.properties?.used || 0) / (billingStats?.usageStats?.properties?.limit || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className={`${isMobile ? 'p-3' : 'p-4'} border rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Leads</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                          {billingStats?.usageStats?.leads?.used || 0} / {billingStats?.usageStats?.leads?.limit || 0}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((billingStats?.usageStats?.leads?.used || 0) / (billingStats?.usageStats?.leads?.limit || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className={`${isMobile ? 'p-3' : 'p-4'} border rounded-lg`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Messages</p>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                          {billingStats?.usageStats?.messages?.used || 0} / {billingStats?.usageStats?.messages?.limit || 0}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((billingStats?.usageStats?.messages?.used || 0) / (billingStats?.usageStats?.messages?.limit || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-4`}>
                      Usage resets on your billing cycle date: {billingStats.nextBillingDate}
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = '/vendor/subscription-manager'} className={`${isMobile ? 'w-full h-11' : ''}`}>
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Usage Data</h3>
                  <p className="text-muted-foreground">Usage statistics will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorBilling;