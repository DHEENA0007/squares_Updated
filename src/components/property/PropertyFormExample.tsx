import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DynamicPropertyDetails } from "@/components/property/DynamicPropertyDetails";
import { usePropertyTypeConfig } from "@/hooks/usePropertyTypeConfig";
import { toast } from "@/hooks/use-toast";

interface PropertyFormData {
  // Basic Details
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  
  // Location
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Dynamic Property Details (based on type)
  bedrooms: string;
  bathrooms: string;
  builtUpArea: string;
  carpetArea: string;
  plotArea: string;
  furnishing: string;
  floor: string;
  totalFloors: string;
  
  // Special fields (type-specific)
  foodAvailability: string;
  gender: string;
  commercialType: string;
  plotType: string;
  landType: string;
  boundaryWall: string;
  
  // Pricing
  price: string;
  priceNegotiable: boolean;
  
  // Amenities
  amenities: string[];
}

const PropertyFormWithDynamicDetails: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: "",
    description: "",
    propertyType: "",
    listingType: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    bedrooms: "",
    bathrooms: "",
    builtUpArea: "",
    carpetArea: "",
    plotArea: "",
    furnishing: "",
    floor: "",
    totalFloors: "",
    foodAvailability: "",
    gender: "",
    commercialType: "",
    plotType: "",
    landType: "",
    boundaryWall: "",
    price: "",
    priceNegotiable: false,
    amenities: []
  });

  const { allPropertyTypes, getAmenities, validateData } = usePropertyTypeConfig(formData.propertyType);

  const steps = [
    { id: 1, title: "Basic Details", description: "Property type and listing details" },
    { id: 2, title: "Location", description: "Address and location information" },
    { id: 3, title: "Property Details", description: "Specifications and measurements" },
    { id: 4, title: "Pricing", description: "Price and financial details" },
    { id: 5, title: "Amenities", description: "Features and facilities" },
    { id: 6, title: "Review", description: "Review and submit" }
  ];

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 3 && formData.propertyType) {
      const validation = validateData(formData);
      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive"
        });
        return;
      }
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-medium">Property Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Luxury 3BHK Apartment in Bandra"
                  className="h-12"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="propertyType" className="text-base font-medium">Property Type *</Label>
                <Select 
                  value={formData.propertyType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPropertyTypes.map((type) => (
                      <SelectItem key={type.type} value={type.type}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Listing Type *</Label>
              <RadioGroup 
                value={formData.listingType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, listingType: value }))}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="sale" id="sale" />
                  <Label htmlFor="sale" className="cursor-pointer flex-1">
                    <div className="font-medium">For Sale</div>
                    <div className="text-sm text-muted-foreground">Sell your property</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="rent" id="rent" />
                  <Label htmlFor="rent" className="cursor-pointer flex-1">
                    <div className="font-medium">For Rent</div>
                    <div className="text-sm text-muted-foreground">Rent out your property</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="lease" id="lease" />
                  <Label htmlFor="lease" className="cursor-pointer flex-1">
                    <div className="font-medium">For Lease</div>
                    <div className="text-sm text-muted-foreground">Lease your property</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-medium">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your property in detail..."
                className="min-h-24"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="city" className="text-base font-medium">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Bangalore"
                  className="h-12"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="state" className="text-base font-medium">State *</Label>
                <Input
                  id="state"
                  placeholder="e.g., Karnataka"
                  className="h-12"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="address" className="text-base font-medium">Full Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter complete address with landmarks"
                className="min-h-20"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="pincode" className="text-base font-medium">Pincode *</Label>
              <Input
                id="pincode"
                placeholder="e.g., 560001"
                className="h-12"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <DynamicPropertyDetails
            propertyType={formData.propertyType}
            formData={formData}
            setFormData={setFormData}
            showValidationErrors={false}
          />
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="price" className="text-base font-medium">Price *</Label>
                <Input
                  id="price"
                  placeholder="Enter price in ₹"
                  className="h-12"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="negotiable"
                  checked={formData.priceNegotiable}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, priceNegotiable: checked as boolean }))
                  }
                />
                <Label htmlFor="negotiable" className="text-sm">Price is negotiable</Label>
              </div>
            </div>
          </div>
        );

      case 5:
        const availableAmenities = getAmenities();
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableAmenities.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <Label htmlFor={amenity} className="text-sm cursor-pointer">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        const validation = validateData(formData);
        
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Property Details</h3>
            
            {!validation.isValid && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div>Please fix the following errors before submitting:</div>
                  <ul className="list-disc list-inside mt-2">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Basic Details</h4>
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Type:</strong> {formData.propertyType}</p>
                  <p><strong>Listing:</strong> {formData.listingType}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Location</h4>
                  <p><strong>City:</strong> {formData.city}</p>
                  <p><strong>State:</strong> {formData.state}</p>
                  <p><strong>Pincode:</strong> {formData.pincode}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Property Details</h4>
                  {formData.bedrooms && <p><strong>Bedrooms:</strong> {formData.bedrooms}</p>}
                  {formData.bathrooms && <p><strong>Bathrooms:</strong> {formData.bathrooms}</p>}
                  {formData.builtUpArea && <p><strong>Built-up Area:</strong> {formData.builtUpArea} sq ft</p>}
                </div>
                
                <div>
                  <h4 className="font-semibold">Pricing</h4>
                  <p><strong>Price:</strong> ₹{formData.price}</p>
                  <p><strong>Negotiable:</strong> {formData.priceNegotiable ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Property</CardTitle>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {renderStepContent()}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < steps.length ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    const validation = validateData(formData);
                    if (validation.isValid) {
                      toast({
                        title: "Success!",
                        description: "Property submitted successfully!"
                      });
                      console.log("Property Data:", formData);
                    } else {
                      toast({
                        title: "Validation Error", 
                        description: "Please fix all errors before submitting",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!validateData(formData).isValid}
                >
                  Submit Property
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyFormWithDynamicDetails;
