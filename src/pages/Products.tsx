import { useState } from "react";
import PropertyCard from "@/components/PropertyCard";
import PropertyFilters from "@/components/PropertyFilters";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";

const ITEMS_PER_PAGE = 12;

// Sample property data - 24 properties for demonstration
const allProperties = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  title: `Luxury ${["Villa", "Apartment", "Plot"][i % 3]} in ${
    ["Bangalore", "Mumbai", "Delhi", "Pune"][i % 4]
  }`,
  location: `${["Whitefield", "Andheri", "Dwarka", "Koregaon Park"][i % 4]}, ${
    ["Bangalore", "Mumbai", "Delhi", "Pune"][i % 4]
  }`,
  price: `₹${(i + 1) * 50} Lac`,
  bedrooms: (i % 4) + 1,
  bathrooms: (i % 3) + 1,
  area: `${1000 + i * 100} sq.ft`,
  type: ["Sale", "Rent"][i % 2],
  image: [property1, property2, property3][i % 3],
  featured: i % 5 === 0,
}));

const Products = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.ceil(allProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProperties = allProperties.slice(startIndex, endIndex);

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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar - Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <PropertyFilters />
        </aside>

        {/* Main Content - Property Grid */}
        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Available Properties</h2>
            <p className="text-muted-foreground">
              Showing {startIndex + 1}-
              {Math.min(endIndex, allProperties.length)} of{" "}
              {allProperties.length} properties
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {currentProperties.map((property) => (
              <PropertyCard key={property.id} {...property} />
            ))}
          </div>

          {/* Pagination */}
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
        </div>
      </div>
    </>
  );
};

export default Products;
