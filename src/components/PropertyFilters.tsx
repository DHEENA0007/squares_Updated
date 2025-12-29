import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { configurationService } from "@/services/configurationService";
import type { PropertyType, FilterConfiguration } from "@/types/configuration";

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilterType) => void;
  initialFilters?: PropertyFilterType;
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
  const [listingTypes, setListingTypes] = useState<FilterConfiguration[]>([]);
  const [bedroomTypes, setBedroomTypes] = useState<FilterConfiguration[]>([]);
  const [budgetTypes, setBudgetTypes] = useState<FilterConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch configuration data on component mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setIsLoading(true);
        // Fetch property types and all filter configurations
        const [typesData, listingTypesData, bedroomTypesData, budgetTypesData] = await Promise.all([
          configurationService.getAllPropertyTypes(false),
          configurationService.getFilterConfigurationsByType('listing_type', false),
          configurationService.getFilterConfigurationsByType('bedroom', false),
          configurationService.getFilterConfigurationsByType('budget', false),
        ]);

        setPropertyTypes(typesData);
        setListingTypes(listingTypesData);
        setBedroomTypes(bedroomTypesData);
        setBudgetTypes(budgetTypesData);

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

  const handleBudgetChange = (budgetId: string) => {
    if (budgetId === 'any-budget') {
      const newFilters = { ...filters, minPrice: undefined, maxPrice: undefined };
      setFilters(newFilters);
      onFilterChange(newFilters);
      return;
    }

    const selectedBudget = budgetTypes.find(b => (b.id || b._id) === budgetId);

    if (selectedBudget) {
      const newFilters = {
        ...filters,
        minPrice: selectedBudget.minValue,
        maxPrice: selectedBudget.maxValue
      };
      setFilters(newFilters);
      onFilterChange(newFilters);
    }
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
              <SelectItem key={type.id || type._id} value={type.value}>
                {type.displayLabel || type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.propertyType ? propertyTypes.find(t => t.value.toLowerCase() === filters.propertyType?.toLowerCase())?.id || propertyTypes.find(t => t.value.toLowerCase() === filters.propertyType?.toLowerCase())?._id || 'all' : 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              handleFilterChange('propertyType', 'all');
            } else {
              const type = propertyTypes.find(t => (t.id || t._id) === value);
              if (type) {
                handleFilterChange('propertyType', type.value);
              }
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {propertyTypes.map((type) => (
              <SelectItem key={type.id || type._id} value={type.id || type._id}>
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
            {bedroomTypes.map((type) => (
              <SelectItem key={type.id || type._id} value={type.value}>
                {type.displayLabel || type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            budgetTypes.find(b => b.minValue === filters.minPrice && b.maxValue === filters.maxPrice)?.id ||
            budgetTypes.find(b => b.minValue === filters.minPrice && b.maxValue === filters.maxPrice)?._id ||
            'any-budget'
          }
          onValueChange={handleBudgetChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any-budget">Any Budget</SelectItem>
            {budgetTypes.map((type) => (
              <SelectItem key={type.id || type._id} value={type.id || type._id}>
                {type.displayLabel || type.name}
              </SelectItem>
            ))}
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
