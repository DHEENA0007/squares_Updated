import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface PriceRangeFilterProps {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  maxPossiblePrice?: number;
  currency?: string;
}

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  maxPossiblePrice = 100000,
  currency = 'INR'
}) => {
  const [minValue, setMinValue] = useState<number>(
    minPrice ? parseFloat(minPrice) : 0
  );
  const [maxValue, setMaxValue] = useState<number>(
    maxPrice ? parseFloat(maxPrice) : maxPossiblePrice
  );

  useEffect(() => {
    const min = minPrice ? parseFloat(minPrice) : 0;
    const max = maxPrice ? parseFloat(maxPrice) : maxPossiblePrice;
    setMinValue(min);
    setMaxValue(max);
  }, [minPrice, maxPrice, maxPossiblePrice]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMinValue(val);
    onMinPriceChange(val.toString());
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMaxValue(val);
    onMaxPriceChange(val.toString());
  };

  const formatCurrency = (amount: number) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    return `${symbols[currency as keyof typeof symbols] || currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-2">
      <div className="px-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Min</label>
            <Input
              type="number"
              value={minValue}
              onChange={handleMinChange}
              className="h-8"
              min={0}
              max={maxValue}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max</label>
            <Input
              type="number"
              value={maxValue}
              onChange={handleMaxChange}
              className="h-8"
              min={minValue}
              max={maxPossiblePrice}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs font-medium mt-1">
          <span>Min: {formatCurrency(minValue)}</span>
          <span>Max: {formatCurrency(maxValue)}</span>
        </div>
      </div>
    </div>
  );
};
