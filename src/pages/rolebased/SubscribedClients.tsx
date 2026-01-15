import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, XCircle, RefreshCw, Calendar, CreditCard, User, Package, Star, Camera, Megaphone, Laptop, HeadphonesIcon, Users, Circle, Filter, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/config/permissionConfig";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ExportUtils from "@/utils/exportUtils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
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

// Custom currency formatter for exports to avoid encoding issues and handle null values
const formatCurrencyForExport = (amount: number | null | undefined): string => {
    const safeAmount = amount || 0;
    return `Rs. ${safeAmount.toLocaleString('en-IN')}`;
};

const formatCurrency = (amount: number | null | undefined): string => {
    const safeAmount = amount || 0;
    return `₹${safeAmount.toLocaleString('en-IN')}`;
};

const SubscribedClients = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const permissions = user?.rolePermissions || [];

    // Check if user has superadmin role or required permission
    const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin';

    // Permission checks
    const hasPermission = (permission: string) => {
        if (user?.role === 'superadmin') return true;
        return permissions.includes(permission);
    };

    const canViewClients = hasAdminRole || hasPermission(PERMISSIONS.SUBSCRIBED_CLIENTS_VIEW) || hasPermission(PERMISSIONS.CLIENTS_READ);
    const canAccessActions = hasAdminRole || hasPermission(PERMISSIONS.SUBSCRIBED_CLIENTS_DETAILS) || hasPermission(PERMISSIONS.CLIENTS_ACCESS_ACTIONS);
    const canAccessDetails = hasAdminRole || hasPermission(PERMISSIONS.SUBSCRIBED_CLIENTS_DETAILS) || hasPermission(PERMISSIONS.CLIENTS_ACCESS_DETAILS);
    const canEditDetails = hasAdminRole || hasPermission(PERMISSIONS.SUBSCRIBED_CLIENTS_CANCEL) || hasPermission(PERMISSIONS.CLIENTS_DETAILS_EDIT);
    const canExportData = hasAdminRole || hasPermission(PERMISSIONS.SUBSCRIBED_CLIENTS_EXPORT);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [billingPeriodFilter, setBillingPeriodFilter] = useState("");
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [subscriptionToCancel, setSubscriptionToCancel] = useState<Subscription | null>(null);
    const { toast } = useToast();

    // Redirect if no view permission
    useEffect(() => {
        if (!canViewClients) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to view subscribed clients.",
                variant: "destructive",
            });
            navigate('/rolebased');
        }
    }, [canViewClients, navigate, toast]);

    // Debounce search term to avoid excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            if (searchTerm !== debouncedSearchTerm) {
                setCurrentPage(1);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Get unique plans from subscriptions for filters
    const uniquePlans = useMemo(() => {
        const plans = new Set<string>();
        subscriptions.forEach(sub => {
            if (sub.plan?.name) {
                plans.add(sub.plan.name);
            }
        });
        return Array.from(plans).sort();
    }, [subscriptions]);

    // Date filters
    const [startDateFilter, setStartDateFilter] = useState<string>("");
    const [endDateFilter, setEndDateFilter] = useState<string>("");

    // Client-side filtering
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub => {
            // Status filter
            if (statusFilter !== "all" && sub.status !== statusFilter) {
                return false;
            }

            // Plan filter
            if (planFilter !== "all" && sub.plan?.name !== planFilter) {
                return false;
            }

            // Date filter
            if (startDateFilter && sub.startDate && new Date(sub.startDate) < new Date(startDateFilter)) {
                return false;
            }
            if (endDateFilter && sub.startDate && new Date(sub.startDate) > new Date(endDateFilter)) {
                return false;
            }

            return true;
        });
    }, [subscriptions, statusFilter, planFilter, startDateFilter, endDateFilter]);

    const clearAllFilters = () => {
        setStatusFilter("all");
        setPlanFilter("all");
        setBillingPeriodFilter("");
        setStartDateFilter("");
        setEndDateFilter("");
        setSearchTerm("");
    };

    const hasActiveFilters = statusFilter !== "all" || planFilter !== "all" || billingPeriodFilter !== "" || searchTerm !== "" || startDateFilter !== "" || endDateFilter !== "";

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

    const fetchSubscriptions = useCallback(async () => {
        try {
            if (isInitialLoading) {
                // Keep initial loading true
            } else {
                setIsTableLoading(true);
            }
            const filters = {
                page: currentPage,
                limit: 10,
                search: debouncedSearchTerm || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
            };

            const response = await subscriptionService.getSubscriptions(filters);

            // Validate and clean the data
            const validSubscriptions = response.data.subscriptions.filter(sub =>
                sub && sub.user && (sub.user.name || sub.user.email)
            );

            setSubscriptions(validSubscriptions);
            setTotalPages(response.data.pagination.totalPages);
        } catch (error) {
            console.error("Failed to fetch subscriptions:", error);
            toast({
                title: "Error",
                description: "Failed to load subscriptions. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsInitialLoading(false);
            setIsTableLoading(false);
        }
    }, [currentPage, debouncedSearchTerm, statusFilter]);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

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

    const handleViewDetails = (subscription: Subscription) => {
        if (!canAccessDetails) {
            toast({
                title: "Access Denied",
                description: "You don't have permission to view client details.",
                variant: "destructive",
            });
            return;
        }
        setSelectedSubscription(subscription);
        setIsDetailsDialogOpen(true);
    };

    const handleCancelSubscription = async () => {
        if (!subscriptionToCancel || !cancelReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reason for cancellation.",
                variant: "destructive",
            });
            return;
        }

        try {
            await subscriptionService.cancelSubscription(subscriptionToCancel._id, cancelReason);
            toast({
                title: "Success",
                description: "Subscription cancelled successfully.",
            });
            setIsCancelDialogOpen(false);
            setSubscriptionToCancel(null);
            setCancelReason("");
            fetchSubscriptions();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to cancel subscription.",
                variant: "destructive",
            });
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active':
                return 'default';
            case 'expired':
                return 'secondary';
            case 'cancelled':
                return 'destructive';
            case 'pending':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    // Calculate stats
    const stats = useMemo(() => {
        const active = filteredSubscriptions.filter(s => s.status === 'active').length;
        const expired = filteredSubscriptions.filter(s => s.status === 'expired').length;
        const cancelled = filteredSubscriptions.filter(s => s.status === 'cancelled').length;
        const totalRevenue = filteredSubscriptions
            .filter(s => s.status === 'active')
            .reduce((sum, s) => sum + (s.amount || 0), 0);

        return { active, expired, cancelled, totalRevenue, total: filteredSubscriptions.length };
    }, [filteredSubscriptions]);

    if (!canViewClients) {
        return null;
    }

    if (isInitialLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading subscribed clients...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscribed Clients</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and monitor all client subscriptions
                    </p>
                </div>
                <Button onClick={fetchSubscriptions} variant="outline" disabled={isTableLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isTableLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Plan</label>
                            <Select value={planFilter} onValueChange={setPlanFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All plans" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Plans</SelectItem>
                                    {uniquePlans.map(plan => (
                                        <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">From</label>
                            <Input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">To</label>
                            <Input
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Subscriptions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions ({filteredSubscriptions.length})</CardTitle>
                    <CardDescription>
                        List of all client subscriptions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isTableLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : filteredSubscriptions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No subscriptions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>End Date</TableHead>
                                        <TableHead>Add-ons</TableHead>
                                        {canAccessActions && <TableHead className="text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubscriptions.map((subscription) => (
                                        <TableRow key={subscription._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{subscription.user?.name || 'Unknown'}</p>
                                                        <p className="text-sm text-muted-foreground">{subscription.user?.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span>{subscription.user?.phone || 'N/A'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                    <span>{subscription.plan?.name || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{formatCurrency(subscription.amount)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(subscription.status)}>
                                                    {subscription.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {subscription.addons && subscription.addons.length > 0 ? (
                                                    <Badge variant="outline">{subscription.addons.length} add-ons</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">None</span>
                                                )}
                                            </TableCell>
                                            {canAccessActions && (
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewDetails(subscription)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {canEditDetails && subscription.status === 'active' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => {
                                                                    setSubscriptionToCancel(subscription);
                                                                    setIsCancelDialogOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={previousPage}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <PaginationItem key={pageNum}>
                                                <PaginationLink
                                                    onClick={() => goToPage(pageNum)}
                                                    isActive={currentPage === pageNum}
                                                    className="cursor-pointer"
                                                >
                                                    {pageNum}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={nextPage}
                                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Subscription Details</DialogTitle>
                        <DialogDescription>
                            View detailed subscription information
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubscription && (
                        <div className="space-y-6">
                            {/* Client Info */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Client Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Name:</span>
                                        <p className="font-medium">{selectedSubscription.user?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email:</span>
                                        <p className="font-medium">{selectedSubscription.user?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Phone:</span>
                                        <p className="font-medium">{selectedSubscription.user?.phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Info */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Subscription Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Plan:</span>
                                        <p className="font-medium">{selectedSubscription.plan?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Amount:</span>
                                        <p className="font-medium">{formatCurrency(selectedSubscription.amount)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant={getStatusVariant(selectedSubscription.status)} className="mt-1">
                                            {selectedSubscription.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Auto Renew:</span>
                                        <p className="font-medium">{selectedSubscription.autoRenew ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Start Date:</span>
                                        <p className="font-medium">
                                            {selectedSubscription.startDate
                                                ? new Date(selectedSubscription.startDate).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">End Date:</span>
                                        <p className="font-medium">
                                            {selectedSubscription.endDate
                                                ? new Date(selectedSubscription.endDate).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Add-ons */}
                            {selectedSubscription.addons && selectedSubscription.addons.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Add-ons ({selectedSubscription.addons.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedSubscription.addons.map((addon: any) => (
                                            <div
                                                key={addon._id}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getAddonIcon(addon.category)}
                                                    <div>
                                                        <p className="font-medium">{addon.name}</p>
                                                        <p className="text-sm text-muted-foreground">{addon.category}</p>
                                                    </div>
                                                </div>
                                                <span className="font-medium">{formatCurrency(addon.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment History */}
                            {selectedSubscription.paymentHistory && selectedSubscription.paymentHistory.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Payment History
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedSubscription.paymentHistory.slice(0, 5).map((payment, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                                            >
                                                <div>
                                                    <p className="font-medium capitalize">{payment.type?.replace('_', ' ')}</p>
                                                    <p className="text-muted-foreground">
                                                        {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancel Subscription Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this subscription? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Reason for cancellation <span className="text-red-500">*</span>
                            </label>
                            <Textarea
                                placeholder="Enter the reason for cancellation..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelSubscription}
                            disabled={!cancelReason.trim()}
                        >
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SubscribedClients;
