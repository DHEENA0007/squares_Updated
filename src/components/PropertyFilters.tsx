import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Loader2, Search } from "lucide-react";
import { PropertyFilters as PropertyFilterType } from "@/services/propertyService";
import { configurationService } from "@/services/configurationService";
import type { PropertyType, FilterConfiguration } from "@/types/configuration";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { locaService, type PincodeSuggestion } from "@/services/locaService";

interface PropertyFiltersProps {
    onFilterChange: (filters: PropertyFilterType) => void;
    initialFilters?: PropertyFilterType;
}

const LocationSearch = ({ value, onChange }: { value?: string, onChange: (value: string) => void }) => {
    const [query, setQuery] = useState(value || "");
    const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(locaService.isReady());
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        locaService.initialize().then(() => setIsReady(true));
    }, []);

    // Sync state with prop
    useEffect(() => {
        if (value !== undefined) {
            setQuery(value);
        }
    }, [value]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setQuery(newVal);
        // Don't trigger onChange here to prevent auto-refreshing properties

        if (newVal.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoading(true);
        // Small delay to allow UI update
        setTimeout(() => {
            const results = locaService.searchLocations(newVal);
            setSuggestions(results);
            setLoading(false);
            setShowSuggestions(true);
        }, 100);
    };

    const handleSelect = (suggestion: PincodeSuggestion) => {
        setQuery(suggestion.city);
        onChange(suggestion.city);
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-[200px]">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={isReady ? "Search Location..." : "Loading..."}
                    value={query}
                    onChange={handleInputChange}
                    className="pl-8 bg-background"
                    disabled={!isReady}
                    onFocus={() => {
                        if (query.length >= 2) setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onChange(query);
                            setShowSuggestions(false);
                        }
                    }}
                />
                {loading && (
                    <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {showSuggestions && (
                <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                            <div
                                key={`${suggestion.pincode}-${index}`}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                                onClick={() => handleSelect(suggestion)}
                            >
                                <div className="font-medium">{suggestion.city}</div>
                                <div className="text-xs text-muted-foreground">
                                    {suggestion.district}, {suggestion.state}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                            No locations found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

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

                {/* Location Filter (Custom LocaService Implementation) */}
                <LocationSearch
                    value={filters.location}
                    onChange={(val) => handleFilterChange('location', val)}
                />

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
                    .filter(type => type !== 'listing_type' && type !== 'property_type' && type !== 'location') // Exclude location as we handle it manually
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
