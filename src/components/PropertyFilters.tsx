import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { PropertyFilters as PropertyFilterType } from "@/services/propertyService";

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilterType) => void;
}

const PropertyFilters = ({ onFilterChange }: PropertyFiltersProps) => {
  const [filters, setFilters] = useState<PropertyFilterType>({
    propertyType: undefined,
    bedrooms: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    listingType: undefined,
  });

  const handleFilterChange = (key: keyof PropertyFilterType, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' || value === 'any' || value === 'any-budget' ? undefined : value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleBudgetChange = (budgetRange: string) => {
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    switch (budgetRange) {
      case '20-40':
        minPrice = 2000000;
        maxPrice = 4000000;
        break;
      case '40-60':
        minPrice = 4000000;
        maxPrice = 6000000;
        break;
      case '60-80':
        minPrice = 6000000;
        maxPrice = 8000000;
        break;
      case '80-1cr':
        minPrice = 8000000;
        maxPrice = 10000000;
        break;
      case '1cr+':
        minPrice = 10000000;
        maxPrice = undefined;
        break;
      default:
        minPrice = undefined;
        maxPrice = undefined;
    }

    const newFilters = { ...filters, minPrice, maxPrice };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const emptyFilters: PropertyFilterType = {
      propertyType: undefined,
      bedrooms: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      listingType: undefined,
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-medium">
          <Filter className="h-5 w-5" />
          <span>Filters:</span>
        </div>
        
        <Select 
          value={filters.listingType || 'all'} 
          onValueChange={(value) => handleFilterChange('listingType', value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Listing Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
            <SelectItem value="lease">For Lease</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.propertyType || 'all'} 
          onValueChange={(value) => handleFilterChange('propertyType', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="pg">PG (Paying Guest)</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.bedrooms?.toString() || 'any'} 
          onValueChange={(value) => handleFilterChange('bedrooms', value === 'any' ? undefined : parseInt(value))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="BHK" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any BHK</SelectItem>
            <SelectItem value="1">1 BHK</SelectItem>
            <SelectItem value="2">2 BHK</SelectItem>
            <SelectItem value="3">3 BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={
            filters.minPrice === 2000000 && filters.maxPrice === 4000000 ? '20-40' :
            filters.minPrice === 4000000 && filters.maxPrice === 6000000 ? '40-60' :
            filters.minPrice === 6000000 && filters.maxPrice === 8000000 ? '60-80' :
            filters.minPrice === 8000000 && filters.maxPrice === 10000000 ? '80-1cr' :
            filters.minPrice === 10000000 && !filters.maxPrice ? '1cr+' :
            'any-budget'
          }
          onValueChange={handleBudgetChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any-budget">Any Budget</SelectItem>
            <SelectItem value="20-40">₹20L - ₹40L</SelectItem>
            <SelectItem value="40-60">₹40L - ₹60L</SelectItem>
            <SelectItem value="60-80">₹60L - ₹80L</SelectItem>
            <SelectItem value="80-1cr">₹80L - ₹1Cr</SelectItem>
            <SelectItem value="1cr+">₹1Cr+</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default PropertyFilters;
