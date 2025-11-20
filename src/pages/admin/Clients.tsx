import { useState, useEffect } from "react";
import { Loader2, Eye, XCircle, RefreshCw, Calendar, CreditCard, User, Package, Star, Camera, Megaphone, Laptop, HeadphonesIcon, Users, Circle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";

// Custom currency formatter for exports to avoid encoding issues and handle null values
const formatCurrencyForExport = (amount: number | null | undefined): string => {
  const safeAmount = amount || 0;
  return `Rs. ${safeAmount.toLocaleString('en-IN')}`;
};
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
import subscriptionService, { Subscription, PaymentHistoryItem } from "@/services/subscriptionService";
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
      
      // Validate and clean the data
      const validSubscriptions = response.data.subscriptions.filter(sub => 
        sub && sub.user && (sub.user.name || sub.user.email)
      );

      // Debug: Log payment history for subscriptions that have it
      validSubscriptions.forEach((sub, index) => {
        if (sub.paymentHistory && sub.paymentHistory.length > 0) {
          console.log(`Subscription ${index} Payment History:`, sub.paymentHistory);
        }
      });

      setSubscriptions(validSubscriptions);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const validateDataForExport = (): boolean => {
    if (!subscriptions || subscriptions.length === 0) {
      toast({
        title: "No Data",
        description: "No subscription data available for export. Please check if there are any subscriptions in the system.",
        variant: "destructive",
      });
      return false;
    }

    // Check if we have valid subscription data (even without populated user data)
    const validSubscriptions = subscriptions.filter(sub => 
      sub && sub._id && sub.user && sub.status
    );

    if (validSubscriptions.length === 0) {
      toast({
        title: "Invalid Data",
        description: "No valid subscription data found for export. Please contact support if this issue persists.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Enhanced data processing for exports with corrected revenue calculations
  // Fixed issues:
  // 1. Only counts revenue from actually paid subscriptions
  // 2. Handles plan upgrades correctly (no double counting)
  // 3. Cancelled/expired subscriptions only count if they were paid
  // 4. Addon revenue only counted if actually purchased and paid
  const processDataForExport = () => {
    // Ensure we have valid data - fix to use the correct user structure
    const validSubscriptions = subscriptions.filter(sub => 
      sub && 
      sub._id && 
      sub.user && 
      sub.status
    );

    if (validSubscriptions.length === 0) {
      throw new Error('No valid subscription data found');
    }

    const activeSubscriptions = validSubscriptions.filter(s => s.status === 'active');
    const expiredSubscriptions = validSubscriptions.filter(s => s.status === 'expired');
    const cancelledSubscriptions = validSubscriptions.filter(s => s.status === 'cancelled');

    // Calculate revenues with proper payment verification - only count actually paid amounts
    // This handles: upgrades (no double counting), cancellations, unpaid subscriptions
    const calculateRevenue = (subscription: Subscription): number => {
      // Step 1: Check if there's actual payment data
      const hasPaymentDetails = subscription.paymentDetails && 
        (subscription.paymentDetails.razorpayPaymentId || subscription.transactionId);
      
      // Step 2: Check payment history for verified transactions
      let paidPayments: PaymentHistoryItem[] = [];
      if (subscription.paymentHistory && subscription.paymentHistory.length > 0) {
        paidPayments = subscription.paymentHistory.filter(payment => 
          payment && 
          payment.amount && 
          payment.amount > 0 &&
          (payment.type === 'subscription_purchase' || 
           payment.type === 'renewal' || 
           payment.type === 'upgrade')
        );
      }

      // Step 3: If no payment history but has payment details and lastPaymentDate, it's likely paid
      if (paidPayments.length === 0 && hasPaymentDetails && subscription.lastPaymentDate) {
        // Subscription was paid but no detailed payment history
        // Only count if not cancelled immediately (within 1 day of payment)
        if (subscription.status === 'cancelled' && subscription.updatedAt) {
          const paymentDate = new Date(subscription.lastPaymentDate);
          const cancellationDate = new Date(subscription.updatedAt);
          const daysDiff = (cancellationDate.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);
          
          // If cancelled within 1 day, don't count as revenue
          if (daysDiff <= 1) {
            return 0;
          }
        }
        
        // Count as revenue if payment was made
        return subscription.amount || 0;
      }

      // Step 4: Process detailed payment history
      if (paidPayments.length === 0) {
        return 0; // No verified payments
      }

      // Sort payments chronologically
      const sortedPayments = paidPayments.sort((a, b) => 
        new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
      );

      let totalRevenue = 0;
      let lastPlanAmount = 0;

      sortedPayments.forEach((payment, index) => {
        if (payment.type === 'subscription_purchase') {
          // Initial subscription - full amount counts as revenue
          totalRevenue += payment.amount || 0;
          lastPlanAmount = payment.amount || 0;
          
        } else if (payment.type === 'renewal') {
          // Renewal - full amount counts as revenue
          totalRevenue += payment.amount || 0;
          
        } else if (payment.type === 'upgrade') {
          // Upgrade - only count the price difference to avoid double counting
          const newPlanAmount = payment.amount || 0;
          const upgradeDifference = newPlanAmount - lastPlanAmount;
          
          // Only add positive differences (actual upgrades)
          if (upgradeDifference > 0) {
            totalRevenue += upgradeDifference;
          }
          lastPlanAmount = newPlanAmount;
        }
      });

      // Step 5: Handle cancellations - if cancelled shortly after payment, reduce revenue
      if (subscription.status === 'cancelled' && sortedPayments.length > 0) {
        const lastPayment = sortedPayments[sortedPayments.length - 1];
        const cancellationDate = new Date(subscription.updatedAt || '');
        const lastPaymentDate = new Date(lastPayment.date || '');
        const daysDiff = (cancellationDate.getTime() - lastPaymentDate.getTime()) / (1000 * 3600 * 24);
        
        // If cancelled within 1 day of last payment, reduce revenue by 50%
        if (daysDiff <= 1) {
          totalRevenue *= 0.5;
        }
      }

      return Math.max(0, totalRevenue);
    };

    const totalActiveRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + calculateRevenue(sub);
    }, 0);

    // Calculate total revenue from all paid subscriptions
    const totalRevenueAll = validSubscriptions.reduce((sum, sub) => {
      return sum + calculateRevenue(sub);
    }, 0);

    // Revenue by status - only count revenue from subscriptions that were actually paid
    // Cancelled subscriptions should only count revenue if they were paid before cancellation
    const cancelledRevenue = cancelledSubscriptions.reduce((sum, sub) => {
      // For cancelled subscriptions, only count if there's evidence of payment
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        const paidAmount = calculateRevenue(sub);
        return sum + paidAmount;
      }
      // If no payment history, don't count cancelled subscriptions as revenue
      return sum;
    }, 0);

    const expiredRevenue = expiredSubscriptions.reduce((sum, sub) => {
      // For expired subscriptions, only count if they were actually paid during their active period
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        const paidAmount = calculateRevenue(sub);
        return sum + paidAmount;
      }
      // If no payment history, don't count expired subscriptions as revenue
      return sum;
    }, 0);

    // Calculate addon revenue only from subscriptions where addons were actually paid for
    // This ensures we only count addon revenue when payment was made
    const addonRevenue = validSubscriptions.reduce((sum, sub) => {
      if (!sub.addons || !Array.isArray(sub.addons) || sub.addons.length === 0) return sum;
      
      let addonAmount = 0;
      
      // Method 1: Check payment history for specific addon purchases
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        const addonPayments = sub.paymentHistory.filter(payment => 
          payment && 
          payment.type === 'addon_purchase' && 
          payment.amount &&
          payment.amount > 0
        );
        
        if (addonPayments.length > 0) {
          addonAmount = addonPayments.reduce((total, payment) => 
            total + (payment.amount || 0), 0
          );
          return sum + addonAmount;
        }
      }
      
      // Method 2: If subscription has verified payment and addons, calculate addon contribution
      const hasPayment = (sub.paymentDetails && sub.paymentDetails.razorpayPaymentId) || 
                        sub.lastPaymentDate || 
                        sub.transactionId;
      
      if (hasPayment && sub.status === 'active') {
        // Calculate addon contribution from subscription amount
        const planBasePrice = typeof sub.plan === 'object' && sub.plan !== null ? (sub.plan.price || 0) : 0;
        const subscriptionAmount = sub.amount || 0;
        const addonContribution = subscriptionAmount - planBasePrice;
        
        // Only count positive contributions (when subscription amount > plan price)
        if (addonContribution > 0) {
          addonAmount = addonContribution;
          
          // For cancelled subscriptions, check if cancelled shortly after payment
          if (sub.status === 'cancelled' && sub.lastPaymentDate && sub.updatedAt) {
            const paymentDate = new Date(sub.lastPaymentDate);
            const cancellationDate = new Date(sub.updatedAt);
            const daysDiff = (cancellationDate.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24);
            
            // If cancelled within 1 day, reduce addon revenue
            if (daysDiff <= 1) {
              addonAmount *= 0.5;
            }
          }
        }
      }
      
      return sum + addonAmount;
    }, 0);

    const grandTotalRevenue = totalActiveRevenue + addonRevenue;

    return {
      validSubscriptions,
      activeSubscriptions,
      expiredSubscriptions, 
      cancelledSubscriptions,
      totalActiveRevenue,
      totalRevenueAll,
      cancelledRevenue,
      expiredRevenue,
      addonRevenue,
      grandTotalRevenue,
      calculateRevenue
    };
  };

  // Generate client details with proper data validation based on actual subscription structure
  const generateClientDetails = (processedData: ReturnType<typeof processDataForExport>) => {
    const { validSubscriptions, calculateRevenue } = processedData;
    
    return validSubscriptions.map((subscription, index) => {
      // Handle user data properly
      const userName = typeof subscription.user === 'object' && subscription.user !== null 
        ? (subscription.user.name || subscription.user.email || `Client ${index + 1}`)
        : `Client ${index + 1}`;
      
      const userEmail = typeof subscription.user === 'object' && subscription.user !== null 
        ? (subscription.user.email || 'N/A')
        : 'N/A';

      // Handle plan data properly
      const planName = typeof subscription.plan === 'object' && subscription.plan !== null
        ? (subscription.plan.name || 'Unknown Plan')
        : 'Unknown Plan';
      
      const planPrice = typeof subscription.plan === 'object' && subscription.plan !== null
        ? (subscription.plan.price || 0)
        : 0;

      // Get the actual paid revenue for this subscription
      const paidRevenue = calculateRevenue(subscription);
      const addonCount = Array.isArray(subscription.addons) ? subscription.addons.length : 0;
      
      // Calculate addon amount based on actual payments, not just addon prices
      let addonAmount = 0;
      if (Array.isArray(subscription.addons) && subscription.addons.length > 0) {
        // First, check payment history for actual addon purchase payments
        if (Array.isArray(subscription.paymentHistory)) {
          const addonPayments = subscription.paymentHistory
            .filter(payment => 
              payment && 
              payment.type === 'addon_purchase' && 
              payment.amount &&
              payment.amount > 0
            )
            .reduce((total, payment) => total + (payment?.amount || 0), 0);
          
          if (addonPayments > 0) {
            addonAmount = addonPayments;
          } else {
            // If no addon payment history but subscription is active and amount > plan price
            // Calculate the difference as addon contribution
            if (subscription.status === 'active') {
              const subscriptionAmount = subscription.amount || 0;
              const addonContribution = subscriptionAmount - planPrice;
              addonAmount = addonContribution > 0 ? addonContribution : 0;
            }
          }
        } else {
          // No payment history - if active subscription, check if amount includes addons
          if (subscription.status === 'active') {
            const subscriptionAmount = subscription.amount || 0;
            const addonContribution = subscriptionAmount - planPrice;
            addonAmount = addonContribution > 0 ? addonContribution : 0;
          }
        }
      }

      return {
        '#': index + 1,
        'Client Name': userName,
        'Email': userEmail,
        'Plan': planName,
        'Plan Price': formatCurrencyForExport(planPrice),
        'Paid Amount': formatCurrencyForExport(paidRevenue),
        'Status': subscriptionService.formatSubscriptionStatus(subscription.status || 'unknown').label,
        'Start Date': ExportUtils.formatDate(subscription.startDate),
        'End Date': ExportUtils.formatDate(subscription.endDate),
        'Auto Renew': subscription.autoRenew ? 'Yes' : 'No',
        'Add-ons': addonCount,
        'Add-on Amount': formatCurrencyForExport(addonAmount),
        'Payment Status': paidRevenue > 0 ? 'Paid' : 'Unpaid'
      };
    });
  };

  // Generate addon details with proper data validation based on actual subscription structure
  const generateAddonDetails = (processedData: ReturnType<typeof processDataForExport>) => {
    const { validSubscriptions } = processedData;
    const addonDetails: Array<{
      '#': number | string;
      'Client Name': string;
      'Add-on Name': string;
      'Category': string;
      'Price': string;
      'Billing Type': string;
      'Last Payment Date': string;
    }> = [];

    validSubscriptions.forEach((subscription) => {
      // Handle case where user might be just an ID
      const userName = typeof subscription.user === 'object' && subscription.user !== null 
        ? (subscription.user.name || subscription.user.email || 'Unknown Client')
        : 'Unknown Client';

      if (Array.isArray(subscription.addons) && subscription.addons.length > 0) {
        subscription.addons.forEach((addon) => {
          // Ensure addon has required properties - might be just ID strings
          if (typeof addon === 'object' && addon !== null && addon.name) {
            const latestPayment = Array.isArray(subscription.paymentHistory)
              ? subscription.paymentHistory
                  .filter(payment => 
                    payment && 
                    payment.type === 'addon_purchase' && 
                    Array.isArray(payment.addons) &&
                    payment.addons.includes(addon._id)
                  )
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
              : null;

            addonDetails.push({
              '#': addonDetails.length + 1,
              'Client Name': userName,
              'Add-on Name': addon.name,
              'Category': addon.category || 'N/A',
              'Price': formatCurrencyForExport(addon.price),
              'Billing Type': addon.billingType?.replace('_', ' ') || 'N/A',
              'Last Payment Date': latestPayment ? ExportUtils.formatDate(latestPayment.date) : 'N/A',
            });
          }
        });
      }
    });

    return addonDetails;
  };

  const handleExportExcel = () => {
    if (!validateDataForExport()) return;

    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // REVENUE CALCULATION FIXES IMPLEMENTED:
      // 1. Plan Upgrades: Only count the difference between old and new plan amounts (no double counting)
      // 2. Cancelled Subscriptions: Revenue reduced by 50% if cancelled within 1 day of payment
      // 3. Unpaid Subscriptions: Only count revenue from verified payments (razorpayPaymentId, lastPaymentDate, etc.)
      // 4. Addon Revenue: Only count when actually purchased and paid for
      // 5. Monthly Reports: Show accurate month-by-month breakdown with corrected calculations
      // 6. Overall Analysis: Comprehensive business metrics including growth, churn, and plan performance

      // Process data for export with corrected calculations
      const processedData = processDataForExport();

      // Generate sheets data with corrected revenue calculations
      const summaryData = [
        { 'Metric': 'Total Clients', 'Count / Amount': processedData.validSubscriptions.length },
        { 'Metric': 'Active Subscriptions', 'Count / Amount': processedData.activeSubscriptions.length },
        { 'Metric': 'Cancelled Subscriptions', 'Count / Amount': processedData.cancelledSubscriptions.length },
        { 'Metric': 'Expired Subscriptions', 'Count / Amount': processedData.expiredSubscriptions.length },
        { 'Metric': 'Total Subscriptions', 'Count / Amount': processedData.validSubscriptions.length },
        { 'Metric': 'Total Active Revenue (Verified Paid)', 'Count / Amount': formatCurrencyForExport(processedData.totalActiveRevenue) },
        { 'Metric': 'Total Revenue from All Paid Subscriptions', 'Count / Amount': formatCurrencyForExport(processedData.totalRevenueAll) },
        { 'Metric': 'Revenue from Cancelled Subscriptions (Paid)', 'Count / Amount': formatCurrencyForExport(processedData.cancelledRevenue) },
        { 'Metric': 'Revenue from Expired Subscriptions (Paid)', 'Count / Amount': formatCurrencyForExport(processedData.expiredRevenue) },
        { 'Metric': 'Add-on Revenue (Verified Paid)', 'Count / Amount': formatCurrencyForExport(processedData.addonRevenue) },
        { 'Metric': 'Grand Total Revenue (All Verified Payments)', 'Count / Amount': formatCurrencyForExport(processedData.grandTotalRevenue) },
      ];

      // Status breakdown with corrected revenue - only showing verified paid amounts
      const totalPaidRevenue = processedData.totalActiveRevenue + processedData.cancelledRevenue + processedData.expiredRevenue;
      const statusBreakdownData = [
        { 
          'Status': 'Active (Verified Paid)', 
          'Count': processedData.activeSubscriptions.length,
          'Total Amount': formatCurrencyForExport(processedData.totalActiveRevenue),
          '% of Total Amount': totalPaidRevenue > 0 ? `${((processedData.totalActiveRevenue / totalPaidRevenue) * 100).toFixed(1)}%` : '0%'
        },
        { 
          'Status': 'Cancelled (Previously Paid)', 
          'Count': processedData.cancelledSubscriptions.length,
          'Total Amount': formatCurrencyForExport(processedData.cancelledRevenue),
          '% of Total Amount': totalPaidRevenue > 0 ? `${((processedData.cancelledRevenue / totalPaidRevenue) * 100).toFixed(1)}%` : '0%'
        },
        { 
          'Status': 'Expired (Previously Paid)', 
          'Count': processedData.expiredSubscriptions.length,
          'Total Amount': formatCurrencyForExport(processedData.expiredRevenue),
          '% of Total Amount': totalPaidRevenue > 0 ? `${((processedData.expiredRevenue / totalPaidRevenue) * 100).toFixed(1)}%` : '0%'
        }
      ];

      const clientDetails = generateClientDetails(processedData);

      const subscriptionDetails = clientDetails.map((client) => ({
        '#': client['#'],
        'Client Name': client['Client Name'],
        'Email': client['Email'],
        'Plan': client['Plan'],
        'Plan Price': client['Plan Price'],
        'Paid Amount': client['Paid Amount'],
        'Status': client['Status'],
        'Start Date': client['Start Date'],
        'End Date': client['End Date'],
        'Auto Renew': client['Auto Renew'],
        'Add-ons': client['Add-ons'],
        'Add-on Amount': client['Add-on Amount'],
        'Payment Status': client['Payment Status']
      }));

      const addonDetails = generateAddonDetails(processedData);

      // Key Insights Sheet - fix calculation issues
      const activeClients = processedData.activeSubscriptions.length;
      const arpc = activeClients > 0 ? Math.round(processedData.totalActiveRevenue / activeClients) : 0;

      // Find highest-grossing plan with proper type handling
      const planRevenue: Record<string, number> = {};
      processedData.activeSubscriptions.forEach(sub => {
        const planName = sub.plan?.name || 'Unknown';
        const revenue = processedData.calculateRevenue(sub);
        planRevenue[planName] = (planRevenue[planName] || 0) + revenue;
      });
      const topPlan = Object.entries(planRevenue).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

      // Find most purchased addon with proper type handling
      const addonCount: Record<string, number> = {};
      processedData.validSubscriptions.forEach(sub => {
        sub.addons?.forEach(addon => {
          if (addon?.name) {
            addonCount[addon.name] = (addonCount[addon.name] || 0) + 1;
          }
        });
      });
      const topAddon = Object.entries(addonCount).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

      const insightsData = [
        { 'Insight': 'Total Active Clients', 'Value': activeClients },
        { 'Insight': 'Average Revenue per Active Client (ARPC)', 'Value': formatCurrencyForExport(arpc) },
        { 'Insight': 'Total Paid Revenue (All Time)', 'Value': formatCurrencyForExport(processedData.totalRevenueAll) },
        { 'Insight': 'Active Subscriptions Revenue', 'Value': formatCurrencyForExport(processedData.totalActiveRevenue) },
        { 'Insight': 'Addon Revenue (Active)', 'Value': formatCurrencyForExport(processedData.addonRevenue) },
        { 'Insight': 'Highest-Grossing Plan', 'Value': topPlan },
        { 'Insight': 'Most Purchased Add-on', 'Value': topAddon },
      ];

      // Generate Monthly Report Data with corrected revenue calculations
      // This report shows month-by-month breakdown of subscriptions and revenue
      // Key fixes:
      // - Upgrades only count the price difference, not full new plan amount
      // - Cancelled subscriptions are tracked but revenue adjusted if cancelled quickly
      // - Only paid subscriptions count toward revenue
      const generateMonthlyReport = () => {
        const monthlyData: Record<string, {
          subscriptionRevenue: number,
          addonRevenue: number,
          newSubscriptions: number,
          cancelledSubscriptions: number,
          upgrades: number,
          totalRevenue: number
        }> = {};

        processedData.validSubscriptions.forEach(subscription => {
          // Process subscription start date
          if (subscription.createdAt || subscription.startDate) {
            const startDate = new Date(subscription.createdAt || subscription.startDate);
            const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                subscriptionRevenue: 0,
                addonRevenue: 0,
                newSubscriptions: 0,
                cancelledSubscriptions: 0,
                upgrades: 0,
                totalRevenue: 0
              };
            }

            // Count new subscription
            monthlyData[monthKey].newSubscriptions += 1;
            
            // Add subscription revenue if paid
            const paidRevenue = processedData.calculateRevenue(subscription);
            if (paidRevenue > 0) {
              monthlyData[monthKey].subscriptionRevenue += paidRevenue;
            }
          }

          // Process cancellation date
          if (subscription.status === 'cancelled' && subscription.updatedAt) {
            const cancelDate = new Date(subscription.updatedAt);
            const monthKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                subscriptionRevenue: 0,
                addonRevenue: 0,
                newSubscriptions: 0,
                cancelledSubscriptions: 0,
                upgrades: 0,
                totalRevenue: 0
              };
            }
            monthlyData[monthKey].cancelledSubscriptions += 1;
          }

          // Process payment history for monthly breakdown
          if (subscription.paymentHistory && subscription.paymentHistory.length > 0) {
            subscription.paymentHistory.forEach(payment => {
              if (payment.date && payment.amount && payment.amount > 0) {
                const paymentDate = new Date(payment.date);
                const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                  monthlyData[monthKey] = {
                    subscriptionRevenue: 0,
                    addonRevenue: 0,
                    newSubscriptions: 0,
                    cancelledSubscriptions: 0,
                    upgrades: 0,
                    totalRevenue: 0
                  };
                }

                if (payment.type === 'addon_purchase') {
                  monthlyData[monthKey].addonRevenue += payment.amount;
                } else if (payment.type === 'upgrade') {
                  monthlyData[monthKey].upgrades += 1;
                  // For upgrades, we need to handle properly to avoid double counting
                  // Find the previous plan amount to calculate the difference
                  const previousPayments = subscription.paymentHistory?.filter(p => 
                    p.date && new Date(p.date) < paymentDate && 
                    (p.type === 'subscription_purchase' || p.type === 'upgrade')
                  ).sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
                  
                  const previousAmount = previousPayments && previousPayments.length > 0 ? 
                    previousPayments[0].amount || 0 : 0;
                  const upgradeDifference = payment.amount - previousAmount;
                  
                  // Only add the upgrade difference, not the full amount
                  if (upgradeDifference > 0) {
                    monthlyData[monthKey].subscriptionRevenue += upgradeDifference;
                  }
                } else if (payment.type === 'subscription_purchase' || payment.type === 'renewal') {
                  monthlyData[monthKey].subscriptionRevenue += payment.amount;
                }
              }
            });
          }
        });

        // Calculate total revenue for each month
        Object.keys(monthlyData).forEach(month => {
          monthlyData[month].totalRevenue = monthlyData[month].subscriptionRevenue + monthlyData[month].addonRevenue;
        });

        return Object.keys(monthlyData).sort().map(month => ({
          'Month': month,
          'New Subscriptions': monthlyData[month].newSubscriptions,
          'Cancelled Subscriptions': monthlyData[month].cancelledSubscriptions,
          'Upgrades': monthlyData[month].upgrades,
          'Subscription Revenue': formatCurrencyForExport(monthlyData[month].subscriptionRevenue),
          'Addon Revenue': formatCurrencyForExport(monthlyData[month].addonRevenue),
          'Total Revenue': formatCurrencyForExport(monthlyData[month].totalRevenue),
        }));
      };

      const monthlyReportData = generateMonthlyReport();

      // Generate Overall Report Data - comprehensive business metrics and analysis
      // This provides high-level insights including growth trends, churn analysis, and plan performance
      const generateOverallReport = () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Calculate year-over-year growth
        const thisYearRevenue = processedData.validSubscriptions
          .filter(sub => {
            const subDate = new Date(sub.createdAt || sub.startDate);
            return subDate.getFullYear() === currentYear;
          })
          .reduce((sum, sub) => sum + processedData.calculateRevenue(sub), 0);

        const lastYearRevenue = processedData.validSubscriptions
          .filter(sub => {
            const subDate = new Date(sub.createdAt || sub.startDate);
            return subDate.getFullYear() === currentYear - 1;
          })
          .reduce((sum, sub) => sum + processedData.calculateRevenue(sub), 0);

        const yearOverYearGrowth = lastYearRevenue > 0 
          ? ((thisYearRevenue - lastYearRevenue) / lastYearRevenue * 100).toFixed(1) 
          : 'N/A';

        // Calculate churn rate
        const totalCancelled = processedData.cancelledSubscriptions.length;
        const totalSubscriptions = processedData.validSubscriptions.length;
        const churnRate = totalSubscriptions > 0 ? ((totalCancelled / totalSubscriptions) * 100).toFixed(1) : '0';

        // Calculate plan distribution
        const planDistribution: Record<string, number> = {};
        processedData.activeSubscriptions.forEach(sub => {
          const planName = sub.plan?.name || 'Unknown';
          planDistribution[planName] = (planDistribution[planName] || 0) + 1;
        });

        const overallData = [
          { 'Metric': 'Total Revenue (All Time)', 'Value': formatCurrencyForExport(processedData.totalRevenueAll) },
          { 'Metric': 'Active Subscriptions Revenue', 'Value': formatCurrencyForExport(processedData.totalActiveRevenue) },
          { 'Metric': 'Addon Revenue', 'Value': formatCurrencyForExport(processedData.addonRevenue) },
          { 'Metric': 'This Year Revenue', 'Value': formatCurrencyForExport(thisYearRevenue) },
          { 'Metric': 'Last Year Revenue', 'Value': formatCurrencyForExport(lastYearRevenue) },
          { 'Metric': 'Year-over-Year Growth', 'Value': `${yearOverYearGrowth}%` },
          { 'Metric': 'Churn Rate', 'Value': `${churnRate}%` },
          { 'Metric': 'Average Revenue per Client (ARPC)', 'Value': formatCurrencyForExport(arpc) },
          { 'Metric': 'Total Active Clients', 'Value': activeClients },
          { 'Metric': 'Total Clients (All Time)', 'Value': processedData.validSubscriptions.length },
          { 'Metric': 'Conversion Rate (Active/Total)', 'Value': `${totalSubscriptions > 0 ? ((activeClients / totalSubscriptions) * 100).toFixed(1) : 0}%` },
          { 'Metric': 'Most Popular Plan', 'Value': topPlan },
          { 'Metric': 'Plan Distribution', 'Value': Object.entries(planDistribution).map(([plan, count]) => `${plan}: ${count}`).join(', ') },
        ];

        return overallData;
      };

      const overallReportData = generateOverallReport();

      const config = {
        filename: 'subscribed_clients_revenue_report',
        title: 'Subscribed Clients Revenue Report',
        metadata: {
          'Generated on': currentDate,
          'Report Period': 'All Time',
          'Prepared by': 'Admin System',
        }
      };

      // Excel sheets with corrected revenue calculations and new monthly/overall reports
      // Added: Monthly Report - shows month-by-month breakdown of subscriptions and revenue
      // Added: Overall Analysis - provides comprehensive business metrics and growth analysis
      const sheets = [
        {
          name: 'Summary Statistics',
          data: summaryData,
          columns: [{ wch: 30 }, { wch: 20 }]
        },
        {
          name: 'Status Breakdown',
          data: statusBreakdownData,
          columns: [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }]
        },
        {
          name: 'Monthly Report',
          data: monthlyReportData,
          columns: [
            { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
            { wch: 18 }, { wch: 15 }, { wch: 15 }
          ]
        },
        {
          name: 'Overall Analysis',
          data: overallReportData,
          columns: [{ wch: 35 }, { wch: 25 }]
        },
        {
          name: 'Subscription Details',
          data: subscriptionDetails,
          columns: [
            { wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, 
            { wch: 8 }, { wch: 15 }, { wch: 12 }
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
        description: "Comprehensive revenue report with monthly analysis and corrected calculations has been generated successfully",
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
    if (!validateDataForExport()) return;

    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Process data for export
      const processedData = processDataForExport();

      // Generate tables data for PDF
      const summaryTable = {
        head: [['Metric', 'Count / Amount']],
        body: [
          ['Total Clients', processedData.validSubscriptions.length.toString()],
          ['Active Subscriptions', processedData.activeSubscriptions.length.toString()],
          ['Cancelled Subscriptions', processedData.cancelledSubscriptions.length.toString()],
          ['Expired Subscriptions', processedData.expiredSubscriptions.length.toString()],
          ['Total Subscriptions', processedData.validSubscriptions.length.toString()],
          ['Total Active Revenue (Verified)', `₹${processedData.totalActiveRevenue.toLocaleString()}`],
          ['Add-on Revenue (Verified)', `₹${processedData.addonRevenue.toLocaleString()}`],
          ['Grand Total Revenue (All Verified)', `₹${processedData.grandTotalRevenue.toLocaleString()}`],
        ].map(row => [row[0], row[1]]),
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'right' },
        },
        theme: 'striped' as const,
        fontSize: 9,
      };

      // Status breakdown table
      const totalRevenue = processedData.totalActiveRevenue + processedData.cancelledRevenue + processedData.expiredRevenue;
      const statusTable = {
        head: [['Status', 'Count', 'Total Amount (₹)', '% of Total Amount']],
        body: [
          ['Active', processedData.activeSubscriptions.length.toString(), processedData.totalActiveRevenue.toLocaleString(), totalRevenue > 0 ? `${((processedData.totalActiveRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'],
          ['Cancelled', processedData.cancelledSubscriptions.length.toString(), processedData.cancelledRevenue.toLocaleString(), totalRevenue > 0 ? `${((processedData.cancelledRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%'],
          ['Expired', processedData.expiredSubscriptions.length.toString(), processedData.expiredRevenue.toLocaleString(), totalRevenue > 0 ? `${((processedData.expiredRevenue / totalRevenue) * 100).toFixed(1)}%` : '0%']
        ],
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
        },
        theme: 'striped' as const,
        fontSize: 9,
      };

      // Convert client details to table rows
      const clientDetails = generateClientDetails(processedData);
      const clientTable = {
        head: [['#', 'Client Name', 'Email', 'Plan', 'Plan Price', 'Total Amount', 'Status', 'Start Date', 'End Date', 'Auto Renew', 'Add-ons', 'Add-on Amount']],
        body: [
          ...clientDetails.map(client => [
            client['#'].toString(),
            client['Client Name'],
            client['Email'],
            client['Plan'],
            client['Plan Price'],
            client['Total Amount'],
            client['Status'],
            client['Start Date'],
            client['End Date'],
            client['Auto Renew'],
            client['Add-ons'].toString(),
            client['Add-on Amount'],
          ]),
          // Total row
          ['', 'Total Active Revenue', '', '', '', `₹${processedData.totalActiveRevenue.toLocaleString()}`, '', '', '', '', '', `₹${processedData.addonRevenue.toLocaleString()}`],
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

      // Convert addon details to table rows
      const addonDetails = generateAddonDetails(processedData);
      const addonTable = {
        head: [['Client Name', 'Add-on Name', 'Category', 'Price', 'Billing Type', 'Last Payment Date']],
        body: [
          ...addonDetails.map(addon => [
            addon['Client Name'],
            addon['Add-on Name'],
            addon['Category'],
            addon['Price'],
            addon['Billing Type'],
            addon['Last Payment Date'],
          ]),
          ...(addonDetails.length > 0 ? [['Total Add-on Revenue', '', '', `₹${processedData.addonRevenue.toLocaleString()}`, '', '']] : []),
        ],
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' as const },
          1: { cellWidth: 35, halign: 'left' as const },
          2: { cellWidth: 20, halign: 'center' as const },
          3: { cellWidth: 20, halign: 'right' as const },
          4: { cellWidth: 25, halign: 'center' as const },
          5: { cellWidth: 25, halign: 'center' as const },
        },
        theme: 'striped' as const,
        fontSize: 8,
      };

      // Key insights with improved calculations
      const activeClients = processedData.activeSubscriptions.length;
      const arpc = activeClients > 0 ? Math.round(processedData.totalActiveRevenue / activeClients) : 0;

      const planRevenue: Record<string, number> = {};
      processedData.activeSubscriptions.forEach(sub => {
        const planName = sub.plan?.name || 'Unknown';
        const revenue = processedData.calculateRevenue(sub);
        planRevenue[planName] = (planRevenue[planName] || 0) + revenue;
      });
      const topPlan = Object.entries(planRevenue).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

      const addonCount: Record<string, number> = {};
      processedData.validSubscriptions.forEach(sub => {
        sub.addons?.forEach(addon => {
          if (addon?.name) {
            addonCount[addon.name] = (addonCount[addon.name] || 0) + 1;
          }
        });
      });
      const topAddon = Object.entries(addonCount).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

      const insightsTable = {
        head: [['Insight', 'Value']],
        body: [
          ['Total Active Clients', activeClients.toString()],
          ['Average Revenue per Active Client (ARPC)', `₹${arpc.toLocaleString()}`],
          ['Highest-Grossing Plan', topPlan],
          ['Most Purchased Add-on', topAddon],
          ['Total Monthly Recurring Revenue (MRR)', `₹${processedData.totalActiveRevenue.toLocaleString()}`],
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

      const tables = [summaryTable, statusTable, clientTable];

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Export Failed",
        description: `Failed to export PDF report: ${errorMessage}`,
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
            {/* <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="w-4 h-4" />
              <span className="ml-2">Export PDF</span>
            </Button> */}
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