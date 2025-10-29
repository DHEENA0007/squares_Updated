import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AddressResult {
  id: string;
  displayName: string;
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  district: string;
  city: string;
  taluk: string;
  locationName: string;
  locationType: 'urban' | 'town' | 'village';
  postcode?: string;
  latitude: number;
  longitude: number;
  relevance: number;
}

interface AddressSearchComponentProps {
  onAddressSelect: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
  showCurrentLocation?: boolean;
}

export const AddressSearchComponent: React.FC<AddressSearchComponentProps> = ({
  onAddressSelect,
  placeholder = "Search for address, area, city...",
  className = "",
  showCurrentLocation = true
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(query);
    }, 300); // 300ms delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/locations/address-search?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.results) {
          setResults(data.results);
          setShowResults(true);
        } else {
          setResults([]);
          setShowResults(false);
        }
      } else {
        console.error('Search API error:', response.statusText);
        setResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressSelect = (address: AddressResult) => {
    setQuery(address.displayName);
    setShowResults(false);
    onAddressSelect(address);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `/api/locations/reverse-geocode?lat=${latitude}&lon=${longitude}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const locationData = data.data;
              const addressResult: AddressResult = {
                id: `current_${Date.now()}`,
                displayName: locationData.displayName,
                country: locationData.country,
                countryCode: locationData.countryCode,
                state: locationData.state,
                stateCode: locationData.stateCode,
                district: locationData.district,
                city: locationData.city,
                taluk: locationData.taluk,
                locationName: locationData.locationName,
                locationType: locationData.locationType,
                postcode: locationData.postcode,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                relevance: 1.0
              };
              
              handleAddressSelect(addressResult);
            }
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          alert('Failed to get current location details');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get your location. Please check your browser permissions.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-12"
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        
        {showCurrentLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            title="Use current location"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto border shadow-lg">
          <CardContent className="p-0">
            {results.map((result, index) => (
              <div
                key={result.id || index}
                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                onClick={() => handleAddressSelect(result)}
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {result.locationName || result.city}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.displayName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {result.locationType}
                      </Badge>
                      {result.postcode && (
                        <Badge variant="outline" className="text-xs">
                          {result.postcode}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 border shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No results found for "{query}"
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddressSearchComponent;
