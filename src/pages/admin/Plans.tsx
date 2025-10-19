import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plan, samplePlans } from "@/components/data/sampleData";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";

const Plans = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [billingFilter, setBillingFilter] = useState("all");

  const filteredPlans = useMemo(() => {
    return samplePlans.filter((plan) => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBilling = billingFilter === "all" || plan.billingPeriod === billingFilter;
      return matchesSearch && matchesBilling;
    });
  }, [searchTerm, billingFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredPlans, 10);

  const columns: Column<Plan>[] = [
    { key: "name", label: "Plan Name" },
    {
      key: "price",
      label: "Price",
      render: (plan) => (
        <span className="font-semibold">
          ${plan.price.toFixed(2)} <span className="text-muted-foreground text-sm">/ {plan.billingPeriod === "monthly" ? "mo" : "yr"}</span>
        </span>
      ),
    },
    {
      key: "features",
      label: "Features",
      render: (plan) => (
        <div className="flex flex-wrap gap-1">
          {plan.features.slice(0, 2).map((feature, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
          {plan.features.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{plan.features.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    { key: "subscriberCount", label: "Subscribers" },
    {
      key: "status",
      label: "Status",
      render: (plan) => (
        <Badge variant={plan.status === "active" ? "default" : "secondary"}>
          {plan.status}
        </Badge>
      ),
    },
  ];

  return (
      <div className="space-y-6 relative top-[60px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage subscription plans and pricing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Plans</CardTitle>
            <CardDescription>
              {filteredPlans.length} plan{filteredPlans.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterValue={billingFilter}
              onFilterChange={setBillingFilter}
              filterOptions={[
                { label: "Monthly", value: "monthly" },
                { label: "Yearly", value: "yearly" },
              ]}
              filterPlaceholder="Filter by billing"
            />

            <DataTable
              columns={columns}
              data={paginatedItems}
              editPath={(plan) => `/admin/plans/edit/${plan.id}`}
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

export default Plans;
