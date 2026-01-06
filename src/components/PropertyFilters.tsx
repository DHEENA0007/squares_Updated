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
  const [filters, setFilters] = useState<PropertyFilterType>({});
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [filterConfigurations, setFilterConfigurations] = useState<FilterConfiguration[]>([]);
  const [filterDependencies, setFilterDependencies] = useState<import('@/types/configuration').FilterDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch configuration data on component mount
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        setIsLoading(true);
        // Fetch property types and all filter configurations
        const [typesData, filtersData, dependenciesData] = await Promise.all([
          configurationService.getAllPropertyTypes(false),
          configurationService.getAllFilterConfigurations(false),
          configurationService.getFilterDependencies(),
        ]);

        setPropertyTypes(typesData);
        setFilterConfigurations(filtersData);
        setFilterDependencies(dependenciesData);

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

  const handleFilterChange = (key: string, value: any) => {
    let newFilters: PropertyFilterType = { ...filters, [key]: value === 'all' || value === 'any' || value === 'any-budget' ? undefined : value };

    // Special handling for budget to set min/max price
    if (key === 'budget') {
      if (value === 'any-budget') {
        newFilters.minPrice = undefined;
        newFilters.maxPrice = undefined;
      } else {
        const selectedBudget = filterConfigurations.find(f => (f.id || f._id) === value);
        if (selectedBudget) {
          newFilters.minPrice = selectedBudget.minValue;
          newFilters.maxPrice = selectedBudget.maxValue;
        }
      }
      // Don't send 'budget' key to API if it's just for UI
      delete newFilters.budget;
    }

    // Helper to check dependency with a given set of filters (e.g., newFilters)
    const checkDependencyWithTempFilters = (filterType: string, currentTempFilters: PropertyFilterType) => {
      const dependency = filterDependencies.find(d => d.targetFilterType === filterType);
      if (!dependency) {
        return true; // No dependency, always show
      }

      let sourceValue;
      // Special handling for propertyType which might be stored as 'propertyType' key but dependency refers to 'property_type'
      if (dependency.sourceFilterType === 'property_type') {
        sourceValue = currentTempFilters.propertyType;
      } else {
        sourceValue = currentTempFilters[dependency.sourceFilterType];
      }

      if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return false;

      return dependency.sourceFilterValues.includes(sourceValue);
    };

    // Clear dependent filters if their parent filter's value changes and dependency is no longer met
    const allFilterTypes = getUniqueFilterTypes(); // Get all possible filter types
    for (const dependentFilterType of allFilterTypes) {
      // Skip the filter that just changed
      if (dependentFilterType === key || (dependentFilterType === 'property_type' && key === 'propertyType')) {
        continue;
      }

      // If the dependent filter is currently set, and its dependency is no longer met with the new parent value
      if (newFilters[dependentFilterType] !== undefined && !checkDependencyWithTempFilters(dependentFilterType, newFilters)) {
        newFilters[dependentFilterType] = undefined;
        // If it was a budget filter, clear min/max price too
        if (dependentFilterType === 'budget') {
          newFilters.minPrice = undefined;
          newFilters.maxPrice = undefined;
        }
      }
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  // Helper to get unique filter types
  const getUniqueFilterTypes = () => {
    const types = new Set(filterConfigurations.map(f => f.filterType));
    return Array.from(types).sort();
  };

  // Helper to get options for a filter type
  const getOptionsForType = (type: string) => {
    return filterConfigurations.filter(f => f.filterType === type).sort((a, b) => a.displayOrder - b.displayOrder);
  };

  // Helper to check if a filter should be shown
  const shouldShowFilter = (filterType: string) => {
    // Check if there are any dependencies for this filter type
    const dependency = filterDependencies.find(d => d.targetFilterType === filterType);

    if (!dependency) {
      return true; // No dependency, always show
    }

    // Check if the source filter has the required value
    let sourceValue;
    // Special handling for propertyType which might be stored as 'propertyType' key but dependency refers to 'property_type'
    // In our dependency UI we used 'property_type' as the source key for Property Type
    if (dependency.sourceFilterType === 'property_type') {
      sourceValue = filters.propertyType;
    } else {
      sourceValue = filters[dependency.sourceFilterType];
    }

    if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return false;

    return dependency.sourceFilterValues.includes(sourceValue);
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

  const uniqueFilterTypes = getUniqueFilterTypes();

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-medium">
          <Filter className="h-5 w-5" />
          <span>Filters:</span>
        </div>

        {/* Listing Type (Special handling for display order if needed, or just part of dynamic loop) */}
        {/* We'll prioritize Listing Type and Property Type if they exist */}

        {getOptionsForType('listing_type').length > 0 && shouldShowFilter('listing_type') && (
          <Select
            value={filters.listingType || 'all'}
            onValueChange={(value) => handleFilterChange('listingType', value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Listing Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getOptionsForType('listing_type').map((type) => (
                <SelectItem key={type.id || type._id} value={type.value}>
                  {type.displayLabel || type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {propertyTypes.length > 0 && shouldShowFilter('property_type') && (
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
        )}

        {/* Dynamic Filters */}
        {uniqueFilterTypes
          .filter(type => type !== 'listing_type' && type !== 'property_type') // Already handled or special case
          .filter(type => shouldShowFilter(type)) // Check dependencies
          .map(filterType => {
            const options = getOptionsForType(filterType);
            if (options.length === 0) return null;

            // Determine label
            const label = filterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Determine value
            // For budget, we might store the ID to look up min/max later
            const currentValue = filters[filterType] || (filterType === 'budget' ? 'any-budget' : 'any');

            return (
              <Select
                key={filterType}
                value={currentValue}
                onValueChange={(value) => handleFilterChange(filterType, value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={filterType === 'budget' ? 'any-budget' : 'any'}>Any {label}</SelectItem>
                  {options.map((option) => (
                    <SelectItem key={option.id || option._id} value={filterType === 'budget' ? (option.id || option._id) : option.value}>
                      {option.displayLabel || option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default PropertyFilters;
