import { useState, useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
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
import { sampleClients, SubscribedClient } from "@/components/data/sampleData";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const filteredClients = useMemo(() => {
    return sampleClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.planName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredClients, 10);

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

  const columns: Column<SubscribedClient>[] = [
    { key: "name", label: "Client Name" },
    { key: "email", label: "Email" },
    { key: "planName", label: "Plan" },
    {
      key: "amount",
      label: "Amount",
      render: (client) => <span className="font-semibold">${client.amount.toFixed(2)}</span>,
    },
    {
      key: "subscriptionDate",
      label: "Subscription Date",
      render: (client) => new Date(client.subscriptionDate).toLocaleDateString(),
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      render: (client) => new Date(client.expiryDate).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (client) => (
        <Badge
          variant={
            client.status === "active"
              ? "default"
              : client.status === "expired"
              ? "destructive"
              : "secondary"
          }
        >
          {client.status}
        </Badge>
      ),
    },
  ];

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
              {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterValue={statusFilter}
              onFilterChange={setStatusFilter}
              filterOptions={[
                { label: "Active", value: "active" },
                { label: "Expired", value: "expired" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              filterPlaceholder="Filter by status"
            />

            <DataTable
              columns={columns}
              data={paginatedItems}
              editPath={(client) => `/admin/clients/edit/${client.id}`}
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
