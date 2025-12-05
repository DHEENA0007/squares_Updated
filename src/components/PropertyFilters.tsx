import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { configurationService } from "@/services/configurationService";
import type { PropertyType } from "@/types/configuration";

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilterType) => void;
  initialFilters?: PropertyFilterType;
}

interface BudgetRange {
  id: string;
  name: string;
  displayLabel: string;
  minValue: number | null;
  maxValue: number | null;
}

const PropertyFilters = ({ onFilterChange, initialFilters }: PropertyFiltersProps) => {
  const [filters, setFilters] = useState<PropertyFilterType>({
    propertyType: undefined,
    bedrooms: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    listingType: undefined,
  });
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [budgetRanges, setBudgetRanges] = useState<BudgetRange[]>([]);
  const [listingTypes, setListingTypes] = useState<Array<{ id: string; name: string; value: string; displayLabel?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch configuration data on component mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setIsLoading(true);
        // Fetch property types and listing types from configuration
        const [typesData, listingTypesData] = await Promise.all([
          configurationService.getAllPropertyTypes(false),
          configurationService.getFilterConfigurationsByType('listing_type', false),
        ]);
        setPropertyTypes(typesData);
        setListingTypes(listingTypesData);

        // For now, use default budget ranges - can be configured later
        setBudgetRanges([
          { id: '20-40', name: '20-40L', displayLabel: '₹20L - ₹40L', minValue: 2000000, maxValue: 4000000 },
          { id: '40-60', name: '40-60L', displayLabel: '₹40L - ₹60L', minValue: 4000000, maxValue: 6000000 },
          { id: '60-80', name: '60-80L', displayLabel: '₹60L - ₹80L', minValue: 6000000, maxValue: 8000000 },
          { id: '80-1cr', name: '80L-1Cr', displayLabel: '₹80L - ₹1Cr', minValue: 8000000, maxValue: 10000000 },
          { id: '1cr+', name: '1Cr+', displayLabel: '₹1Cr+', minValue: 10000000, maxValue: null },
        ]);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilterData();
  }, []);

  // Update filters when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

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

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-muted-foreground">Loading filters...</span>
        </div>
      </div>
    );
  }

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
          disabled={isLoading}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={isLoading ? "Loading..." : "Listing Type"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {listingTypes.map((type) => (
              <SelectItem key={type.id} value={type.value}>
                {type.displayLabel || type.name}
              </SelectItem>
            ))}
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
            {propertyTypes.map((type) => (
              <SelectItem key={type.id} value={type.value}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.bedrooms?.toString() || 'any'} 
          onValueChange={(value) => {
            const bedroomValue = value === 'any' ? undefined : parseInt(value);
            handleFilterChange('bedrooms', bedroomValue && !isNaN(bedroomValue) ? bedroomValue : undefined);
          }}
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
