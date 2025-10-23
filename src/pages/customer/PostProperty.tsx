import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Home, 
  MapPin, 
  IndianRupee, 
  Upload,
  Camera,
  Plus,
  X,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const PostProperty = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "",
    listingType: "",
    bhk: "",
    price: "",
    area: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    amenities: [],
    images: []
  });

  const steps = [
    { id: 1, title: "Basic Details", description: "Property type and listing details" },
    { id: 2, title: "Location", description: "Address and location information" },
    { id: 3, title: "Features", description: "Amenities and specifications" },
    { id: 4, title: "Images", description: "Upload property photos" },
    { id: 5, title: "Review", description: "Review and submit listing" }
  ];

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "house", label: "House" },
    { value: "commercial", label: "Commercial" },
    { value: "plot", label: "Plot" },
    { value: "land", label: "Land" },
    { value: "pg", label: "PG (Paying Guest)" }
  ];

  const amenitiesList = [
    "Parking", "Gym", "Swimming Pool", "Security", "Power Backup",
    "Elevator", "Garden", "Terrace", "Club House", "Children's Play Area",
    "CCTV", "Intercom", "Fire Safety", "Waste Management", "Solar Panels",
    // PG-specific amenities
    "Meals Included", "Laundry Service", "Room Cleaning", "24/7 Security",
    "Common Kitchen", "Common Area", "Study Room", "Single Occupancy",
    "Double Occupancy", "Triple Occupancy", "AC Rooms", "Non-AC Rooms",
    "Attached Bathroom", "Common Bathroom", "Wi-Fi in Rooms", "TV in Rooms"
  ];

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // TODO: Implement form submission
    console.log("Form submitted:", formData);
    navigate("/customer/my-properties");
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Property Title *</Label>
                <Input
                  placeholder="e.g., Spacious 3BHK Apartment in Mumbai"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Property Type *</Label>
                <Select 
                  value={formData.propertyType}
                  onValueChange={(value) => handleInputChange("propertyType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Listing Type *</Label>
                <Select 
                  value={formData.listingType}
                  onValueChange={(value) => handleInputChange("listingType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select listing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                    <SelectItem value="lease">For Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>BHK</Label>
                <Select 
                  value={formData.bhk}
                  onValueChange={(value) => handleInputChange("bhk", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BHK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 BHK</SelectItem>
                    <SelectItem value="2">2 BHK</SelectItem>
                    <SelectItem value="3">3 BHK</SelectItem>
                    <SelectItem value="4">4 BHK</SelectItem>
                    <SelectItem value="5+">5+ BHK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter price"
                    className="pl-10"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Area (sq ft) *</Label>
                <Input
                  placeholder="Enter area in square feet"
                  value={formData.area}
                  onChange={(e) => handleInputChange("area", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe your property..."
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Full Address *</Label>
              <Textarea
                placeholder="Enter complete address"
                rows={3}
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pincode *</Label>
                <Input
                  placeholder="Enter pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Amenities</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select all amenities available in your property
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <Label htmlFor={amenity} className="text-sm">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Property Images</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Upload high-quality images of your property (up to 20 images)
              </p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Images
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop images here
                  </p>
                </div>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Property ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Review Your Listing</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Title:</span> {formData.title}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {formData.propertyType} ({formData.listingType})
                </div>
                <div>
                  <span className="font-medium">Price:</span> ₹{formData.price}
                </div>
                <div>
                  <span className="font-medium">Area:</span> {formData.area} sq ft
                </div>
                <div>
                  <span className="font-medium">Location:</span> {formData.city}, {formData.state}
                </div>
                {formData.amenities.length > 0 && (
                  <div>
                    <span className="font-medium">Amenities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Your property will be reviewed by our team</li>
                <li>• Once approved, it will be listed on our platform</li>
                <li>• You'll receive notifications for inquiries</li>
                <li>• You can manage your listing from the dashboard</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            Post Property
          </h1>
          <p className="text-muted-foreground mt-1">
            List your property and connect with potential buyers/tenants
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${
                  currentStep >= step.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden md:block absolute top-5 w-full h-0.5 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`} 
                  style={{ 
                    left: '50%', 
                    zIndex: -1,
                    width: `calc(100% / ${steps.length} - 40px)`,
                    marginLeft: '20px'
                  }} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep}: {steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep === 5 ? (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            Submit Property
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default PostProperty;