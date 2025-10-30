import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ChevronDown, Check, X, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { localLocationService, type LocationSearchResult } from '@/services/localLocationService';
import { enhancedLocationService, type State, type District, type City } from '@/services/enhancedLocationService';
import { toast } from '@/hooks/use-toast';

interface LocationData {
  country?: string;
  countryCode?: string;
  state?: string;
  stateCode?: string;
  district?: string;
  districtCode?: string;
  city?: string;
  cityCode?: string;
}

interface EnhancedLocationSelectorProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  showLabels?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: {
    state?: string;
    district?: string;
    city?: string;
  };
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const EnhancedLocationSelector: React.FC<EnhancedLocationSelectorProps> = ({
  value,
  onChange,
  showLabels = true,
  className,
  disabled = false,
  placeholder = {
    state: 'Select state...',
    district: 'Select district...',
    city: 'Select city...'
  },
  showValidation = false,
  onValidationChange
}) => {
  // State for dropdowns
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  // Search queries
  const [stateQuery, setStateQuery] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  // Data states
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Validation state
  const [validation, setValidation] = useState({ isValid: true, errors: [] });

  // Load states on component mount
  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const stateData = await enhancedLocationService.getStatesWithFallback('IN');
        setStates(stateData);
      } catch (error) {
        console.error('Error loading states:', error);
        toast({
          title: "Error",
          description: "Failed to load states. Using offline data.",
          variant: "destructive",
        });
        // Fallback to local service
        const localStates = localLocationService.getStatesByCountry('IN');
        setStates(localStates);
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (!value.stateCode) {
        setDistricts([]);
        return;
      }

      setLoadingDistricts(true);
      try {
        const districtData = await enhancedLocationService.getDistrictsWithFallback(value.stateCode);
        setDistricts(districtData);
      } catch (error) {
        console.error('Error loading districts:', error);
        // Fallback to local service
        const localDistricts = localLocationService.getDistrictsByState(value.stateCode);
        setDistricts(localDistricts);
      } finally {
        setLoadingDistricts(false);
      }
    };

    loadDistricts();
  }, [value.stateCode]);

  // Load cities when district changes
  useEffect(() => {
    const loadCities = async () => {
      if (!value.districtCode) {
        setCities([]);
        return;
      }

      setLoadingCities(true);
      try {
        const cityData = await enhancedLocationService.getCitiesWithFallback(value.districtCode);
        setCities(cityData);
      } catch (error) {
        console.error('Error loading cities:', error);
        // Fallback to local service
        const localCities = localLocationService.getCitiesByDistrict(value.districtCode);
        setCities(localCities);
      } finally {
        setLoadingCities(false);
      }
    };

    loadCities();
  }, [value.districtCode]);

  // Validation effect
  useEffect(() => {
    if (showValidation && (value.stateCode || value.districtCode || value.cityCode)) {
      const validateLocation = async () => {
        try {
          const result = await enhancedLocationService.validateLocation(
            value.stateCode,
            value.districtCode,
            value.cityCode
          );
          setValidation(result);
          onValidationChange?.(result.isValid, result.errors);
        } catch (error) {
          console.error('Validation error:', error);
        }
      };

      validateLocation();
    }
  }, [value.stateCode, value.districtCode, value.cityCode, showValidation, onValidationChange]);

  // Filter functions with memoization
  const filteredStates = useMemo(() => {
    if (!stateQuery) return states;
    return states.filter(state => 
      state.name.toLowerCase().includes(stateQuery.toLowerCase())
    );
  }, [states, stateQuery]);

  const filteredDistricts = useMemo(() => {
    if (!districtQuery) return districts;
    return districts.filter(district => 
      district.name.toLowerCase().includes(districtQuery.toLowerCase())
    );
  }, [districts, districtQuery]);

  const filteredCities = useMemo(() => {
    if (!cityQuery) return cities;
    return cities.filter(city => 
      city.name.toLowerCase().includes(cityQuery.toLowerCase())
    );
  }, [cities, cityQuery]);

  // Selection handlers
  const handleStateSelect = (state: State) => {
    onChange({
      country: 'India',
      countryCode: 'IN',
      state: state.name,
      stateCode: state.id,
      district: '',
      districtCode: '',
      city: '',
      cityCode: ''
    });
    setStateQuery('');
    setStateOpen(false);
  };

  const handleDistrictSelect = (district: District) => {
    onChange({
      ...value,
      district: district.name,
      districtCode: district.id,
      city: '',
      cityCode: ''
    });
    setDistrictQuery('');
    setDistrictOpen(false);
  };

  const handleCitySelect = (city: City) => {
    onChange({
      ...value,
      city: city.name,
      cityCode: city.id
    });
    setCityQuery('');
    setCityOpen(false);
  };

  // Clear functions
  const clearState = () => {
    onChange({
      country: 'India',
      countryCode: 'IN',
      state: '',
      stateCode: '',
      district: '',
      districtCode: '',
      city: '',
      cityCode: ''
    });
  };

  const clearDistrict = () => {
    onChange({
      ...value,
      district: '',
      districtCode: '',
      city: '',
      cityCode: ''
    });
  };

  const clearCity = () => {
    onChange({
      ...value,
      city: '',
      cityCode: ''
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Country Field - Fixed to India */}
      {showLabels && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Country
          </Label>
          <div className="relative">
            <Input
              value="India"
              disabled={true}
              className="bg-muted cursor-not-allowed"
            />
            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-800">
              Fixed
            </Badge>
          </div>
        </div>
      )}

      {/* State Field */}
      <div className="space-y-2">
        {showLabels && (
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            State *
          </Label>
        )}
        <Popover open={stateOpen} onOpenChange={setStateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={stateOpen}
              className="w-full justify-between"
              disabled={disabled || loadingStates}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {loadingStates ? 'Loading states...' : (value.state || placeholder.state)}
              </span>
              <div className="flex items-center gap-1">
                {value.state && !disabled && (
                  <X
                    className="w-4 h-4 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearState();
                    }}
                  />
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search states..." 
                value={stateQuery}
                onValueChange={setStateQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {loadingStates ? "Loading..." : "No states found."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredStates.map((state) => (
                    <CommandItem
                      key={state.id}
                      value={state.name}
                      onSelect={() => handleStateSelect(state)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.stateCode === state.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {state.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* District Field */}
      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">District *</Label>}
        <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={districtOpen}
              className="w-full justify-between"
              disabled={disabled || !value.stateCode || loadingDistricts}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {loadingDistricts ? 'Loading districts...' : (value.district || placeholder.district)}
              </span>
              <div className="flex items-center gap-1">
                {value.district && !disabled && (
                  <X
                    className="w-4 h-4 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDistrict();
                    }}
                  />
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search districts..." 
                value={districtQuery}
                onValueChange={setDistrictQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {value.stateCode ? (loadingDistricts ? "Loading..." : "No districts found.") : "Please select a state first."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredDistricts.map((district) => (
                    <CommandItem
                      key={district.id}
                      value={district.name}
                      onSelect={() => handleDistrictSelect(district)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.districtCode === district.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {district.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* City Field */}
      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">City *</Label>}
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between"
              disabled={disabled || !value.districtCode || loadingCities}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {loadingCities ? 'Loading cities...' : (value.city || placeholder.city)}
              </span>
              <div className="flex items-center gap-1">
                {value.city && !disabled && (
                  <X
                    className="w-4 h-4 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCity();
                    }}
                  />
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search cities..." 
                value={cityQuery}
                onValueChange={setCityQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {value.districtCode ? (loadingCities ? "Loading..." : "No cities found.") : "Please select a district first."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredCities.map((city) => (
                    <CommandItem
                      key={city.id}
                      value={city.name}
                      onSelect={() => handleCitySelect(city)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.cityCode === city.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {city.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary */}
      {(value.state || value.district || value.city) && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Selected Location:</div>
          <div className="text-sm font-medium">
            {[value.city, value.district, value.state, 'India'].filter(Boolean).join(', ')}
          </div>
          {showValidation && !validation.isValid && (
            <div className="mt-2 text-sm text-destructive">
              Issues: {validation.errors.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Data source indicator */}
      <div className="text-xs text-muted-foreground text-center">
        Powered by local location database with {states.length} states, {districts.length} districts, {cities.length} cities
      </div>
    </div>
  );
};

export default EnhancedLocationSelector;
