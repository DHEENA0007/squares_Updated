import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Check, Loader2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { locationService } from '@/services/locationService';

interface LocationField {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  required?: boolean;
  type: 'country' | 'state' | 'district' | 'city' | 'taluk' | 'locationName' | 'pincode';
}

interface LocationData {
  country?: string;
  countryCode?: string;
  state?: string;
  stateCode?: string;
  district?: string;
  city?: string;
  taluk?: string;
  locationName?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

interface Suggestion {
  id: string;
  name: string;
  code?: string;
  displayName?: string;
  relevance?: number;
  flag?: string;
  priority?: number;
  category?: string;
  extra?: {
    district?: string;
    state?: string;
    officename?: string;
  };
}

interface EnhancedAddressInputProps {
  onLocationChange: (locationData: LocationData) => void;
  initialData?: LocationData;
  showPincodeFirst?: boolean;
  className?: string;
}

const EnhancedAddressInput: React.FC<EnhancedAddressInputProps> = ({
  onLocationChange,
  initialData = {},
  showPincodeFirst = true,
  className = ""
}) => {
  const { toast } = useToast();
  const [locationData, setLocationData] = useState<LocationData>(initialData);

  // Update internal state when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setLocationData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  const [suggestions, setSuggestions] = useState<Record<string, Suggestion[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<Record<string, number>>({});
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  // Define location fields hierarchy
  const locationFields: LocationField[] = [
    { id: 'country', label: 'Country', placeholder: 'Enter country name...', value: locationData.country || '', required: true, type: 'country' },
    { id: 'state', label: 'State/Province', placeholder: 'Enter state name...', value: locationData.state || '', required: true, type: 'state' },
    { id: 'district', label: 'District', placeholder: 'Enter district name...', value: locationData.district || '', required: true, type: 'district' },
    { id: 'city', label: 'City', placeholder: 'Enter city name...', value: locationData.city || '', required: true, type: 'city' },
    { id: 'taluk', label: 'Taluk/Block', placeholder: 'Enter taluk name...', value: locationData.taluk || '', type: 'taluk' },
    { id: 'locationName', label: 'Location Name (Village/Urban)', placeholder: 'Enter location name...', value: locationData.locationName || '', type: 'locationName' },
    { id: 'pincode', label: 'Pincode/ZIP Code', placeholder: 'Enter 6-digit pincode...', value: locationData.pincode || '', required: true, type: 'pincode' }
  ];

  // Reorder fields if pincode should be first
  const orderedFields = showPincodeFirst
    ? [locationFields[6], ...locationFields.slice(0, 6)] // Move pincode to first
    : locationFields;

  // Auto-fill pincode based on location selection
  const autoFillPincode = useCallback(async (newLocationData: LocationData) => {
    // Only auto-fill if we have state, district, and city but no pincode
    if (newLocationData.state && newLocationData.district && newLocationData.city && !newLocationData.pincode) {
      try {
        console.log('Attempting to auto-fill pincode for:', newLocationData.state, newLocationData.district, newLocationData.city);

        // Try with city name as query to get more relevant results
        let pincodeResponse = await locationService.getPincodeSuggestions(
          newLocationData.city, // Use city name as query
          newLocationData.state,
          newLocationData.district
        );

        // If no results with city name, try with district name
        if (!pincodeResponse.success || pincodeResponse.suggestions.length === 0) {
          console.log('No results with city name, trying district name');
          pincodeResponse = await locationService.getPincodeSuggestions(
            newLocationData.district, // Use district name as query
            newLocationData.state,
            newLocationData.district
          );
        }

        // If still no results, try with just first few letters of city
        if (!pincodeResponse.success || pincodeResponse.suggestions.length === 0) {
          const cityPrefix = newLocationData.city.substring(0, 3);
          console.log('Trying with city prefix:', cityPrefix);
          pincodeResponse = await locationService.getPincodeSuggestions(
            cityPrefix,
            newLocationData.state,
            newLocationData.district
          );
        }

        console.log('Pincode response:', pincodeResponse);

        if (pincodeResponse.success && pincodeResponse.suggestions.length > 0) {
          console.log('Found', pincodeResponse.suggestions.length, 'pincode suggestions');

          // Filter by city with multiple matching strategies
          const cityMatchedPincodes = pincodeResponse.suggestions.filter(p => {
            const cityLower = newLocationData.city.toLowerCase();
            const districtLower = newLocationData.district.toLowerCase();

            const matches = (
              p.extra?.district?.toLowerCase().includes(cityLower) ||
              p.displayName?.toLowerCase().includes(cityLower) ||
              p.extra?.officename?.toLowerCase().includes(cityLower) ||
              // Also try matching city with district
              p.displayName?.toLowerCase().includes(districtLower) ||
              p.extra?.district?.toLowerCase() === districtLower ||
              // Match if city is part of office name
              p.extra?.officename?.toLowerCase().includes(cityLower.split(' ')[0]) ||
              // Additional matching strategies
              p.name?.toLowerCase().includes(cityLower) ||
              p.pincode?.toString().includes(cityLower) ||
              // Try partial matches
              cityLower.includes(p.extra?.district?.toLowerCase() || '') ||
              cityLower.includes(p.extra?.officename?.toLowerCase() || '')
            );

            if (matches) {
              console.log('Matched pincode:', p.pincode, 'for', cityLower);
            }

            return matches;
          });

          console.log('City matched pincodes:', cityMatchedPincodes.length);

          const relevantPincodes = cityMatchedPincodes.length > 0 ? cityMatchedPincodes : pincodeResponse.suggestions.slice(0, 10);

          if (relevantPincodes.length === 1) {
            // If only one pincode matches, auto-fill it
            const updatedData = {
              ...newLocationData,
              pincode: relevantPincodes[0].pincode
            };

            setLocationData(updatedData);
            onLocationChange(updatedData);

            toast({
              title: "Pincode Auto-Filled ✓",
              description: `Found pincode: ${relevantPincodes[0].pincode} for ${newLocationData.city}, ${newLocationData.district}`,
            });
          } else if (relevantPincodes.length > 1 && relevantPincodes.length <= 8) {
            // Multiple pincodes found but manageable number, show suggestions
            toast({
              title: "Multiple Pincodes Available",
              description: `Found ${relevantPincodes.length} pincodes for ${newLocationData.city}. Click on pincode field to see options.`,
            });

            // Auto-trigger pincode suggestions
            setSuggestions(prev => ({
              ...prev,
              pincode: relevantPincodes.map(p => ({
                id: p.pincode || p.id,
                name: p.pincode || p.name,
                code: p.pincode || p.code,
                displayName: p.displayName || `${p.pincode || p.name} - ${p.extra?.officename || p.extra?.district || 'Unknown Area'}`,
                relevance: p.relevance || 1,
                category: 'pincode',
                extra: p.extra
              }))
            }));
            setShowSuggestions(prev => ({ ...prev, pincode: true }));
          } else if (relevantPincodes.length > 8) {
            // Too many pincodes, just notify user
            toast({
              title: "Multiple Pincodes Found",
              description: `${relevantPincodes.length} pincodes found for ${newLocationData.city}. Please type in the pincode field to search.`,
            });
          } else {
            // No specific matches found, try with broader district search
            const districtPincodes = pincodeResponse.suggestions.slice(0, 5);
            if (districtPincodes.length > 0) {
              toast({
                title: "Pincodes Available",
                description: `Found pincodes for ${newLocationData.district} district. Please type in the pincode field to search.`,
              });
            }
          }
        } else {
          console.log('No pincode suggestions found for the location');
          // Try a more generic approach - notify user they can manually enter pincode
          toast({
            title: "Manual Pincode Entry",
            description: `Please enter the pincode for ${newLocationData.city}, ${newLocationData.district} manually.`,
          });
        }
      } catch (error) {
        console.error('Error auto-filling pincode:', error);
        // Show a helpful message to the user
        toast({
          title: "Pincode Not Found",
          description: `Please enter the pincode for ${newLocationData.city}, ${newLocationData.district} manually.`,
        });
      }
    }
  }, [onLocationChange, toast, setSuggestions, setShowSuggestions, setLocationData]);

  // Debounced search function
  const debouncedSearch = useCallback((fieldType: string, query: string) => {
    if (debounceRefs.current[fieldType]) {
      clearTimeout(debounceRefs.current[fieldType]);
    }

    debounceRefs.current[fieldType] = setTimeout(async () => {
      if (!query || query.length < 2) {
        setSuggestions(prev => ({ ...prev, [fieldType]: [] }));
        setShowSuggestions(prev => ({ ...prev, [fieldType]: false }));
        return;
      }

      setLoading(prev => ({ ...prev, [fieldType]: true }));

      try {
        let results: Suggestion[] = [];

        switch (fieldType) {
          case 'country':
            const countryResponse = await locationService.getCountrySuggestions(query);
            if (countryResponse.success) {
              results = countryResponse.suggestions.map(c => ({
                id: c.code,
                name: c.name,
                code: c.code,
                displayName: `${c.flag || ''} ${c.name}`,
                relevance: c.relevance,
                flag: c.flag
              }));
            }
            break;

          case 'state':
            const stateResponse = await locationService.getStateSuggestions(query, locationData.countryCode);
            if (stateResponse.success) {
              results = stateResponse.suggestions.map(s => ({
                id: s.code,
                name: s.name,
                code: s.code,
                displayName: s.name,
                relevance: s.relevance,
                category: s.category
              }));
            }
            break;

          case 'district':
            const districtResponse = await locationService.getDistrictSuggestions(query, locationData.stateCode);
            if (districtResponse.success) {
              results = districtResponse.suggestions.map(d => ({
                id: d.id,
                name: d.name,
                displayName: d.name,
                relevance: d.relevance
              }));
            }
            break;

          case 'city':
            const cityResponse = await locationService.getCitySuggestions(query, locationData.stateCode, locationData.district);
            if (cityResponse.success) {
              results = cityResponse.suggestions.map(c => ({
                id: c.id,
                name: c.name,
                displayName: c.name,
                relevance: c.relevance
              }));
            }
            break;

          case 'pincode':
            // Get pincode suggestions
            const pincodeResponse = await locationService.getPincodeSuggestions(
              query,
              locationData.state,
              locationData.district
            );
            if (pincodeResponse.success) {
              results = pincodeResponse.suggestions.map(p => ({
                id: p.pincode,
                name: p.pincode,
                code: p.pincode,
                displayName: p.displayName || `${p.pincode} - ${p.officename || p.district}`,
                relevance: p.relevance || 1,
                category: 'pincode',
                extra: {
                  district: p.district,
                  state: p.state,
                  officename: p.officename
                }
              }));
            }

            // Also handle complete 6-digit pincode auto-detection
            if (/^\d{6}$/.test(query)) {
              const pincodeData = await locationService.getLocationByPincode(query);
              if (pincodeData) {
                // Auto-fill all location fields
                const newLocationData = {
                  ...locationData,
                  pincode: query,
                  country: pincodeData.country || 'India',
                  countryCode: 'IN',
                  state: pincodeData.state,
                  stateCode: pincodeData.stateCode,
                  district: pincodeData.district,
                  city: pincodeData.city,
                  taluk: pincodeData.taluk,
                  locationName: pincodeData.locationName || pincodeData.locality,
                  latitude: pincodeData.latitude,
                  longitude: pincodeData.longitude,
                  formattedAddress: `${pincodeData.locality || pincodeData.area}, ${pincodeData.district}, ${pincodeData.state}, India - ${query}`
                };

                setLocationData(newLocationData);
                onLocationChange(newLocationData);

                toast({
                  title: "Address Auto-Detected ✓",
                  description: `Location found: ${pincodeData.area || pincodeData.locality}, ${pincodeData.district}, ${pincodeData.state}`,
                });

                return;
              }
            }
            break;

          default:
            // Generic address search for taluk and locationName
            const addressResponse = await locationService.searchAddress(query);
            if (addressResponse.success) {
              results = addressResponse.results.map(r => ({
                id: r.id,
                name: r.displayName,
                displayName: r.displayName,
                relevance: r.relevance
              }));
            }
        }

        setSuggestions(prev => ({ ...prev, [fieldType]: results }));
        setShowSuggestions(prev => ({ ...prev, [fieldType]: results.length > 0 }));
        setActiveSuggestionIndex(prev => ({ ...prev, [fieldType]: 0 }));

      } catch (error) {
        console.error(`Error fetching ${fieldType} suggestions:`, error);
        setSuggestions(prev => ({ ...prev, [fieldType]: [] }));
        setShowSuggestions(prev => ({ ...prev, [fieldType]: false }));
      } finally {
        setLoading(prev => ({ ...prev, [fieldType]: false }));
      }
    }, 300);
  }, [locationData, onLocationChange, toast]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (fieldType: string, suggestion: Suggestion) => {
    const newLocationData = { ...locationData };

    switch (fieldType) {
      case 'country':
        newLocationData.country = suggestion.name;
        newLocationData.countryCode = suggestion.code || suggestion.id;
        // Clear dependent fields
        newLocationData.state = '';
        newLocationData.stateCode = '';
        newLocationData.district = '';
        newLocationData.city = '';
        newLocationData.taluk = '';
        newLocationData.locationName = '';
        newLocationData.pincode = '';
        break;

      case 'state':
        newLocationData.state = suggestion.name;
        newLocationData.stateCode = suggestion.code || suggestion.id;
        // Clear dependent fields
        newLocationData.district = '';
        newLocationData.city = '';
        newLocationData.taluk = '';
        newLocationData.locationName = '';
        newLocationData.pincode = '';
        break;

      case 'district':
        newLocationData.district = suggestion.name;
        // Clear dependent fields
        newLocationData.city = '';
        newLocationData.taluk = '';
        newLocationData.locationName = '';
        newLocationData.pincode = '';
        break;

      case 'city':
        newLocationData.city = suggestion.name;
        // Clear dependent fields
        newLocationData.taluk = '';
        newLocationData.locationName = '';
        newLocationData.pincode = '';
        break;

      case 'taluk':
        newLocationData.taluk = suggestion.name;
        // Clear dependent fields
        newLocationData.locationName = '';
        break;

      case 'locationName':
        newLocationData.locationName = suggestion.name;
        break;

      case 'pincode':
        newLocationData.pincode = suggestion.name;
        // Auto-detect location if extra data is available
        if (suggestion.extra) {
          newLocationData.district = suggestion.extra.district || newLocationData.district;
          newLocationData.state = suggestion.extra.state || newLocationData.state;
        }
        break;
      default:
        (newLocationData as any)[fieldType] = suggestion.name;
    }

    setLocationData(newLocationData);
    onLocationChange(newLocationData);
    setShowSuggestions(prev => ({ ...prev, [fieldType]: false }));
    setActiveSuggestionIndex(prev => ({ ...prev, [fieldType]: 0 }));

    // Auto-fill pincode after city or district selection
    if (fieldType === 'city' || (fieldType === 'district' && newLocationData.city)) {
      console.log('Triggering pincode auto-fill for fieldType:', fieldType, 'with data:', newLocationData);
      setTimeout(() => autoFillPincode(newLocationData), 500);
    }
  }, [locationData, onLocationChange, autoFillPincode]);

  // Handle input changes
  const handleInputChange = useCallback((fieldType: string, value: string) => {
    const newLocationData = { ...locationData, [fieldType]: value };
    setLocationData(newLocationData);
    onLocationChange(newLocationData);

    // Trigger search with debounce
    debouncedSearch(fieldType, value);
  }, [locationData, onLocationChange, debouncedSearch]);

  // Handle input focus
  const handleInputFocus = useCallback((fieldType: string) => {
    const currentValue = locationData[fieldType as keyof LocationData] as string;
    if (currentValue && currentValue.length > 1) {
      debouncedSearch(fieldType, currentValue);
    }
  }, [locationData, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((fieldType: string, e: React.KeyboardEvent) => {
    const fieldSuggestions = suggestions[fieldType] || [];
    const activeIndex = activeSuggestionIndex[fieldType] || 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => ({
          ...prev,
          [fieldType]: Math.min(activeIndex + 1, fieldSuggestions.length - 1)
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => ({
          ...prev,
          [fieldType]: Math.max(activeIndex - 1, 0)
        }));
        break;
      case 'Enter':
        e.preventDefault();
        if (fieldSuggestions[activeIndex]) {
          handleSuggestionSelect(fieldType, fieldSuggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(prev => ({ ...prev, [fieldType]: false }));
        break;
    }
  }, [suggestions, activeSuggestionIndex, handleSuggestionSelect]);

  const renderField = (field: LocationField) => {
    const fieldSuggestions = suggestions[field.type] || [];
    const isLoading = loading[field.type] || false;
    const showFieldSuggestions = showSuggestions[field.type] || false;
    const activeIndex = activeSuggestionIndex[field.type] || 0;

    return (
      <div key={field.id} className="space-y-2 relative">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={(el) => {
              if (el) inputRefs.current[field.type] = el;
            }}
            id={field.id}
            type={field.type === 'pincode' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => handleInputChange(field.type, e.target.value)}
            onKeyDown={(e) => handleKeyDown(field.type, e)}
            onFocus={() => handleInputFocus(field.type)}
            className="pr-10"
            maxLength={field.type === 'pincode' ? 6 : undefined}
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : showFieldSuggestions ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : null}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showFieldSuggestions && fieldSuggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto">
            <CardContent className="p-0">
              {fieldSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionSelect(field.type, suggestion)}
                  className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${index === activeIndex ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    {suggestion.flag && (
                      <span className="text-lg">{suggestion.flag}</span>
                    )}
                    <span className="flex-1 text-sm">
                      {suggestion.displayName || suggestion.name}
                    </span>
                    {suggestion.code && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.code}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Special message for pincode */}
        {field.type === 'pincode' && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Enter 6-digit pincode to auto-fill all location fields above
            </p>
            {locationData.state && locationData.district && locationData.city && !locationData.pincode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => autoFillPincode(locationData)}
                className="text-xs px-2 py-1 h-6"
              >
                Find Pincodes
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orderedFields.map(renderField)}
      </div>

      {/* Summary display */}
      {locationData.formattedAddress && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Complete Address</p>
                <p className="text-sm text-gray-600 mt-1">
                  {locationData.formattedAddress}
                </p>
                {(locationData.latitude && locationData.longitude) && (
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedAddressInput;
