import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import subscriptionService, { Subscription } from "@/services/subscriptionService";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

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

  // Create extended type for DataTable
  type SubscriptionWithId = Subscription & { id: string };

  const columns: Column<SubscriptionWithId>[] = [
    { 
      key: "user", 
      label: "Client Name",
      render: (subscription) => (
        <div>
          <div className="font-medium">{subscription.user?.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{subscription.user?.email || 'N/A'}</div>
        </div>
      )
    },
    { 
      key: "plan", 
      label: "Plan",
      render: (subscription) => (
        <div>
          <div className="font-medium">{subscription.plan?.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{subscription.plan?.billingPeriod || 'N/A'}</div>
        </div>
      )
    },
    {
      key: "amount",
      label: "Amount",
      render: (subscription) => (
        <span className="font-semibold">{subscriptionService.formatAmount(subscription)}</span>
      ),
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (subscription) => new Date(subscription.startDate).toLocaleDateString(),
    },
    {
      key: "endDate",
      label: "End Date",
      render: (subscription) => new Date(subscription.endDate).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (subscription) => {
        const statusInfo = subscriptionService.formatSubscriptionStatus(subscription.status);
        return (
          <Badge
            variant={
              subscription.status === "active"
                ? "default"
                : subscription.status === "expired"
                ? "destructive"
                : "secondary"
            }
          >
            {statusInfo.label}
          </Badge>
        );
      },
    },
  ];

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

            <DataTable
              columns={columns}
              data={subscriptions.map(subscription => ({ ...subscription, id: subscription._id }))}
              editPath={(subscription) => `/admin/clients/edit/${subscription._id}`}
            />

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
      </div>
  );
};

export default Clients;
