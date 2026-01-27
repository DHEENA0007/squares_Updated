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
        const locationString = `${suggestion.city}, ${suggestion.district}, ${suggestion.state}`;
        setQuery(locationString);
        onChange(locationString);
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
    const [filterConfigurations, setFilterConfigurations] = useState<FilterConfiguration[]>([]);
    const [filterDependencies, setFilterDependencies] = useState<import('@/types/configuration').FilterDependency[]>([]);
    const [optionVisibilityRules, setOptionVisibilityRules] = useState<import('@/types/configuration').FilterOptionVisibility[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch configuration data on component mount
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                setIsLoading(true);
                // Fetch all filter configurations and dependencies
                // We'll fetch them individually to handle errors more gracefully
                const [filtersData, dependenciesData, visibilityData] = await Promise.all([
                    configurationService.getAllFilterConfigurations(false).catch(err => {
                        console.error('Error fetching filter configurations:', err);
                        return [];
                    }),
                    configurationService.getFilterDependencies().catch(err => {
                        console.error('Error fetching filter dependencies:', err);
                        return [];
                    }),
                    configurationService.getFilterOptionVisibility().catch(err => {
                        console.error('Error fetching filter visibility:', err);
                        return [];
                    }),
                ]);

                setFilterConfigurations(filtersData);
                setFilterDependencies(dependenciesData);
                setOptionVisibilityRules(visibilityData);



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
            // Special handling for propertyType/listingType which might be stored as camelCase but dependency refers to snake_case
            if (dependency.sourceFilterType === 'property_type') {
                sourceValue = currentTempFilters.propertyType;
            } else if (dependency.sourceFilterType === 'listing_type') {
                sourceValue = currentTempFilters.listingType;
            } else {
                sourceValue = currentTempFilters[dependency.sourceFilterType];
            }

            if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return false;

            return dependency.sourceFilterValues.some(v => String(v).toLowerCase() === String(sourceValue).toLowerCase());
        };

        // Helper to check if a specific option should be shown with temp filters
        const checkOptionVisibilityWithTempFilters = (filterType: string, optionValue: string, currentTempFilters: PropertyFilterType) => {
            const rules = optionVisibilityRules.filter(r => r.filterType === filterType && r.optionValue === optionValue);
            if (rules.length === 0) return true;

            return rules.some(rule => {
                let sourceValue;
                if (rule.sourceFilterType === 'property_type') {
                    sourceValue = currentTempFilters.propertyType;
                } else if (rule.sourceFilterType === 'listing_type') {
                    sourceValue = currentTempFilters.listingType;
                } else {
                    sourceValue = currentTempFilters[rule.sourceFilterType];
                }
                if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return true;
                return rule.sourceFilterValues.some(v => String(v).toLowerCase() === String(sourceValue).toLowerCase());
            });
        };

        // Clear dependent filters if their parent filter's value changes and dependency is no longer met
        const allFilterTypes = getUniqueFilterTypes(); // Get all possible filter types
        for (const dependentFilterType of allFilterTypes) {
            // Skip the filter that just changed
            if (dependentFilterType === key || (dependentFilterType === 'property_type' && key === 'propertyType')) {
                continue;
            }

            const currentValue = newFilters[dependentFilterType];
            if (currentValue !== undefined) {
                // Check category-level dependency
                const isCategoryVisible = checkDependencyWithTempFilters(dependentFilterType, newFilters);

                // Check option-level visibility
                const isOptionVisible = checkOptionVisibilityWithTempFilters(dependentFilterType, currentValue, newFilters);

                if (!isCategoryVisible || !isOptionVisible) {
                    newFilters[dependentFilterType] = undefined;
                    // If it was a budget filter, clear min/max price too
                    if (dependentFilterType === 'budget') {
                        newFilters.minPrice = undefined;
                        newFilters.maxPrice = undefined;
                    }
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
        const types = Array.from(new Set(filterConfigurations.map(f => f.filterType)));

        // Define standard filters that should appear at the beginning
        const standardFilters = ['location', 'listing_type', 'property_type'];

        return types.sort((a, b) => {
            const isAStandard = standardFilters.includes(a);
            const isBStandard = standardFilters.includes(b);

            // If one is standard and other is "new" (dynamic), standard comes first (left)
            if (isAStandard && !isBStandard) return -1;
            if (!isAStandard && isBStandard) return 1;

            // If both are standard, maintain their specific relative order
            if (isAStandard && isBStandard) {
                return standardFilters.indexOf(a) - standardFilters.indexOf(b);
            }

            // If both are dynamic, sort alphabetically
            return a.localeCompare(b);
        });
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
        // Special handling for propertyType/listingType which might be stored as camelCase but dependency refers to snake_case
        if (dependency.sourceFilterType === 'property_type') {
            sourceValue = filters.propertyType;
        } else if (dependency.sourceFilterType === 'listing_type') {
            sourceValue = filters.listingType;
        } else {
            sourceValue = filters[dependency.sourceFilterType];
        }

        if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return false;

        return dependency.sourceFilterValues.some(v => String(v).toLowerCase() === String(sourceValue).toLowerCase());
    };

    // Helper to check if a specific option should be shown
    const shouldShowOption = (filterType: string, optionValue: string) => {
        const rules = optionVisibilityRules.filter(r => r.filterType === filterType && r.optionValue === optionValue);

        if (rules.length === 0) return true; // No rules for this option, show by default

        // If there are rules, at least one must be satisfied
        return rules.some(rule => {
            let sourceValue;
            if (rule.sourceFilterType === 'property_type') {
                sourceValue = filters.propertyType;
            } else if (rule.sourceFilterType === 'listing_type') {
                sourceValue = filters.listingType;
            } else {
                sourceValue = filters[rule.sourceFilterType];
            }

            if (!sourceValue || sourceValue === 'all' || sourceValue === 'any' || sourceValue === 'any-budget') return true;

            return rule.sourceFilterValues.some(v => String(v).toLowerCase() === String(sourceValue).toLowerCase());
        });
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

                {/* Location Filter - Always First */}
                <LocationSearch
                    value={filters.location}
                    onChange={(val) => handleFilterChange('location', val)}
                />

                {/* Dynamic Filters from Admin Configuration */}
                {uniqueFilterTypes
                    .filter(type => shouldShowFilter(type) && type !== 'location') // Check dependencies and exclude location
                    .map(filterType => {
                        const options = getOptionsForType(filterType);
                        if (options.length === 0) return null;

                        // Determine label
                        const label = filterType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                        // Determine current value
                        const currentValue = filters[filterType === 'listing_type' ? 'listingType' : filterType === 'property_type' ? 'propertyType' : filterType] || (filterType === 'budget' ? 'any-budget' : 'any');

                        return (
                            <Select
                                key={filterType}
                                value={currentValue}
                                onValueChange={(value) => {
                                    const key = filterType === 'listing_type' ? 'listingType' :
                                        filterType === 'property_type' ? 'propertyType' :
                                            filterType;
                                    handleFilterChange(key, value);
                                }}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder={label} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={filterType === 'budget' ? 'any-budget' : 'any'}>Any {label}</SelectItem>
                                    {options
                                        .filter(opt => shouldShowOption(filterType, opt.value))
                                        .map((option) => (
                                            <SelectItem key={option.id || option._id} value={filterType === 'budget' ? (option.id || option._id) : option.value}>
                                                <span>{option.displayLabel || option.name}</span>
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
