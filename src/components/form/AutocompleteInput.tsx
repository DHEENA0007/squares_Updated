import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { locationService } from '@/services/locationService';

interface Suggestion {
  id: string;
  name: string;
  code?: string;
  [key: string]: any;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string, suggestion?: Suggestion) => void;
  placeholder?: string;
  className?: string;
  type: 'country' | 'state' | 'district' | 'city' | 'pincode';
  dependentValues?: {
    country?: string;
    stateCode?: string;
    districtId?: string;
    state?: string;
    district?: string;
  };
  disabled?: boolean;
  required?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder,
  className = "",
  type,
  dependentValues = {},
  disabled = false,
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
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
      return;
    }

    setLoading(true);
    try {
      let response;
      
      switch (type) {
        case 'country':
          response = await locationService.getCountrySuggestions(query);
          break;
        case 'state':
          response = await locationService.getStateSuggestions(query, dependentValues.country);
          break;
        case 'district':
          response = await locationService.getDistrictSuggestions(query, dependentValues.stateCode);
          break;
        case 'city':
          response = await locationService.getCitySuggestions(
            query, 
            dependentValues.stateCode, 
            dependentValues.districtId
          );
          break;
        case 'pincode':
          response = await locationService.getPincodeSuggestions(
            query,
            dependentValues.state,
            dependentValues.district
          );
          break;
        default:
          response = { success: false, suggestions: [] };
      }

      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error(`${type} suggestions error:`, error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    setSelectedSuggestion(null);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce suggestions fetch
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setInputValue(suggestion.name);
    setSelectedSuggestion(suggestion);
    setShowSuggestions(false);
    onChange(suggestion.name, suggestion);
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0) {
      fetchSuggestions(inputValue);
    }
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    
    switch (type) {
      case 'country':
        return 'Type country name (e.g., India)';
      case 'state':
        return 'Type state name (e.g., Karnataka)';
      case 'district':
        return 'Type district name (e.g., Bangalore Urban)';
      case 'city':
        return 'Type city name (e.g., Bangalore)';
      case 'pincode':
        return 'Type pincode (e.g., 560001)';
      default:
        return 'Type to search...';
    }
  };

  return (
    <div ref={inputRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={getPlaceholderText()}
          disabled={disabled}
          required={required}
          className="pr-8"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {selectedSuggestion && (
            <Check className="w-4 h-4 text-green-600" />
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{suggestion.name}</p>
                  {suggestion.code && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {suggestion.code}
                    </Badge>
                  )}
                </div>
                {selectedSuggestion?.id === suggestion.id && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {showSuggestions && suggestions.length === 0 && !loading && inputValue.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-gray-600">
              No {type} found for "{inputValue}"
            </p>
            <p className="text-xs text-gray-500 mt-1">
              You can still enter the {type} manually
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutocompleteInput;
