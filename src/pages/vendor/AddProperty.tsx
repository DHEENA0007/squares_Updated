import { useState, useEffect, useCallback } from "react";
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
  Crown,
  Lock,
  Loader2,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { vendorService } from "@/services/vendorService";
import { propertyService } from "@/services/propertyService";
import { locationService, type Country, type State, type District, type City, type Taluk, type LocationName } from "@/services/locationService";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import AutocompleteInput from "@/components/form/AutocompleteInput";
import EnhancedLocationSelector from "@/components/vendor/EnhancedLocationSelector";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
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
  const [hasAddPropertySubscription, setHasAddPropertySubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    maxProperties: 0,
    currentProperties: 0,
    canAddMore: false,
    planName: '',
    features: []
  });
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
    cornerPlot: ""
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

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

  // Check subscription limits and property count
  const checkSubscriptionLimits = useCallback(async () => {
    setIsCheckingSubscription(true);
    try {
      console.log('🔄 Checking subscription limits...');
      const limits = await vendorService.getSubscriptionLimits();
      console.log('📊 Subscription limits received:', limits);
      setSubscriptionLimits(limits);
      setHasAddPropertySubscription(limits.canAddMore);
      
      if (!limits.canAddMore) {
        if (limits.maxProperties === 0) {
          toast({
            title: "Subscription Required",
            description: "You need an active subscription to add properties. Please upgrade your plan.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Property Limit Reached",
            description: `You have reached your plan limit of ${limits.maxProperties} properties. Please upgrade to add more.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setHasAddPropertySubscription(false);
      toast({
        title: "Error",
        description: "Failed to check subscription status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [toast]);

  useEffect(() => {
    checkSubscriptionLimits();
  }, [checkSubscriptionLimits]);

  // Refresh subscription limits when window gains focus (user returns from payment)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused - checking subscription limits...');
      checkSubscriptionLimits();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkSubscriptionLimits]);

  const steps = [
    { id: 1, title: "Basic Details", description: "Property type and listing details" },
    { id: 2, title: "Location", description: "Address and location information" },
    { id: 3, title: "Property Details", description: "Specifications and measurements" },
    { id: 4, title: "Pricing", description: "Price and financial details" },
    { id: 5, title: "Amenities", description: "Features and facilities" },
    { id: 6, title: "Media", description: "Photos, videos, and virtual tours" },
    { id: 7, title: "Review", description: "Review and submit listing" }
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
          const uploadedUrl = await uploadToCloudinary(image.file, 'property_images');
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
          const uploadedUrl = await uploadToCloudinary(video.file, 'property_videos');
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
        videos: uploadedVideoUrls || []
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

      // Submit property to backend
      const response = await propertyService.createProperty(propertyData);
      
      toast({
        title: "Success!",
        description: "Property submitted successfully. It will be live after admin verification.",
      });

      navigate("/vendor/properties");
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

  // Handle location field changes
  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Luxury 3BHK Apartment in Bandra"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type *</Label>
                <Select value={formData.propertyType} onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}>
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Listing Type *</Label>
              <RadioGroup value={formData.listingType} onValueChange={(value) => setFormData(prev => ({ ...prev, listingType: value }))}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sale" id="sale" />
                  <Label htmlFor="sale">For Sale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rent" id="rent" />
                  <Label htmlFor="rent">For Rent</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lease" id="lease" />
                  <Label htmlFor="lease">For Lease</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Property Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your property in detail..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="border border-primary/20 rounded-lg p-6 bg-transparent">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Property Location
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select your property location and pincode
                </p>
              </div>
              
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">PIN Code *</Label>
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
        // Residential properties: apartment, villa, house, pg
        const isResidential = ['apartment', 'villa', 'house', 'pg'].includes(formData.propertyType);
        // Commercial properties: commercial, office
        const isCommercial = ['commercial', 'office'].includes(formData.propertyType);
        // Land/Plot properties: plot, land
        const isLand = ['plot', 'land'].includes(formData.propertyType);
        // PG specific
        const isPG = formData.propertyType === 'pg';
        
        return (
          <div className="space-y-6">
            {/* Residential Properties - Apartment, Villa, House, PG */}
            {isResidential && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms {!isPG && '*'}</Label>
                    <Select value={formData.bedrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bedrooms: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {isPG ? (
                          <>
                            <SelectItem value="1">Single Sharing</SelectItem>
                            <SelectItem value="2">Double Sharing</SelectItem>
                            <SelectItem value="3">Triple Sharing</SelectItem>
                            <SelectItem value="4">4+ Sharing</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1">1 BHK</SelectItem>
                            <SelectItem value="2">2 BHK</SelectItem>
                            <SelectItem value="3">3 BHK</SelectItem>
                            <SelectItem value="4">4 BHK</SelectItem>
                            <SelectItem value="5">5+ BHK</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Select value={formData.bathrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bathrooms: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {isPG ? (
                          <>
                            <SelectItem value="1">Attached</SelectItem>
                            <SelectItem value="0">Common</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4+</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="furnishing">Furnishing</Label>
                    <Select value={formData.furnishing} onValueChange={(value) => setFormData(prev => ({ ...prev, furnishing: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                        <SelectItem value="semi-furnished">Semi Furnished</SelectItem>
                        <SelectItem value="unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="builtUpArea">{isPG ? 'Room Area (sq ft)' : 'Built-up Area (sq ft)'} *</Label>
                    <Input
                      id="builtUpArea"
                      placeholder={isPG ? "e.g., 150" : "e.g., 1200"}
                      value={formData.builtUpArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, builtUpArea: e.target.value }))}
                    />
                  </div>

                  {!isPG && (
                    <div className="space-y-2">
                      <Label htmlFor="carpetArea">Carpet Area (sq ft)</Label>
                      <Input
                        id="carpetArea"
                        placeholder="e.g., 1000"
                        value={formData.carpetArea}
                        onChange={(e) => setFormData(prev => ({ ...prev, carpetArea: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="age">Property Age</Label>
                    <Select value={formData.age} onValueChange={(value) => setFormData(prev => ({ ...prev, age: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New/Under Construction</SelectItem>
                        <SelectItem value="1-3">1-3 Years</SelectItem>
                        <SelectItem value="3-5">3-5 Years</SelectItem>
                        <SelectItem value="5-10">5-10 Years</SelectItem>
                        <SelectItem value="10+">10+ Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isPG && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        placeholder="e.g., 5th"
                        value={formData.floor}
                        onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalFloors">Total Floors</Label>
                      <Input
                        id="totalFloors"
                        placeholder="e.g., 20"
                        value={formData.totalFloors}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalFloors: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {isPG && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        placeholder="e.g., Ground, 1st, 2nd"
                        value={formData.floor}
                        onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="availability">Food Availability</Label>
                      <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meals-included">Meals Included</SelectItem>
                          <SelectItem value="kitchen-available">Kitchen Available</SelectItem>
                          <SelectItem value="no-meals">No Meals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Commercial Properties - Office, Commercial */}
            {isCommercial && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="builtUpArea">Built-up Area (sq ft) *</Label>
                    <Input
                      id="builtUpArea"
                      placeholder="e.g., 2500"
                      value={formData.builtUpArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, builtUpArea: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carpetArea">Carpet Area (sq ft)</Label>
                    <Input
                      id="carpetArea"
                      placeholder="e.g., 2000"
                      value={formData.carpetArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, carpetArea: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="furnishing">Furnishing</Label>
                    <Select value={formData.furnishing} onValueChange={(value) => setFormData(prev => ({ ...prev, furnishing: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                        <SelectItem value="semi-furnished">Semi Furnished</SelectItem>
                        <SelectItem value="unfurnished">Bare Shell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input
                      id="floor"
                      placeholder="e.g., 3rd, Ground"
                      value={formData.floor}
                      onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalFloors">Total Floors in Building</Label>
                    <Input
                      id="totalFloors"
                      placeholder="e.g., 10"
                      value={formData.totalFloors}
                      onChange={(e) => setFormData(prev => ({ ...prev, totalFloors: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Property Age</Label>
                    <Select value={formData.age} onValueChange={(value) => setFormData(prev => ({ ...prev, age: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New/Under Construction</SelectItem>
                        <SelectItem value="1-3">1-3 Years</SelectItem>
                        <SelectItem value="3-5">3-5 Years</SelectItem>
                        <SelectItem value="5-10">5-10 Years</SelectItem>
                        <SelectItem value="10+">10+ Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Washrooms</Label>
                    <Select value={formData.bathrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bathrooms: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability">Possession Status</Label>
                    <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="within-30-days">Within 30 Days</SelectItem>
                        <SelectItem value="within-60-days">Within 60 Days</SelectItem>
                        <SelectItem value="within-90-days">Within 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Land/Plot Properties */}
            {isLand && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="plotArea">Plot Area (sq ft) *</Label>
                    <Input
                      id="plotArea"
                      placeholder="e.g., 5000"
                      value={formData.plotArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, plotArea: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="builtUpArea">Total Area (sq ft) *</Label>
                    <Input
                      id="builtUpArea"
                      placeholder="e.g., 5000"
                      value={formData.builtUpArea}
                      onChange={(e) => setFormData(prev => ({ ...prev, builtUpArea: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facing">Plot Facing</Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="availability">Land Type</Label>
                    <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="agricultural">Agricultural</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="possession">Boundary Wall</Label>
                    <Select value={formData.possession} onValueChange={(value) => setFormData(prev => ({ ...prev, possession: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="roadWidth">Road Width (ft)</Label>
                    <Input
                      id="roadWidth"
                      placeholder="e.g., 30"
                      value={formData.roadWidth}
                      onChange={(e) => setFormData(prev => ({ ...prev, roadWidth: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cornerPlot">Corner Plot</Label>
                    <Select value={formData.cornerPlot} onValueChange={(value) => setFormData(prev => ({ ...prev, cornerPlot: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Show message if no property type selected */}
            {!formData.propertyType && (
              <Alert>
                <AlertDescription>
                  Please select a property type in the Basic Details step to see relevant property specifications.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    placeholder="Enter price"
                    className="pl-10"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenanceCharges">Maintenance Charges (Monthly)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maintenanceCharges"
                    placeholder="Optional"
                    className="pl-10"
                    value={formData.maintenanceCharges}
                    onChange={(e) => setFormData(prev => ({ ...prev, maintenanceCharges: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {(formData.listingType === "rent" || formData.listingType === "lease") && (
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="securityDeposit"
                    placeholder="Enter security deposit"
                    className="pl-10"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="priceNegotiable"
                checked={formData.priceNegotiable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, priceNegotiable: checked === true }))}
              />
              <Label htmlFor="priceNegotiable">Price is negotiable</Label>
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
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Property Images</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Upload high-quality images of your property (up to 20 images)
              </p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => document.getElementById('image-upload').click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Images
                  </Button>
                  <p className="text-sm text-muted-foreground">
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
              <Label className="text-base font-medium">Property Videos (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Upload videos to showcase your property better
              </p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => document.getElementById('video-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <p className="text-sm text-muted-foreground">
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

            <div className="space-y-2">
              <Label htmlFor="virtualTour">Virtual Tour URL (Optional)</Label>
              <Input
                id="virtualTour"
                placeholder="e.g., https://your-virtual-tour-link.com"
                value={formData.virtualTour}
                onChange={(e) => setFormData(prev => ({ ...prev, virtualTour: e.target.value }))}
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Check className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Review Your Listing</h2>
              <p className="text-muted-foreground">
                Please review all the details before submitting your property listing
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Basic Details</h3>
                    <p><strong>Title:</strong> {formData.title}</p>
                    <p><strong>Type:</strong> {formData.propertyType}</p>
                    <p><strong>Listing:</strong> {formData.listingType}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p><strong>Country:</strong> India</p>
                    <p><strong>State:</strong> {formData.state || 'Not selected'}</p>
                    <p><strong>District:</strong> {formData.district || 'Not selected'}</p>
                    <p><strong>City:</strong> {formData.city || 'Not selected'}</p>
                    <p><strong>Pincode:</strong> {formData.pincode || 'Not provided'}</p>
                    <p><strong>Address:</strong> {formData.address || 'Not provided'}</p>
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendor/properties")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Home className="w-8 h-8 text-primary" />
              Add New Property
            </h1>
            <p className="text-muted-foreground mt-1">
              List your property and connect with potential buyers/tenants
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isCheckingSubscription && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Checking subscription status...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Required/Limit Reached */}
      {!isCheckingSubscription && !hasAddPropertySubscription && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                {subscriptionLimits.maxProperties === 0 ? (
                  <>
                    <h2 className="text-2xl font-bold text-amber-900 mb-2">
                      Subscription Required
                    </h2>
                    <p className="text-amber-700 mb-4">
                      To add properties, you need an active subscription plan.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-amber-900 mb-2">
                      Property Limit Reached
                    </h2>
                    <p className="text-amber-700 mb-4">
                      You have reached your {subscriptionLimits.planName} plan limit of {subscriptionLimits.maxProperties} properties.
                    </p>
                    <p className="text-sm text-amber-600 mb-2">
                      Current: {subscriptionLimits.currentProperties}/{subscriptionLimits.maxProperties} properties used
                    </p>
                  </>
                )}
                
                <div className="bg-amber-100 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    Available Subscription Plans:
                  </p>
                  <div className="text-left space-y-2 text-sm text-amber-700">
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <span><strong>FREE LISTING</strong> - 5 Properties</span>
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <span><strong>₹199</strong> - 10 Properties + Top Rated + Verified Badge</span>
                      <Badge className="text-xs bg-green-600">Popular</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <span><strong>₹499</strong> - 15 Properties + 1 Poster + 6 Leads</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <span><strong>₹1999</strong> - Unlimited + 4 Posters + 20 Leads</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <span><strong>₹4999</strong> - Unlimited + Videos + Marketing Manager + 30+ Leads</span>
                      <Badge className="text-xs bg-purple-600">Premium</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/vendor/subscription-plans">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('Manually refreshing subscription limits...');
                    checkSubscriptionLimits();
                  }}
                  disabled={isCheckingSubscription}
                >
                  {isCheckingSubscription ? "Checking..." : "Refresh Status"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    console.log('Cleaning up duplicate subscriptions...');
                    const result = await vendorService.cleanupSubscriptions();
                    if (result.success) {
                      // Refresh the subscription limits after cleanup
                      checkSubscriptionLimits();
                    }
                  }}
                  disabled={isCheckingSubscription}
                >
                  Fix Multiple Subscriptions
                </Button>
                <Button variant="outline" onClick={() => navigate("/vendor/properties")}>
                  Back to Properties
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Property Form - Only show if user has subscription */}
      {!isCheckingSubscription && hasAddPropertySubscription && (
        <>
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
                        step.id
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`hidden md:block absolute h-0.5 w-20 top-5 left-1/2 transform translate-x-8 ${
                        currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-96">
                {renderStepContent()}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {currentStep === steps.length ? (
                  <Button onClick={handleSubmit} className="px-8" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Property'
                    )}
                  </Button>
                ) : (
                  <Button onClick={nextStep}>
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AddProperty;