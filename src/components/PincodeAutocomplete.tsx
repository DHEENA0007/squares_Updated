import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { locaService, PincodeSuggestion } from '@/services/locaService';

interface PincodeAutocompleteProps {
  value?: string;
  onChange: (pincode: string, locationData?: PincodeSuggestion) => void;
  state?: string;
  district?: string;
  city?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function PincodeAutocomplete({
  value,
  onChange,
  state,
  district,
  city,
  placeholder = 'Select pincode...',
  disabled = false,
  className,
  error,
}: PincodeAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize service
  useEffect(() => {
    const init = async () => {
      if (!locaService.isReady()) {
        setLoading(true);
        try {
          await locaService.initialize();
          setInitialized(true);
        } catch (error) {
          console.error('Failed to initialize loca service:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setInitialized(true);
      }
    };

    init();
  }, []);

  // Update suggestions when filters change
  useEffect(() => {
    if (!initialized) return;

    const loadSuggestions = () => {
      try {
        const results = locaService.getPincodeSuggestions(
          state,
          district,
          city,
          searchQuery
        );
        setSuggestions(results);
      } catch (error) {
        console.error('Error loading pincode suggestions:', error);
        setSuggestions([]);
      }
    };

    loadSuggestions();
  }, [state, district, city, searchQuery, initialized]);

  const handleSelect = (pincodeSuggestion: PincodeSuggestion) => {
    onChange(pincodeSuggestion.pincode, pincodeSuggestion);
    setOpen(false);
    setSearchQuery('');
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    
    const selected = suggestions.find(s => s.pincode === value);
    if (selected) {
      return `${selected.pincode} - ${selected.city}`;
    }
    
    return value;
  };

  const isDisabled = disabled || !initialized || (!state && !district && !city);

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between',
              !value && 'text-muted-foreground',
              error && 'border-red-500'
            )}
            disabled={isDisabled}
          >
            <span className="truncate">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                getDisplayValue()
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search pincode..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>
              {!state && !district && !city ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Please select state, district, or city first
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No pincodes found
                </div>
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={`${suggestion.pincode}-${suggestion.city}`}
                  value={suggestion.pincode}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === suggestion.pincode ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{suggestion.pincode}</span>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.city}, {suggestion.district}, {suggestion.state}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {!state && !district && !city && !error && (
        <p className="mt-1 text-xs text-muted-foreground">
          Select state, district, or city to see available pincodes
        </p>
      )}
    </div>
  );
}
