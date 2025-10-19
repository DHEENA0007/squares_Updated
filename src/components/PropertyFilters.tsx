import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

const PropertyFilters = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 font-medium">
          <Filter className="h-5 w-5" />
          <span>Filters:</span>
        </div>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="house">Independent House</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="any">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="BHK" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any BHK</SelectItem>
            <SelectItem value="1">1 BHK</SelectItem>
            <SelectItem value="2">2 BHK</SelectItem>
            <SelectItem value="3">3 BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="any-budget">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any-budget">Any Budget</SelectItem>
            <SelectItem value="20-40">₹20L - ₹40L</SelectItem>
            <SelectItem value="40-60">₹40L - ₹60L</SelectItem>
            <SelectItem value="60-80">₹60L - ₹80L</SelectItem>
            <SelectItem value="80-1cr">₹80L - ₹1Cr</SelectItem>
            <SelectItem value="1cr+">₹1Cr+</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="secondary" className="ml-auto">
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default PropertyFilters;
