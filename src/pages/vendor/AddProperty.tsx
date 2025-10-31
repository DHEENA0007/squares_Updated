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
import { locationService, type Country, type State, type District, type City, type Taluk, type LocationName } from "@/services/locationService";
import AutocompleteInput from "@/components/form/AutocompleteInput";
import EnhancedLocationSelector from "@/components/vendor/EnhancedLocationSelector";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { toast } from "@/hooks/use-toast";

const AddProperty = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasAddPropertySubscription, setHasAddPropertySubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
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
    parkingSpaces: ""
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  // Location data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [taluks, setTaluks] = useState<Taluk[]>([]);
  const [locationNames, setLocationNames] = useState<LocationName[]>([]);
  
  // Loading states for location fields
  const [locationLoading, setLocationLoading] = useState({
    countries: false,
    states: false,
    districts: false,
    cities: false,
    taluks: false,
    locationNames: false,
    pincode: false
  });



  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      setLocationLoading(prev => ({ ...prev, countries: true }));
      try {
        const countriesData = await locationService.getCountries();
        setCountries(countriesData);
        // Set India as default
        if (countriesData.length > 0 && !formData.country) {
          setFormData(prev => ({ ...prev, country: 'IN' }));
        }
      } catch (error) {
        console.error('Error loading countries:', error);
        toast({
          title: "Error",
          description: "Failed to load countries. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, countries: false }));
      }
    };

    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    const loadStates = async () => {
      if (!formData.country) {
        setStates([]);
        return;
      }

      setLocationLoading(prev => ({ ...prev, states: true }));
      try {
        const statesData = await locationService.getStatesByCountry(formData.country);
        setStates(statesData);
        // Reset dependent fields
        setFormData(prev => ({ 
          ...prev, 
          state: '', 
          district: '',
          city: '', 
          taluk: '',
          locationName: '', 
          pincode: '' 
        }));
        setDistricts([]);
        setCities([]);
        setTaluks([]);
        setLocationNames([]);
      } catch (error) {
        console.error('Error loading states:', error);
        toast({
          title: "Error",
          description: "Failed to load states. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, states: false }));
      }
    };

    loadStates();
  }, [formData.country]);

  // Load districts when state changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (!formData.state) {
        setDistricts([]);
        return;
      }

      setLocationLoading(prev => ({ ...prev, districts: true }));
      try {
        const districtsData = await locationService.getDistrictsByState(formData.state, formData.country);
        setDistricts(districtsData);
        // Reset dependent fields
        setFormData(prev => ({ 
          ...prev, 
          district: '',
          city: '', 
          taluk: '',
          locationName: '', 
          pincode: '' 
        }));
        setCities([]);
        setTaluks([]);
        setLocationNames([]);
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
    };

    loadDistricts();
  }, [formData.state]);

  // Load cities when district changes
  useEffect(() => {
    const loadCities = async () => {
      if (!formData.district) {
        setCities([]);
        return;
      }

      setLocationLoading(prev => ({ ...prev, cities: true }));
      try {
        const citiesData = await locationService.getCitiesByDistrict(formData.district, formData.state, formData.country);
        setCities(citiesData);
        // Reset dependent fields
        setFormData(prev => ({ 
          ...prev, 
          city: '', 
          taluk: '',
          locationName: '', 
          pincode: '' 
        }));
        setTaluks([]);
        setLocationNames([]);
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
    };

    loadCities();
  }, [formData.district]);

  // Load taluks when city changes
  useEffect(() => {
    const loadTaluks = async () => {
      if (!formData.city) {
        setTaluks([]);
        return;
      }

      setLocationLoading(prev => ({ ...prev, taluks: true }));
      try {
        const taluksData = await locationService.getTaluksByCity(formData.city);
        setTaluks(taluksData);
        // Reset dependent fields
        setFormData(prev => ({ 
          ...prev, 
          taluk: '', 
          locationName: '',
          pincode: '' 
        }));
        setLocationNames([]);
      } catch (error) {
        console.error('Error loading taluks:', error);
        toast({
          title: "Error",
          description: "Failed to load taluks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, taluks: false }));
      }
    };

    loadTaluks();
  }, [formData.city]);

  // Load location names when taluk changes
  useEffect(() => {
    const loadLocationNames = async () => {
      if (!formData.taluk) {
        setLocationNames([]);
        return;
      }

      setLocationLoading(prev => ({ ...prev, locationNames: true }));
      try {
        const locationNamesData = await locationService.getLocationNamesByTaluk(formData.taluk);
        setLocationNames(locationNamesData);
        // Reset dependent fields
        setFormData(prev => ({ 
          ...prev, 
          locationName: '',
          pincode: '' 
        }));
      } catch (error) {
        console.error('Error loading location names:', error);
        toast({
          title: "Error",
          description: "Failed to load location names. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, locationNames: false }));
      }
    };

    loadLocationNames();
  }, [formData.taluk]);

  // Auto-detect pincode when location name changes
  useEffect(() => {
    const autoDetectPincode = async () => {
      if (!formData.locationName) return;

      const selectedLocationName = locationNames.find(l => l.id === formData.locationName);
      if (selectedLocationName && selectedLocationName.pincode) {
        setFormData(prev => ({ 
          ...prev, 
          pincode: selectedLocationName.pincode 
        }));
      }
    };

    autoDetectPincode();
  }, [formData.locationName, locationNames]);

  // Check if user has addPropertySubscription
  useEffect(() => {
    const checkAddPropertySubscription = async () => {
      setIsCheckingSubscription(true);
      try {
        const hasSubscription = await vendorService.checkSubscription("addPropertySubscription");
        setHasAddPropertySubscription(hasSubscription);
        
        if (!hasSubscription) {
          toast({
            title: "Subscription Required",
            description: "You need an active subscription to add properties. Please upgrade your plan.",
            variant: "destructive",
          });
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
    };

    checkAddPropertySubscription();
  }, []);

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

  const handleSubmit = () => {
    console.log("Property Data:", formData);
    // Here you would submit to your backend
    navigate("/vendor/properties");
  };

  // Handle location field changes
  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Enhanced pincode change handler with LocationIQ integration
  const handlePincodeChange = async (pincode: string) => {
    setFormData(prev => ({ ...prev, pincode }));

    // Only fetch location if pincode is valid length (6 digits for India)
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setLocationLoading(prev => ({ ...prev, pincode: true }));
      
      try {
        // Use the new LocationIQ-powered API endpoint
        const response = await fetch(`/api/locations/pincode/${pincode}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const locationData = result.data;
          
          // Auto-detect and set location dropdowns based on LocationIQ data
          
          // 1. Set country to India
          if (locationData.countryCode) {
            setFormData(prev => ({ ...prev, country: locationData.countryCode }));
            
            // Load states for India
            const statesData = await locationService.getStatesByCountry(locationData.countryCode);
            setStates(statesData);
            
            // 2. Find and set matching state using state code or name
            let matchingState = null;
            if (locationData.stateCode) {
              matchingState = statesData.find(s => s.stateCode === locationData.stateCode);
            }
            if (!matchingState && locationData.state) {
              matchingState = statesData.find(s => 
                s.name.toLowerCase() === locationData.state.toLowerCase()
              );
            }
            
            if (matchingState) {
              setFormData(prev => ({ ...prev, state: matchingState.stateCode }));
              
              // Load districts for the detected state
              const districtsData = await locationService.getDistrictsByState(matchingState.stateCode, locationData.countryCode);
              setDistricts(districtsData);
              
              // 3. Find and set matching district
              const matchingDistrict = districtsData.find(d => 
                d.name.toLowerCase() === locationData.district?.toLowerCase() ||
                d.name.toLowerCase() === locationData.city?.toLowerCase()
              );
              
              if (matchingDistrict) {
                setFormData(prev => ({ ...prev, district: matchingDistrict.id }));
                
                // Load cities for the detected district
                const citiesData = await locationService.getCitiesByDistrict(matchingDistrict.id, matchingState.stateCode, locationData.countryCode);
                setCities(citiesData);
                
                // 4. Find matching city
                let matchingCity = citiesData.find(c => 
                  c.name.toLowerCase() === locationData.city?.toLowerCase() ||
                  c.name.toLowerCase() === locationData.district?.toLowerCase()
                );
                
                if (!matchingCity && citiesData.length > 0) {
                  matchingCity = citiesData[0]; // Fallback to first city
                }
                
                if (matchingCity) {
                  setFormData(prev => ({ ...prev, city: matchingCity.id }));
                  
                  // Load taluks for the detected city
                  const taluksData = await locationService.getTaluksByCity(matchingCity.id);
                  setTaluks(taluksData);
                  
                  // 5. Find matching taluk based on area/block data
                  let matchingTaluk = null;
                  if (locationData.taluk) {
                    matchingTaluk = taluksData.find(t => 
                      t.name.toLowerCase().includes(locationData.taluk.toLowerCase()) ||
                      locationData.taluk.toLowerCase().includes(t.name.toLowerCase())
                    );
                  }
                  
                  if (!matchingTaluk && taluksData.length > 0) {
                    matchingTaluk = taluksData[0]; // Fallback to first taluk
                  }
                  
                  if (matchingTaluk) {
                    setFormData(prev => ({ ...prev, taluk: matchingTaluk.id }));
                    
                    // Load location names for the detected taluk
                    const locationNamesData = await locationService.getLocationNamesByTaluk(matchingTaluk.id);
                    setLocationNames(locationNamesData);
                    
                    // 6. Find matching location name based on locality/area
                    let matchingLocationName = null;
                    if (locationData.locationName) {
                      matchingLocationName = locationNamesData.find(l => 
                        l.name.toLowerCase().includes(locationData.locationName.toLowerCase()) ||
                        locationData.locationName.toLowerCase().includes(l.name.toLowerCase())
                      );
                    }
                    
                    if (!matchingLocationName && locationData.area) {
                      matchingLocationName = locationNamesData.find(l => 
                        l.name.toLowerCase().includes(locationData.area.toLowerCase()) ||
                        locationData.area.toLowerCase().includes(l.name.toLowerCase())
                      );
                    }
                    
                    if (!matchingLocationName) {
                      matchingLocationName = locationNamesData.find(l => l.pincode === pincode);
                    }
                    
                    if (matchingLocationName) {
                      setFormData(prev => ({ ...prev, locationName: matchingLocationName.id }));
                    }
                  }
                }
              }
            }
          }

          toast({
            title: "Location Auto-Detected ✓",
            description: `Found: ${locationData.area || locationData.locationName}, ${locationData.district}, ${locationData.state}`,
          });
        } else {
          toast({
            title: "Pincode not found",
            description: "Please select location details manually from dropdowns",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error detecting location from pincode:', error);
        toast({
          title: "Error",
          description: "Failed to auto-detect location. Please fill manually.",
          variant: "destructive",
        });
      } finally {
        setLocationLoading(prev => ({ ...prev, pincode: false }));
      }
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
      // In real app, you'd upload to server here
      setUploadedImages(prev => [...prev, ...files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        url: URL.createObjectURL(file)
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
                  Smart Location Finder
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select your property location from the dropdown menus
                </p>
              </div>
              
              <EnhancedLocationSelector
                value={{
                  country: formData.country,
                  countryCode: formData.countryCode,
                  state: formData.state,
                  stateCode: formData.stateCode,
                  district: formData.district,
                  districtCode: formData.districtCode,
                  city: formData.city,
                  cityCode: formData.cityCode
                }}
                onChange={(locationData) => {
                  setFormData(prev => ({
                    ...prev,
                    country: locationData.country || "India",
                    countryCode: locationData.countryCode || "IN",
                    state: locationData.state || "",
                    stateCode: locationData.stateCode || "",
                    district: locationData.district || "",
                    districtCode: locationData.districtCode || "",
                    city: locationData.city || "",
                    cityCode: locationData.cityCode || ""
                  }));
                }}
                showLabels={true}
                placeholder={{
                  state: "Select property state...",
                  district: "Select property district...",
                  city: "Select property city..."
                }}
                className="w-full"
                showValidation={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">PIN Code</Label>
              <PincodeAutocomplete
                value={formData.pincode}
                onChange={(pincode, locationData) => {
                  setFormData(prev => ({ ...prev, pincode }));
                  // Auto-fill location fields if suggestion provides data
                  if (locationData) {
                    setFormData(prev => ({
                      ...prev,
                      state: locationData.state || prev.state,
                      district: locationData.district || prev.district,
                      city: locationData.city || prev.city
                    }));
                  }
                }}
                state={formData.state}
                district={formData.district}
                city={formData.city}
                placeholder="Enter 6-digit PIN code (e.g., 400001)"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Complete Address</Label>
              <Textarea
                id="address"
                placeholder="Enter complete address with landmark (will be auto-filled from location details above)"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This will be automatically filled when you enter location details above
              </p>
            </div>

          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select value={formData.bedrooms} onValueChange={(value) => setFormData(prev => ({ ...prev, bedrooms: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 BHK</SelectItem>
                    <SelectItem value="2">2 BHK</SelectItem>
                    <SelectItem value="3">3 BHK</SelectItem>
                    <SelectItem value="4">4 BHK</SelectItem>
                    <SelectItem value="5">5+ BHK</SelectItem>
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
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
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
                <Label htmlFor="builtUpArea">Built-up Area (sq ft) *</Label>
                <Input
                  id="builtUpArea"
                  placeholder="e.g., 1200"
                  value={formData.builtUpArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, builtUpArea: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carpetArea">Carpet Area (sq ft)</Label>
                <Input
                  id="carpetArea"
                  placeholder="e.g., 1000"
                  value={formData.carpetArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, carpetArea: e.target.value }))}
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
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    MP4, MOV, AVI (max 100MB)
                  </p>
                </div>
              </div>
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
                    <p><strong>Country:</strong> {countries.find(c => c.code === formData.country)?.name}</p>
                    <p><strong>State:</strong> {states.find(s => s.stateCode === formData.state)?.name}</p>
                    <p><strong>District:</strong> {districts.find(d => d.id === formData.district)?.name}</p>
                    <p><strong>City:</strong> {cities.find(c => c.id === formData.city)?.name}</p>
                    <p><strong>Taluk:</strong> {taluks.find(t => t.id === formData.taluk)?.name}</p>
                    <p><strong>Location:</strong> {locationNames.find(l => l.id === formData.locationName)?.name}</p>
                    <p><strong>Pincode:</strong> {formData.pincode}</p>
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

      {/* Subscription Required */}
      {!isCheckingSubscription && !hasAddPropertySubscription && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-amber-900 mb-2">
                  Subscription Required
                </h2>
                <p className="text-amber-700 mb-4">
                  To add properties, you need an active "Add Property Subscription" plan.
                </p>
                <p className="text-sm text-amber-600 mb-2">
                  Upgrade your plan to start listing properties and reach potential customers.
                </p>
                <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>What you'll get with a subscription:</strong>
                  </p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Unlimited property listings</li>
                    <li>• Advanced lead management</li>
                    <li>• Priority customer support</li>
                    <li>• Enhanced property visibility</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/vendor/subscription-plans">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Crown className="w-4 h-4 mr-2" />
                    View Subscription Plans
                  </Button>
                </Link>
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
                  <Button onClick={handleSubmit} className="px-8">
                    Submit Property
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