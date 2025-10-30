import React, { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Check, X } from 'lucide-react';
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
import { enhancedLocationService } from '@/services/enhancedLocationService';

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

interface LocationSelectorProps {
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
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  showLabels = true,
  className = '',
  disabled = false,
  placeholder = {}
}) => {
  // State for each dropdown
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  // Search queries
  const [stateQuery, setStateQuery] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  // Suggestions
  const [stateSuggestions, setStateSuggestions] = useState<LocationSearchResult[]>([]);
  const [districtSuggestions, setDistrictSuggestions] = useState<LocationSearchResult[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<LocationSearchResult[]>([]);

  // Load states on component mount
  useEffect(() => {
    const states = localLocationService.getStatesByCountry('IN');
    setStateSuggestions(states.map(state => ({
      id: state.id,
      name: state.name,
      type: 'state' as const,
      fullPath: `India > ${state.name}`,
      countryCode: 'IN'
    })));
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (value.stateCode) {
      const districts = localLocationService.getDistrictsByState(value.stateCode);
      setDistrictSuggestions(districts.map(district => ({
        id: district.id,
        name: district.name,
        type: 'district' as const,
        fullPath: `India > ${value.state} > ${district.name}`,
        countryCode: 'IN',
        stateCode: value.stateCode
      })));
    } else {
      setDistrictSuggestions([]);
    }
    // Reset district and city when state changes
    if (value.district) {
      onChange({
        ...value,
        district: '',
        districtCode: '',
        city: '',
        cityCode: ''
      });
    }
  }, [value.stateCode]);

  // Load cities when district changes
  useEffect(() => {
    if (value.districtCode) {
      const cities = localLocationService.getCitiesByDistrict(value.districtCode);
      setCitySuggestions(cities.map(city => ({
        id: city.id,
        name: city.name,
        type: 'city' as const,
        fullPath: `India > ${value.state} > ${value.district} > ${city.name}`,
        countryCode: 'IN',
        stateCode: value.stateCode,
        districtId: value.districtCode
      })));
    } else {
      setCitySuggestions([]);
    }
    // Reset city when district changes
    if (value.city) {
      onChange({
        ...value,
        city: '',
        cityCode: ''
      });
    }
  }, [value.districtCode]);

  // Filter functions
  const getFilteredStates = () => {
    if (!stateQuery) return stateSuggestions;
    return stateSuggestions.filter(state => 
      state.name.toLowerCase().includes(stateQuery.toLowerCase())
    );
  };

  const getFilteredDistricts = () => {
    if (!districtQuery) return districtSuggestions;
    return districtSuggestions.filter(district => 
      district.name.toLowerCase().includes(districtQuery.toLowerCase())
    );
  };

  const getFilteredCities = () => {
    if (!cityQuery) return citySuggestions;
    return citySuggestions.filter(city => 
      city.name.toLowerCase().includes(cityQuery.toLowerCase())
    );
  };

  // Selection handlers
  const handleStateSelect = (stateResult: LocationSearchResult) => {
    onChange({
      country: 'India',
      countryCode: 'IN',
      state: stateResult.name,
      stateCode: stateResult.id,
      district: '',
      districtCode: '',
      city: '',
      cityCode: ''
    });
    setStateQuery('');
    setStateOpen(false);
  };

  const handleDistrictSelect = (districtResult: LocationSearchResult) => {
    onChange({
      ...value,
      district: districtResult.name,
      districtCode: districtResult.id,
      city: '',
      cityCode: ''
    });
    setDistrictQuery('');
    setDistrictOpen(false);
  };

  const handleCitySelect = (cityResult: LocationSearchResult) => {
    onChange({
      ...value,
      city: cityResult.name,
      cityCode: cityResult.id
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
          <Label className="text-sm font-medium">Country</Label>
          <div className="relative">
            <Input
              value="India"
              disabled={true}
              className="bg-muted"
            />
            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
              Fixed
            </Badge>
          </div>
        </div>
      )}

      {/* State Field */}
      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">State *</Label>}
        <Popover open={stateOpen} onOpenChange={setStateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={stateOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {value.state || placeholder.state || "Select state..."}
              </span>
              <div className="flex items-center gap-1">
                {value.state && (
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
                <CommandEmpty>No states found.</CommandEmpty>
                <CommandGroup>
                  {getFilteredStates().map((state) => (
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
              disabled={disabled || !value.stateCode}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {value.district || placeholder.district || "Select district..."}
              </span>
              <div className="flex items-center gap-1">
                {value.district && (
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
                  {value.stateCode ? "No districts found." : "Please select a state first."}
                </CommandEmpty>
                <CommandGroup>
                  {getFilteredDistricts().map((district) => (
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
              disabled={disabled || !value.districtCode}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {value.city || placeholder.city || "Select city..."}
              </span>
              <div className="flex items-center gap-1">
                {value.city && (
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
                  {value.districtCode ? "No cities found." : "Please select a district first."}
                </CommandEmpty>
                <CommandGroup>
                  {getFilteredCities().map((city) => (
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
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Selected Location:</div>
          <div className="text-sm font-medium">
            {[value.city, value.district, value.state, 'India'].filter(Boolean).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
