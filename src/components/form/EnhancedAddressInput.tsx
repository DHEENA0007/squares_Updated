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
            // Handle pincode auto-detection
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
                  locationName: pincodeData.locationName,
                  latitude: pincodeData.latitude,
                  longitude: pincodeData.longitude,
                  formattedAddress: pincodeData.formattedAddress
                };
                
                setLocationData(newLocationData);
                onLocationChange(newLocationData);
                
                toast({
                  title: "Address Auto-Detected ✓",
                  description: `Location found: ${pincodeData.area || pincodeData.locationName}, ${pincodeData.district}, ${pincodeData.state}`,
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

  const handleInputChange = (fieldType: string, value: string) => {
    const newLocationData = { ...locationData, [fieldType]: value };
    
    // Handle special cases
    if (fieldType === 'country' && value) {
      // Reset dependent fields when country changes
      newLocationData.state = '';
      newLocationData.district = '';
      newLocationData.city = '';
      newLocationData.taluk = '';
      newLocationData.locationName = '';
      
      // Set country code
      if (value.toLowerCase().includes('india') || value === 'IN') {
        newLocationData.countryCode = 'IN';
      }
    }

    if (fieldType === 'state' && value) {
      // Reset dependent fields when state changes
      newLocationData.district = '';
      newLocationData.city = '';
      newLocationData.taluk = '';
      newLocationData.locationName = '';
    }

    setLocationData(newLocationData);
    onLocationChange(newLocationData);
    
    // Trigger search
    debouncedSearch(fieldType, value);
  };

  const handleSuggestionSelect = (fieldType: string, suggestion: Suggestion) => {
    const newLocationData = { ...locationData };
    
    // Set the selected value
    switch (fieldType) {
      case 'country':
        newLocationData.country = suggestion.name;
        newLocationData.countryCode = suggestion.code;
        break;
      case 'state':
        newLocationData.state = suggestion.name;
        newLocationData.stateCode = suggestion.code;
        break;
      default:
        newLocationData[fieldType as keyof LocationData] = suggestion.name;
    }

    setLocationData(newLocationData);
    onLocationChange(newLocationData);
    
    // Hide suggestions
    setShowSuggestions(prev => ({ ...prev, [fieldType]: false }));
  };

  const handleKeyDown = (fieldType: string, e: React.KeyboardEvent) => {
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
  };

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
            onFocus={() => {
              if (fieldSuggestions.length > 0) {
                setShowSuggestions(prev => ({ ...prev, [field.type]: true }));
              }
            }}
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
                  className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                    index === activeIndex ? 'bg-blue-50' : ''
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
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Enter 6-digit pincode to auto-fill all location fields above
          </p>
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
