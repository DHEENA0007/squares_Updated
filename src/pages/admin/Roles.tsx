import { useState, useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Column, DataTable } from "@/components/adminpanel/shared/DataTable";
import DashboardLayout from "@/components/adminpanel/DashboardLayout";
import { SearchFilter } from "@/components/adminpanel/shared/SearchFilter";
import { usePagination } from "@/hooks/usePagination";
import { Role, sampleRoles } from "@/components/data/sampleData";

const Roles = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRoles = useMemo(() => {
    return sampleRoles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || role.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, previousPage } =
    usePagination(filteredRoles, 10);

  const columns: Column<Role>[] = [
    { key: "name", label: "Role Name" },
    { key: "description", label: "Description" },
    {
      key: "permissions",
      label: "Permissions",
      render: (role) => (
        <div className="flex flex-wrap gap-1">
          {role.permissions.slice(0, 2).map((perm) => (
            <Badge key={perm} variant="secondary" className="text-xs">
              {perm}
            </Badge>
          ))}
          {role.permissions.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{role.permissions.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    { key: "userCount", label: "Users" },
    {
      key: "status",
      label: "Status",
      render: (role) => (
        <Badge variant={role.status === "active" ? "default" : "secondary"}>
          {role.status}
        </Badge>
      ),
    },
  ];

  return (

      <div className="space-y-6 relative top-[60px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles and permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Roles</CardTitle>
            <CardDescription>
              {filteredRoles.length} role{filteredRoles.length !== 1 ? "s" : ""} found
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
                { label: "Inactive", value: "inactive" },
              ]}
              filterPlaceholder="Filter by status"
            />

            <DataTable
              columns={columns}
              data={paginatedItems}
              editPath={(role) => `/admin/roles/edit/${role.id}`}
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

export default Roles;
