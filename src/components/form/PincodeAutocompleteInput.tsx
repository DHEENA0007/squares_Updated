import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { locationService } from '@/services/locationService';

interface PincodeSuggestion {
  id: string;
  name: string;
  pincode: string;
  district: string;
  state: string;
  officename: string;
  displayName: string;
  relevance: number;
}

interface PincodeAutocompleteInputProps {
  value: string;
  onChange: (value: string, suggestion?: PincodeSuggestion) => void;
  onLocationDetected?: (locationData: {
    pincode: string;
    state: string;
    district: string;
    city: string;
    locality: string;
    country: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  className?: string;
  state?: string;
  district?: string;
  disabled?: boolean;
  required?: boolean;
}

const PincodeAutocompleteInput: React.FC<PincodeAutocompleteInputProps> = ({
  value,
  onChange,
  onLocationDetected,
  placeholder = "Enter pincode (e.g., 400001)",
  className = "",
  state,
  district,
  disabled = false,
  required = false
}) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await locationService.getPincodeSuggestions(query, state, district, 8);
      
      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      
      // Auto-detect complete 6-digit pincode
      if (/^\d{6}$/.test(query)) {
        const pincodeData = await locationService.getLocationByPincode(query);
        if (pincodeData && onLocationDetected) {
          onLocationDetected({
            pincode: query,
            state: pincodeData.state,
            district: pincodeData.district || '',
            city: pincodeData.city || pincodeData.district || '',
            locality: pincodeData.locality || '',
            country: pincodeData.country || 'India',
            latitude: pincodeData.latitude,
            longitude: pincodeData.longitude
          });
          
          toast({
            title: "Location Auto-Detected ✓",
            description: `${pincodeData.locality || pincodeData.area}, ${pincodeData.district}, ${pincodeData.state}`,
          });
        }
      }
    } catch (error) {
      console.error('Pincode suggestions error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = newValue.replace(/\D/g, '').slice(0, 6);
    setInputValue(cleanValue);
    onChange(cleanValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce suggestions fetch
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(cleanValue);
    }, 300);
  };

  const handleSuggestionSelect = async (suggestion: PincodeSuggestion) => {
    setInputValue(suggestion.pincode);
    setShowSuggestions(false);
    onChange(suggestion.pincode, suggestion);

    // Auto-detect location data
    if (onLocationDetected) {
      try {
        const pincodeData = await locationService.getLocationByPincode(suggestion.pincode);
        if (pincodeData) {
          onLocationDetected({
            pincode: suggestion.pincode,
            state: pincodeData.state,
            district: pincodeData.district || suggestion.district,
            city: pincodeData.city || suggestion.district,
            locality: pincodeData.locality || suggestion.officename,
            country: pincodeData.country || 'India',
            latitude: pincodeData.latitude,
            longitude: pincodeData.longitude
          });
        }
      } catch (error) {
        console.error('Error fetching pincode location data:', error);
      }
    }
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0) {
      fetchSuggestions(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[activeSuggestionIndex]) {
          handleSuggestionSelect(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="tel"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          disabled={disabled}
          required={required}
          className="pr-10"
          maxLength={6}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : showSuggestions ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                  index === activeSuggestionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {suggestion.pincode}
                      </div>
                      <div className="text-xs text-gray-600">
                        {suggestion.officename}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">
                      {suggestion.district}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {suggestion.state}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {inputValue.length === 0 
          ? "Type to search pincodes" 
          : inputValue.length < 6 
            ? `${6 - inputValue.length} more digits needed`
            : "Press Enter to search location"
        }
      </p>
    </div>
  );
};

export default PincodeAutocompleteInput;
