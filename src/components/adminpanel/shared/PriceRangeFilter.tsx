import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

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
  const [sliderValue, setSliderValue] = useState<number>(
    minPrice ? parseFloat(minPrice) : 0
  );

  useEffect(() => {
    const min = minPrice ? parseFloat(minPrice) : 0;
    setSliderValue(min);
    // Always set max to maxPossiblePrice
    onMaxPriceChange(maxPossiblePrice.toString());
  }, [minPrice, maxPossiblePrice, onMaxPriceChange]);

  const handleSliderChange = (values: number[]) => {
    const [min] = values; // Only use min value
    setSliderValue(min);
    onMinPriceChange(min.toString());
    onMaxPriceChange(maxPossiblePrice.toString()); // Always set max to maxPossiblePrice
  };

  const formatCurrency = (amount: number) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    return `${symbols[currency as keyof typeof symbols] || currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-2">
      <div className="px-2">
        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          max={maxPossiblePrice}
          min={0}
          step={100}
          className="w-full"
        />
        <div className="flex justify-between text-xs font-medium mt-1">
          <span>Min: {formatCurrency(sliderValue)}</span>
          <span>Max: {formatCurrency(maxPossiblePrice)}</span>
        </div>
      </div>
    </div>
  );
};
