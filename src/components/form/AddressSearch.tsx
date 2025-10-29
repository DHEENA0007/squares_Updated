import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { locationService } from '@/services/locationService';

interface AddressData {
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

interface AddressSearchProps {
  onAddressSelect: (address: AddressData) => void;
  defaultAddress?: AddressData;
  placeholder?: string;
  className?: string;
}



const AddressSearch: React.FC<AddressSearchProps> = ({
  onAddressSelect,
  defaultAddress,
  placeholder = "Enter 6-digit pincode for smart location detection...",
  className = ""
}) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(defaultAddress || null);
  const [pincodeMode, setPincodeMode] = useState(false);
  const [smartMode, setSmartMode] = useState<'pincode' | 'address' | 'auto'>('auto');
  const [collectingDetails, setCollectingDetails] = useState(false);
  const [locationDetails, setLocationDetails] = useState({
    pincode: '',
    state: '',
    city: '',
    area: ''
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Close any open panels when clicking outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchByPincode = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;

    setLoading(true);
    try {
      const response = await locationService.getLocationByPincode(pincode);
      if (response) {
        setLocationDetails({
          pincode: response.pincode,
          state: response.state,
          city: response.city,
          area: response.locality
        });
        setCollectingDetails(true);
        toast({
          title: "Location Found!",
          description: `Found details for pincode ${pincode}`,
        });
      } else {
        toast({
          title: "Pincode not found",
          description: "Please check the pincode and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Pincode search error:', error);
      toast({
        title: "Search failed",
        description: "Unable to find location for this pincode",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Smart detection of input type
    const isPincode = /^\d{0,6}$/.test(value.trim());
    
    if (isPincode && value.trim().length > 0) {
      setPincodeMode(true);
      setSmartMode(value.length === 6 ? 'pincode' : 'auto');
      
      // Auto search when pincode is complete
      if (value.length === 6) {
        debounceRef.current = setTimeout(() => {
          searchByPincode(value.trim());
        }, 300);
      }
    } else {
      setPincodeMode(false);
      setSmartMode('address');
    }
  };

  const clearSelection = () => {
    setSelectedAddress(null);
    setQuery('');
    setPincodeMode(false);
    setCollectingDetails(false);
    setLocationDetails({
      pincode: '',
      state: '',
      city: '',
      area: ''
    });
  };

  const handleLocationDetailUpdate = (field: string, value: string) => {
    setLocationDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const confirmLocationDetails = () => {
    const addressData: AddressData = {
      country: 'India',
      countryCode: 'IN',
      state: locationDetails.state,
      city: locationDetails.city,
      locationName: locationDetails.area,
      pincode: locationDetails.pincode,
      formattedAddress: `${locationDetails.area}, ${locationDetails.city}, ${locationDetails.state} - ${locationDetails.pincode}`
    };

    setSelectedAddress(addressData);
    onAddressSelect(addressData);
    setCollectingDetails(false);
    toast({
      title: "Address Confirmed!",
      description: "Location details have been saved successfully.",
    });
  };

  const tryPincodeSearch = () => {
    if (query.trim().length === 6 && /^\d{6}$/.test(query.trim())) {
      searchByPincode(query.trim());
    }
  };

  return (
    <div ref={searchRef} className={`relative space-y-1 ${className}`}>
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : pincodeMode ? (
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary font-bold">#</span>
                </div>
              ) : (
                <Search className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <Input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`pl-10 pr-12 transition-all duration-200 bg-transparent border-border focus:border-primary ${
                pincodeMode ? 'border-primary/50' : ''
              } ${selectedAddress ? 'border-primary/70' : ''}`}
            />
            {!loading && query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {pincodeMode && query.length === 6 && (
            <Button 
              onClick={tryPincodeSearch} 
              size="sm" 
              className="whitespace-nowrap bg-primary hover:bg-primary/90 transition-colors"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Find Location
            </Button>
          )}
        </div>

        {/* Smart Mode Indicators */}
        <div className="mt-2 flex items-center justify-between">
          {pincodeMode && (
            <div className="animate-in fade-in-50 duration-200">
              <Badge variant="secondary" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                {query.length === 6 ? 'Pincode Complete' : `Pincode (${query.length}/6)`}
              </Badge>
            </div>
          )}
          
          {query.length === 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>💡</span>
              <span>Enter pincode (e.g., 400001) to auto-fill location details</span>
            </div>
          )}
        </div>
      </div>

      {/* Step-by-step Location Details Collection */}
      {collectingDetails && (
        <div className="mt-4 p-4 rounded-lg bg-transparent border border-primary/20 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm text-foreground">Complete Location Details</span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Pincode</label>
                <Input
                  value={locationDetails.pincode}
                  onChange={(e) => handleLocationDetailUpdate('pincode', e.target.value)}
                  placeholder="400001"
                  className="text-sm bg-transparent border-muted focus:border-primary"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">State</label>
                <Input
                  value={locationDetails.state}
                  onChange={(e) => handleLocationDetailUpdate('state', e.target.value)}
                  placeholder="Maharashtra"
                  className="text-sm bg-transparent border-muted focus:border-primary"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">City/District</label>
                <Input
                  value={locationDetails.city}
                  onChange={(e) => handleLocationDetailUpdate('city', e.target.value)}
                  placeholder="Mumbai"
                  className="text-sm bg-transparent border-muted focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Area/Locality</label>
                <Input
                  value={locationDetails.area}
                  onChange={(e) => handleLocationDetailUpdate('area', e.target.value)}
                  placeholder="Bandra West"
                  className="text-sm bg-transparent border-muted focus:border-primary"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCollectingDetails(false)}
                className="text-xs border-muted hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmLocationDetails}
                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!locationDetails.state || !locationDetails.city || !locationDetails.area}
              >
                <Check className="w-3 h-3 mr-1" />
                Confirm Address
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="mt-4 p-4 rounded-lg bg-transparent border border-primary/30 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">Address Confirmed</span>
              </div>
              <div className="ml-7">
                <p className="text-sm text-foreground mb-2">
                  {selectedAddress.formattedAddress}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedAddress.pincode && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedAddress.pincode}
                    </Badge>
                  )}
                  {selectedAddress.district && (
                    <Badge variant="outline" className="text-xs">
                      {selectedAddress.district}
                    </Badge>
                  )}
                  {selectedAddress.state && (
                    <Badge variant="outline" className="text-xs">
                      {selectedAddress.state}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="ml-2 hover:bg-muted/50 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && query.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 p-4 rounded-lg bg-background/95 backdrop-blur-sm border border-muted shadow-sm animate-in fade-in-50 duration-200">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Finding location...</p>
              <p className="text-xs text-muted-foreground">
                {pincodeMode ? 'Searching pincode' : 'Searching address'} "{query}"
              </p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default AddressSearch;
