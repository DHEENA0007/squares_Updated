import { useState, useEffect } from "react";
import PropertyCard from "@/components/PropertyCard";
import PropertyFilters from "@/components/PropertyFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { propertyService, Property, PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { toast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 12;

const Products = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [filters, setFilters] = useState<PropertyFilterType>({});

  // Fetch properties when filters, search, or page changes
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const filterParams: PropertyFilterType = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchQuery || undefined,
          ...filters,
        };

        const response = await propertyService.getProperties(filterParams);
        
        if (response.success) {
          setProperties(response.data.properties);
          setTotalPages(response.data.pagination.totalPages);
          setTotalProperties(response.data.pagination.totalProperties);
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [currentPage, searchQuery, filters]);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: PropertyFilterType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalProperties);

  return (
    <>
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search properties by location, type..."
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar - Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <PropertyFilters onFilterChange={handleFilterChange} />
        </aside>

        {/* Main Content - Property Grid */}
        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Available Properties</h2>
            <p className="text-muted-foreground">
              {loading ? (
                "Loading properties..."
              ) : (
                <>
                  Showing {startIndex + 1}-{endIndex} of {totalProperties} properties
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-lg">Loading properties...</span>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No properties found matching your criteria.
              </p>
              <Button
                onClick={() => {
                  setFilters({});
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 mb-8">
              {properties.map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && properties.length > 0 && totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </>
  );
};

export default Products;