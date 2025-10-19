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
import { Property, sampleProperties } from "@/components/data/sampleData";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredProperties = useMemo(() => {
    return sampleProperties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || property.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchTerm, typeFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredProperties, 10);

  const columns: Column<Property>[] = [
    { key: "title", label: "Property Title" },
    { key: "address", label: "Address" },
    {
      key: "type",
      label: "Type",
      render: (property) => (
        <Badge variant="secondary">
          {property.type}
        </Badge>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (property) => <span className="font-semibold">${property.price.toLocaleString()}</span>,
    },
    {
      key: "area",
      label: "Area",
      render: (property) => <span>{property.area} sq ft</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (property) => (
        <Badge
          variant={
            property.status === "available"
              ? "default"
              : property.status === "sold"
              ? "secondary"
              : "outline"
          }
        >
          {property.status}
        </Badge>
      ),
    },
  ];

  return (

      <div className="space-y-6 relative top-[60px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage property listings and details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Properties</CardTitle>
            <CardDescription>
              {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterValue={typeFilter}
              onFilterChange={setTypeFilter}
              filterOptions={[
                { label: "Apartment", value: "apartment" },
                { label: "House", value: "house" },
                { label: "Commercial", value: "commercial" },
                { label: "Land", value: "land" },
              ]}
              filterPlaceholder="Filter by type"
            />

            <DataTable
              columns={columns}
              data={paginatedItems}
              editPath={(property) => `/admin/properties/edit/${property.id}`}
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

export default Properties;
