import { useState, useEffect } from "react";
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
  Check,
  ArrowLeft,
  Video,
  Eye,
  Loader2,
  Search,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { propertyService } from "@/services/propertyService";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { DynamicPropertyDetails } from "@/components/property/DynamicPropertyDetails";
import { usePropertyTypeConfig } from "@/hooks/usePropertyTypeConfig";
import { toast } from "@/hooks/use-toast";

// Upload function using server-side endpoint
const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/upload/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Upload failed');
    }
    
    return data.data.url;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
};

const AddProperty = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Details
    title: "",
    description: "",
    propertyType: "",
    listingType: "",
    
    // Location
    address: "",
    country: "India",
    countryCode: "IN",
    state: "",
    stateCode: "",
    district: "",
    districtCode: "",
    city: "",
    cityCode: "",
    taluk: "",
    locationName: "",
    pincode: "",
    
    // Property Details
    bedrooms: "",
    bathrooms: "",
    floor: "",
    totalFloors: "",
    furnishing: "",
    age: "",
    builtUpArea: "",
    carpetArea: "",
    plotArea: "",
    
    // Pricing
    price: "",
    priceNegotiable: false,
    maintenanceCharges: "",
    securityDeposit: "",
    
    // Amenities
    amenities: [],
    
    // Media
    images: [],
    videos: [],
    virtualTour: "",
    
    // Additional
    availability: "",
    possession: "",
    facing: "",
    parkingSpaces: "",
    
    // Land/Plot specific
    roadWidth: "",
    cornerPlot: "",
    
    // Admin specific
    isVerified: true, // Admin properties are verified by default
    isFeatured: false,
    status: "active",
    
    // Owner information
    ownerType: "admin", // "admin" or "client"
    clientName: ""
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  // Get property type configuration
  const { getAmenities } = usePropertyTypeConfig(formData.propertyType);

  // Store selected location names for display
  const [selectedLocationNames, setSelectedLocationNames] = useState({
    country: 'India',
    state: '',
    district: '',
    city: ''
  });

  // Location data states from loca.json
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  
  // Loading states for location fields
  const [locationLoading, setLocationLoading] = useState({
    states: false,
    districts: false,
    cities: false,
    pincode: false
  });

  // Initialize locaService on component mount
  useEffect(() => {
    const initLocaService = async () => {
      setLocationLoading(prev => ({ ...prev, states: true }));
      try {
        await locaService.initialize();
        const statesData = locaService.getStates();
        setStates(statesData);
        console.log(`Loaded ${statesData.length} states from loca.json`);
      } catch (error) {
        console.error('Error initializing loca service:', error);
        toast({
          title: "Error",
          description: "Failed to load location data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, states: false }));
      }
    };

    initLocaService();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (!formData.state) {
      setDistricts([]);
      return;
    }

    setLocationLoading(prev => ({ ...prev, districts: true }));
    try {
      const districtsData = locaService.getDistricts(formData.state);
      setDistricts(districtsData);
      console.log(`Loaded ${districtsData.length} districts for ${formData.state}`);
      
      // Reset dependent fields
      setFormData(prev => ({ 
        ...prev, 
        district: '',
        city: '', 
        pincode: '' 
      }));
      setSelectedLocationNames(prev => ({
        ...prev,
        district: '',
        city: ''
      }));
      setCities([]);
    } catch (error) {
      console.error('Error loading districts:', error);
      toast({
        title: "Error",
        description: "Failed to load districts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(prev => ({ ...prev, districts: false }));
    }
  }, [formData.state]);

  // Load cities when district changes
  useEffect(() => {
    if (!formData.state || !formData.district) {
      setCities([]);
      return;
    }

    setLocationLoading(prev => ({ ...prev, cities: true }));
    try {
      const citiesData = locaService.getCities(formData.state, formData.district);
      setCities(citiesData);
      console.log(`Loaded ${citiesData.length} cities for ${formData.district}`);
      
      // Reset dependent fields
      setFormData(prev => ({ 
        ...prev, 
        city: '', 
        pincode: '' 
      }));
      setSelectedLocationNames(prev => ({
        ...prev,
        city: ''
      }));
    } catch (error) {
      console.error('Error loading cities:', error);
      toast({
        title: "Error",
        description: "Failed to load cities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(prev => ({ ...prev, cities: false }));
    }
  }, [formData.state, formData.district]);

  // Update selectedLocationNames when form data changes
  useEffect(() => {
    if (formData.state) {
      setSelectedLocationNames(prev => ({ ...prev, state: formData.state }));
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.district) {
      setSelectedLocationNames(prev => ({ ...prev, district: formData.district }));
    }
  }, [formData.district]);

  useEffect(() => {
    if (formData.city) {
      setSelectedLocationNames(prev => ({ ...prev, city: formData.city }));
    }
  }, [formData.city]);

  // Auto-populate address field when location details are selected
  useEffect(() => {
    const addressParts = [];
    if (selectedLocationNames.city) addressParts.push(selectedLocationNames.city);
    if (selectedLocationNames.district) addressParts.push(selectedLocationNames.district);
    if (selectedLocationNames.state) addressParts.push(selectedLocationNames.state);
    if (formData.pincode) addressParts.push(formData.pincode);
    
    if (addressParts.length > 0 && !formData.address.trim()) {
      setFormData(prev => ({ 
        ...prev, 
        address: addressParts.join(', ') 
      }));
    }
  }, [selectedLocationNames, formData.pincode]);

  const steps = [
    { id: 1, title: "Basic Details", description: "Property type and listing details" },
    { id: 2, title: "Location", description: "Address and location information" },
    { id: 3, title: "Property Details", description: "Specifications and measurements" },
    { id: 4, title: "Pricing", description: "Price and financial details" },
    { id: 5, title: "Amenities", description: "Features and facilities" },
    { id: 6, title: "Media", description: "Photos, videos, and virtual tours" },
    { id: 7, title: "Owner Information", description: "Property owner details" },
    { id: 8, title: "Admin Settings", description: "Verification and status settings" },
    { id: 9, title: "Review", description: "Review and submit listing" }
  ];

  const propertyTypes = [
    { value: "apartment", label: "Apartment" },
    { value: "villa", label: "Villa" },
    { value: "house", label: "House" },
    { value: "commercial", label: "Commercial" },
    { value: "plot", label: "Plot" },
    { value: "land", label: "Land" },
    { value: "office", label: "Office Space" },
    { value: "pg", label: "PG (Paying Guest)" }
  ];

  const amenitiesList = [
    "Swimming Pool", "Gym/Fitness Center", "Parking", "Security",
    "Garden/Park", "Playground", "Clubhouse", "Power Backup",
    "Elevator", "WiFi", "CCTV Surveillance", "Intercom",
    "Water Supply", "Waste Management", "Fire Safety", "Visitor Parking",
    "Shopping Complex", "Restaurant", "Spa", "Jogging Track",
    // PG-specific amenities
    "Meals Included", "Laundry Service", "Room Cleaning", "24/7 Security",
    "Common Kitchen", "Common Area", "Study Room", "Single Occupancy",
    "Double Occupancy", "Triple Occupancy", "AC Rooms", "Non-AC Rooms",
    "Attached Bathroom", "Common Bathroom", "Wi-Fi in Rooms", "TV in Rooms"
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validate required fields
    const requiredFields = {
      title: formData.title?.trim(),
      description: formData.description?.trim(),
      propertyType: formData.propertyType,
      listingType: formData.listingType,
      price: formData.price,
      builtUpArea: formData.builtUpArea,
      pincode: formData.pincode
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate owner information
    if (!formData.ownerType) {
      toast({
        title: "Owner Information Required",
        description: "Please select owner type (Admin or Client)",
        variant: "destructive",
      });
      return;
    }

    if (formData.ownerType === 'client' && !formData.clientName?.trim()) {
      toast({
        title: "Client Name Required",
        description: "Please enter the client name when owner type is Client",
        variant: "destructive",
      });
      return;
    }

    // Validate location fields
    if (!formData.state || !formData.city) {
      toast({
        title: "Location Required",
        description: "Please select state and city for your property",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images to Cloudinary first
      const uploadedImageUrls = [];
      for (const image of uploadedImages) {
        if (image.file) {
          const uploadedUrl = await uploadToCloudinary(image.file, 'admin_property_images');
          uploadedImageUrls.push({
            url: uploadedUrl,
            caption: image.name,
            isPrimary: uploadedImageUrls.length === 0 // First image is primary
          });
        }
      }

      // Upload videos to Cloudinary if any
      const uploadedVideoUrls = [];
      for (const video of uploadedVideos) {
        if (video.file) {
          const uploadedUrl = await uploadToCloudinary(video.file, 'admin_property_videos');
          uploadedVideoUrls.push({
            url: uploadedUrl,
            caption: video.name
          });
        }
      }

      // Prepare property data for submission
      const propertyData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.propertyType as 'apartment' | 'villa' | 'house' | 'commercial' | 'plot' | 'land' | 'office' | 'pg',
        listingType: formData.listingType as 'sale' | 'rent' | 'lease',
        price: parseFloat(formData.price),
        area: {
          builtUp: formData.builtUpArea ? parseFloat(formData.builtUpArea) : undefined,
          carpet: formData.carpetArea ? parseFloat(formData.carpetArea) : undefined,
          plot: formData.plotArea ? parseFloat(formData.plotArea) : undefined,
          unit: 'sqft' as const
        },
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 0,
        address: {
          street: formData.address.trim(),
          district: formData.district || '',
          city: formData.city || '',
          state: formData.state || '',
          pincode: formData.pincode
        },
        amenities: formData.amenities || [],
        images: uploadedImageUrls || [],
        videos: uploadedVideoUrls || [],
        // Admin specific fields
        isVerified: formData.isVerified,
        isFeatured: formData.isFeatured,
        status: formData.status,
        isAdminProperty: true,
        
        // Owner information
        ownerType: formData.ownerType,
        clientName: formData.ownerType === 'client' ? formData.clientName : undefined
      };

      // Only add optional fields if they have values
      if (formData.virtualTour?.trim()) {
        propertyData.virtualTour = formData.virtualTour.trim();
      }
      if (formData.furnishing) {
        propertyData.furnishing = formData.furnishing;
      }
      if (formData.age) {
        propertyData.age = formData.age;
      }
      if (formData.floor?.trim()) {
        propertyData.floor = formData.floor.trim();
      }
      if (formData.totalFloors?.trim()) {
        propertyData.totalFloors = formData.totalFloors.trim();
      }
      if (formData.facing) {
        propertyData.facing = formData.facing;
      }
      if (formData.parkingSpaces) {
        propertyData.parkingSpaces = formData.parkingSpaces;
      }
      if (formData.priceNegotiable !== undefined) {
        propertyData.priceNegotiable = formData.priceNegotiable;
      }
      if (formData.maintenanceCharges?.trim()) {
        propertyData.maintenanceCharges = parseFloat(formData.maintenanceCharges);
      }
      if (formData.securityDeposit?.trim()) {
        propertyData.securityDeposit = parseFloat(formData.securityDeposit);
      }
      if (formData.availability?.trim()) {
        propertyData.availability = formData.availability.trim();
      }
      if (formData.possession?.trim()) {
        propertyData.possession = formData.possession.trim();
      }
      
      // Add land/plot specific fields
      if (formData.roadWidth?.trim()) {
        propertyData.roadWidth = formData.roadWidth.trim();
      }
      if (formData.cornerPlot) {
        propertyData.cornerPlot = formData.cornerPlot;
      }

      // Log the data being sent for debugging
      console.log('Property data being sent:', JSON.stringify(propertyData, null, 2));

      // Submit property to backend using admin endpoint
      const response = await propertyService.createProperty(propertyData);
      
      toast({
        title: "Success!",
        description: "Property created successfully by admin.",
      });

      navigate("/admin/properties");
    } catch (error) {
      console.error("Error submitting property:", error);
      
      let errorMessage = "Failed to submit property. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages(prev => [...prev, ...files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file),
        file: file // Store the actual file for upload
      }))]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedVideos(prev => [...prev, ...files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file),
        file: file // Store the actual file for upload
      }))]);
    }
  };

  const removeImage = (id: number) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-medium">Property Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Luxury 3BHK Apartment in Bandra"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="propertyType" className="text-base font-medium">Property Type *</Label>
                <Select value={formData.propertyType} onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Listing Type *</Label>
              <RadioGroup value={formData.listingType} onValueChange={(value) => setFormData(prev => ({ ...prev, listingType: value }))}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="sale" id="sale" />
                  <Label htmlFor="sale" className="text-base">For Sale</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="rent" id="rent" />
                  <Label htmlFor="rent" className="text-base">For Rent</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30">
                  <RadioGroupItem value="lease" id="lease" />
                  <Label htmlFor="lease" className="text-base">For Lease</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-medium">Property Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your property in detail..."
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="text-base"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Property Location
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select your property location and pincode
                </p>
              </CardHeader>
              <CardContent className="pt-0">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* State Selection */}
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, state: value, stateCode: value }));
                    }}
                    disabled={locationLoading.states}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={locationLoading.states ? "Loading states..." : "Select state"} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* District Selection */}
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Select 
                    value={formData.district} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, district: value, districtCode: value }));
                    }}
                    disabled={!formData.state || locationLoading.districts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.state 
                          ? "Select state first" 
                          : locationLoading.districts 
                            ? "Loading districts..." 
                            : "Select district"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Selection */}
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, city: value, cityCode: value }));
                    }}
                    disabled={!formData.district || locationLoading.cities}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.district 
                          ? "Select district first" 
                          : locationLoading.cities 
                            ? "Loading cities..." 
                            : "Select city"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

            <div className="space-y-3">
              <Label htmlFor="pincode" className="text-base font-medium">PIN Code *</Label>
              <PincodeAutocomplete
                value={formData.pincode}
                onChange={(pincode, locationData) => {
                  console.log('Pincode selected:', pincode, locationData);
                  setFormData(prev => ({ ...prev, pincode }));
                  
                  // Auto-fill location fields if suggestion provides data
                  if (locationData) {
                    console.log('Auto-filling location from pincode:', locationData);
                    
                    // Set state if available
                    if (locationData.state && states.includes(locationData.state.toUpperCase())) {
                      setFormData(prev => ({
                        ...prev,
                        state: locationData.state.toUpperCase(),
                        stateCode: locationData.state.toUpperCase()
                      }));
                      
                      // Load districts for the selected state
                      setTimeout(() => {
                        // Set district if available
                        if (locationData.district) {
                          const districtsForState = locaService.getDistricts(locationData.state.toUpperCase());
                          const matchingDistrict = districtsForState.find(d => 
                            d.toUpperCase() === locationData.district.toUpperCase()
                          );
                          
                          if (matchingDistrict) {
                            setFormData(prev => ({
                              ...prev,
                              district: matchingDistrict,
                              districtCode: matchingDistrict
                            }));
                            
                            // Load cities for the selected district
                            setTimeout(() => {
                              // Set city if available
                              if (locationData.city) {
                                const citiesForDistrict = locaService.getCities(
                                  locationData.state.toUpperCase(), 
                                  matchingDistrict
                                );
                                const matchingCity = citiesForDistrict.find(c => 
                                  c.toUpperCase() === locationData.city.toUpperCase()
                                );
                                
                                if (matchingCity) {
                                  setFormData(prev => ({
                                    ...prev,
                                    city: matchingCity,
                                    cityCode: matchingCity
                                  }));
                                }
                              }
                            }, 100);
                          }
                        }
                      }, 100);
                    }
                    
                    toast({
                      title: "Location Auto-filled ✓",
                      description: `${locationData.city}, ${locationData.district}, ${locationData.state}`,
                    });
                  }
                }}
                state={formData.state}
                district={formData.district}
                city={formData.city}
                placeholder="Enter or select 6-digit PIN code"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Select state, district, and city above to see matching pincodes, or type to search
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Complete Address</Label>
              <Textarea
                id="address"
                placeholder="Enter complete address with landmark"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This will be auto-filled from location details above
              </p>
            </div>
          </div>
        );

      case 3:
        // Use dynamic property details component
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="price" className="text-base font-medium">Price *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="price"
                    placeholder="Enter price"
                    className="pl-12 h-12 text-base"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maintenanceCharges" className="text-base font-medium">Maintenance Charges (Monthly)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="maintenanceCharges"
                    placeholder="Optional"
                    className="pl-12 h-12 text-base"
                    value={formData.maintenanceCharges}
                    onChange={(e) => setFormData(prev => ({ ...prev, maintenanceCharges: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {(formData.listingType === "rent" || formData.listingType === "lease") && (
              <div className="space-y-3">
                <Label htmlFor="securityDeposit" className="text-base font-medium">Security Deposit</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="securityDeposit"
                    placeholder="Enter security deposit"
                    className="pl-12 h-12 text-base"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 p-4 bg-muted/20 rounded-lg border">
              <Checkbox
                id="priceNegotiable"
                checked={formData.priceNegotiable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, priceNegotiable: checked === true }))}
                className="h-5 w-5"
              />
              <Label htmlFor="priceNegotiable" className="text-base font-medium">Price is negotiable</Label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Property Amenities</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select all amenities available in your property
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(formData.propertyType ? getAmenities() : amenitiesList).map((amenity) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="facing">Facing</Label>
                <Select value={formData.facing} onValueChange={(value) => setFormData(prev => ({ ...prev, facing: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North</SelectItem>
                    <SelectItem value="south">South</SelectItem>
                    <SelectItem value="east">East</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                    <SelectItem value="north-east">North-East</SelectItem>
                    <SelectItem value="north-west">North-West</SelectItem>
                    <SelectItem value="south-east">South-East</SelectItem>
                    <SelectItem value="south-west">South-West</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                <Select value={formData.parkingSpaces} onValueChange={(value) => setFormData(prev => ({ ...prev, parkingSpaces: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Parking</SelectItem>
                    <SelectItem value="1">1 Car</SelectItem>
                    <SelectItem value="2">2 Cars</SelectItem>
                    <SelectItem value="3">3+ Cars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-8">
            <div>
              <Label className="text-xl font-semibold">Property Images</Label>
              <p className="text-base text-muted-foreground mb-6 mt-2">
                Upload high-quality images of your property (up to 20 images)
              </p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-3">
                  <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()} size="lg" className="px-8">
                    <Upload className="w-5 h-5 mr-2" />
                    Choose Images
                  </Button>
                  <p className="text-base text-muted-foreground">
                    or drag and drop images here
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeImage(image.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xl font-semibold">Property Videos (Optional)</Label>
              <p className="text-base text-muted-foreground mb-6 mt-2">
                Upload videos to showcase your property better
              </p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-3">
                  <Button variant="outline" onClick={() => document.getElementById('video-upload')?.click()} size="lg" className="px-8">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Video
                  </Button>
                  <p className="text-base text-muted-foreground">
                    MP4, MOV, AVI (max 100MB)
                  </p>
                </div>
                <input
                  id="video-upload"
                  type="file"
                  multiple
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </div>

              {uploadedVideos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {uploadedVideos.map((video) => (
                    <div key={video.id} className="relative border rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Video className="w-8 h-8 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{video.name}</p>
                          <p className="text-xs text-muted-foreground">Video file</p>
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-6 w-6"
                          onClick={() => setUploadedVideos(prev => prev.filter(v => v.id !== video.id))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="virtualTour" className="text-base font-medium">Virtual Tour URL (Optional)</Label>
              <Input
                id="virtualTour"
                placeholder="e.g., https://your-virtual-tour-link.com"
                value={formData.virtualTour}
                onChange={(e) => setFormData(prev => ({ ...prev, virtualTour: e.target.value }))}
                className="h-12 text-base"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Home className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
                Owner Information
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Specify who owns this property
              </p>
            </div>

            <div className="grid gap-6">
              {/* Owner Type Selection Card */}
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Property Owner</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Select who owns this property
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label htmlFor="ownerType" className="text-base font-medium">Owner Type *</Label>
                    <Select value={formData.ownerType} onValueChange={(value) => setFormData(prev => ({ ...prev, ownerType: value, clientName: value === 'admin' ? '' : prev.clientName }))}>
                      <SelectTrigger className="h-12 border-2 border-primary/20 bg-background/50">
                        <SelectValue placeholder="Select owner type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="client">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-green-600" />
                            Client
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Client Name Field - Only show when client is selected */}
                    {formData.ownerType === 'client' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="clientName" className="text-base font-medium">Client Name *</Label>
                        <Input
                          id="clientName"
                          placeholder="Enter client's full name"
                          className="h-12 border-2 border-green-200/50 bg-background/50"
                          value={formData.clientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          This will be shown as the property owner in contact information
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information Display */}
              <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Contact Information Preview</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        How customers will see the contact information
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-background/50 rounded-lg border border-green-200/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <strong>Owner:</strong>
                        <span>
                          {formData.ownerType === 'admin' 
                            ? 'Squares' 
                            : (formData.clientName || 'Client Name')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <strong>Type:</strong>
                        <span>
                          {formData.ownerType === 'admin' ? 'Platform Admin' : 'Property Owner'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Shield className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
                Admin Settings
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Configure admin-specific settings for this property
              </p>
            </div>

            <div className="grid gap-6">
              {/* Property Verification Card */}
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Property Verification</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Admin properties are automatically verified
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <Label className="text-base font-medium">Verified Status</Label>
                        <p className="text-sm text-muted-foreground">Automatically approved</p>
                      </div>
                    </div>
                    <Checkbox
                      id="isVerified"
                      checked={formData.isVerified}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVerified: checked === true }))}
                      className="h-5 w-5 border-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Featured Property Card */}
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Featured Property</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Mark as featured for better visibility
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-amber-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <Eye className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <Label className="text-base font-medium">Featured Status</Label>
                        <p className="text-sm text-muted-foreground">Enhanced visibility</p>
                      </div>
                    </div>
                    <Checkbox
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked === true }))}
                      className="h-5 w-5 border-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Property Status Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Property Status</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Set the current status of this property
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="status" className="text-base font-medium">Current Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className="h-12 border-2 border-blue-200/50 bg-background/50">
                        <SelectValue placeholder="Select property status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Active
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                            Inactive
                          </div>
                        </SelectItem>
                        <SelectItem value="sold">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Sold
                          </div>
                        </SelectItem>
                        <SelectItem value="rented">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Rented
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Admin Privileges Alert */}
            <Alert className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield className="h-4 w-4 text-amber-600" />
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-amber-800 text-lg">Admin Privileges</div>
                  <AlertDescription className="text-amber-700 text-base leading-relaxed">
                    As an admin, you can add unlimited properties without subscription limits. 
                    All admin properties bypass normal verification processes and get priority listing placement.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        );

      case 9:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <Check className="mx-auto h-20 w-20 text-green-600 mb-6" />
              <h2 className="text-3xl font-bold mb-3">Review Your Listing</h2>
              <p className="text-muted-foreground text-lg">
                Please review all the details before submitting your property listing
              </p>
            </div>

            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Basic Details</h3>
                    <p><strong>Title:</strong> {formData.title}</p>
                    <p><strong>Type:</strong> {formData.propertyType}</p>
                    <p><strong>Listing:</strong> {formData.listingType}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p><strong>State:</strong> {formData.state || 'Not selected'}</p>
                    <p><strong>City:</strong> {formData.city || 'Not selected'}</p>
                    <p><strong>Pincode:</strong> {formData.pincode || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Property Details</h3>
                    <p><strong>Bedrooms:</strong> {formData.bedrooms}</p>
                    <p><strong>Area:</strong> {formData.builtUpArea} sq ft</p>
                    <p><strong>Furnishing:</strong> {formData.furnishing}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Pricing</h3>
                    <p><strong>Price:</strong> ₹{formData.price}</p>
                    {formData.maintenanceCharges && (
                      <p><strong>Maintenance:</strong> ₹{formData.maintenanceCharges}/month</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-600" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <p><strong>Owner Type:</strong> {formData.ownerType === 'admin' ? 'Admin' : 'Client'}</p>
                    {formData.ownerType === 'client' && (
                      <p><strong>Client Name:</strong> {formData.clientName || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Admin Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <p><strong>Verified:</strong> {formData.isVerified ? 'Yes' : 'No'}</p>
                    <p><strong>Featured:</strong> {formData.isFeatured ? 'Yes' : 'No'}</p>
                    <p><strong>Status:</strong> {formData.status}</p>
                  </div>
                </div>

                {formData.amenities.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {formData.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Images ({uploadedImages.length})</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedImages.slice(0, 4).map((image) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={image.name}
                          className="w-full h-16 object-cover rounded"
                        />
                      ))}
                      {uploadedImages.length > 4 && (
                        <div className="w-full h-16 bg-muted rounded flex items-center justify-center text-sm">
                          +{uploadedImages.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6 mt-6 md:mt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
              <Home className="w-6 md:w-8 h-6 md:h-8 text-primary" />
              <Shield className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
              <span>Add New Property (Admin)</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Admin panel - Add properties with unlimited access and special privileges
            </p>
          </div>
        </div>
      </div>

      {/* Admin Privilege Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-black p-4 md:p-6">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <AlertDescription className="text-sm md:text-base">
          <strong>Admin Mode:</strong> You have unlimited property creation privileges. 
          Properties added through admin panel are automatically verified and bypass subscription limits.
        </AlertDescription>
      </Alert>

      {/* Progress Steps */}
      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-10 gap-2 overflow-x-auto pb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center min-w-[120px] flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-3 ${
                  currentStep >= step.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                <div className="text-center px-1">
                  <p className="text-sm font-medium leading-tight break-words">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-1 break-words">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[500px] bg-gradient-to-br from-background to-muted/20 rounded-lg p-4 md:p-8 border">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 md:mt-10">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
              size="lg"
              className="px-8"
            >
              Previous
            </Button>
            
            {currentStep === steps.length ? (
              <Button onClick={handleSubmit} className="px-12" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Submit Property (Admin)
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={nextStep} size="lg" className="px-8">
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddProperty;
