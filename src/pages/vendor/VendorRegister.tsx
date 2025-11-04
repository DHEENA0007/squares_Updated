import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  FileText,
  Upload,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Clock,
  Shield,
  AlertCircle
} from "lucide-react";
import { locaService, type PincodeSuggestion } from "@/services/locaService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import EnhancedLocationSelector from "../../components/vendor/EnhancedLocationSelector";

const VendorRegister = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<"none" | "sent" | "verified">("none");
  const [otp, setOtp] = useState("");
  const [otpExpiry, setOtpExpiry] = useState<number>(0);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    
    // Business Information
    businessName: "",
    businessType: "",
    businessDescription: "",
    experience: "",
    
    // Address Information
    address: "",
    country: "India",
    countryCode: "IN",
    state: "",
    stateCode: "",
    district: "",
    districtCode: "",
    city: "",
    cityCode: "",
    pincode: "",
    
    // Legal Documents
    licenseNumber: "",
    gstNumber: "",
    panNumber: "",
    
    // Documents
    documents: [],
    
    // Agreements
    termsAccepted: false,
    marketingConsent: false
  });

  const [uploadedDocuments, setUploadedDocuments] = useState({
    businessRegistration: null,
    professionalLicense: null,
    identityProof: null
  });

  // Location service states
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
  
  // Store selected location names for display
  const [selectedLocationNames, setSelectedLocationNames] = useState({
    country: 'India',
    state: '',
    district: '',
    city: ''
  });
  const steps = [
    { id: 1, title: "Personal Info", description: "Basic details" },
    { id: 2, title: "Business Info", description: "Company details" },
    { id: 3, title: "Address", description: "Location details" },
    { id: 4, title: "Documents", description: "Verification" },
    { id: 5, title: "Complete", description: "Verify & Submit" }
  ];

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
      const stateName = formData.state;
      setSelectedLocationNames(prev => ({
        ...prev,
        state: stateName
      }));
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.district) {
      const districtName = formData.district;
      setSelectedLocationNames(prev => ({
        ...prev,
        district: districtName
      }));
    }
  }, [formData.district]);

  useEffect(() => {
    if (formData.city) {
      const cityName = formData.city;
      setSelectedLocationNames(prev => ({
        ...prev,
        city: cityName
      }));
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
      const generatedAddress = addressParts.join(', ');
      setFormData(prev => ({
        ...prev,
        address: generatedAddress
      }));
    }
  }, [selectedLocationNames, formData.pincode]);;

  // Password validation functions
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
    return errors;
  };

  const passwordStrength = (password: string): { score: number; label: string; color: string; bgColor: string } => {
    const errors = validatePassword(password);
    const score = Math.max(0, 5 - errors.length);
    
    if (score === 5) return { score, label: "Very Strong", color: "text-green-600", bgColor: "bg-green-500" };
    if (score >= 4) return { score, label: "Strong", color: "text-green-500", bgColor: "bg-green-400" };
    if (score >= 3) return { score, label: "Medium", color: "text-yellow-500", bgColor: "bg-yellow-400" };
    if (score >= 2) return { score, label: "Weak", color: "text-orange-500", bgColor: "bg-orange-400" };
    return { score, label: "Very Weak", color: "text-red-500", bgColor: "bg-red-500" };
  };

  const businessTypes = [
    "Real Estate Agent",
    "Property Developer",
    "Construction Company",
    "Interior Designer",
    "Legal Services",
    "Home Loan Provider",
    "Packers & Movers",
    "Property Management",
    "Other"
  ];

  const experienceOptions = [
    "0-1 years",
    "2-5 years",
    "6-10 years",
    "10+ years"
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validation functions
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.email.trim() &&
          formData.phone.trim() &&
          formData.password &&
          formData.confirmPassword &&
          formData.password === formData.confirmPassword &&
          validatePassword(formData.password).length === 0 &&
          /\S+@\S+\.\S+/.test(formData.email) &&
          /^[+]?[1-9]\d{1,14}$/.test(formData.phone)
        );
      case 2:
        return !!(
          formData.businessName.trim() &&
          formData.businessType &&
          formData.businessDescription.trim() &&
          formData.businessDescription.trim().length >= 50 &&
          formData.experience
        );
      case 3:
        return !!(
          formData.address.trim() &&
          formData.state &&
          formData.district &&
          formData.city &&
          formData.pincode &&
          formData.pincode.length === 6
        );
      case 4:
        return !!(
          formData.panNumber.trim() &&
          uploadedDocuments.businessRegistration &&
          uploadedDocuments.identityProof
        );
      case 5:
        return otpStep === "sent";
      default:
        return true;
    }
  };

  const getValidationErrors = (step: number): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case 1:
        if (!formData.firstName.trim()) errors.push("First name is required");
        if (!formData.lastName.trim()) errors.push("Last name is required");
        if (!formData.email.trim()) errors.push("Email is required");
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.push("Valid email is required");
        if (!formData.phone.trim()) errors.push("Phone number is required");
        else if (!/^[+]?[1-9]\d{1,14}$/.test(formData.phone)) errors.push("Valid phone number is required");
        if (!formData.password) errors.push("Password is required");
        else {
          const passwordErrors = validatePassword(formData.password);
          if (passwordErrors.length > 0) {
            errors.push(`Password requirements: ${passwordErrors.join(', ')}`);
          }
        }
        if (!formData.confirmPassword) errors.push("Confirm password is required");
        else if (formData.password !== formData.confirmPassword) errors.push("Passwords do not match");
        break;
      case 2:
        if (!formData.businessName.trim()) errors.push("Business name is required");
        if (!formData.businessType) errors.push("Business type is required");
        if (!formData.businessDescription.trim()) errors.push("Business description is required");
        else if (formData.businessDescription.trim().length < 50) errors.push("Business description must be at least 50 characters");
        if (!formData.experience) errors.push("Experience is required");
        break;
      case 3:
        if (!formData.address.trim()) errors.push("Address is required");
        if (!formData.state) errors.push("State is required");
        if (!formData.district) errors.push("District is required");
        if (!formData.city) errors.push("City is required");
        if (!formData.pincode) errors.push("PIN code is required");
        else if (formData.pincode.length !== 6) errors.push("PIN code must be 6 digits");
        break;
      case 4:
        if (!formData.panNumber.trim()) errors.push("PAN number is required");
        if (!uploadedDocuments.businessRegistration) errors.push("Business registration certificate is required");
        if (!uploadedDocuments.identityProof) errors.push("Identity proof is required");
        break;
      case 5:
        if (otpStep === "none") errors.push("Please request OTP first");
        break;
    }
    
    return errors;
  };

  const handleDocumentUpload = async (documentType: string, file: File) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'vendor-documents');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/upload/single`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedDocuments(prev => ({
          ...prev,
          [documentType]: {
            name: file.name,
            url: result.data.url,
            size: file.size
          }
        }));

        toast({
          title: "Document Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
      const errors = getValidationErrors(currentStep);
      toast({
        title: "Please complete required fields",
        description: errors[0] || "Please fill in all required information before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Special handling for step 4 (Documents) -> step 5 (OTP)
    if (currentStep === 4 && otpStep === "none") {
      // Send OTP when moving from Documents to Email Verification
      try {
        setIsLoading(true);
        const { authService } = await import("@/services/authService");
        
        const response = await authService.sendOTP(formData.email, formData.firstName);
        if (response.success) {
          setOtpStep("sent");
          setOtpExpiry(response.expiryMinutes || 10);
          setCurrentStep(currentStep + 1);
          toast({
            title: "OTP Sent",
            description: `Verification code sent to ${formData.email}`,
          });
        }
      } catch (error) {
        console.error("OTP sending error:", error);
        toast({
          title: "Error",
          description: "Failed to send OTP. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    // Immediately register like customer flow to avoid OTP expiry
    // Set terms as accepted since it's required for vendors
    setFormData(prev => ({ ...prev, termsAccepted: true }));
    
    // Proceed directly to registration
    await handleRegistration();
  };

  const handleRegistration = async () => {
    if (!formData.termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to continue",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const requiredFields = {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone number",
      password: "Password",
      businessName: "Business name",
      businessType: "Business type",
      businessDescription: "Business description",
      experience: "Experience",
      address: "Address",
      city: "City",
      state: "State",
      pincode: "Pincode"
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]?.trim()) {
        toast({
          title: "Missing Information",
          description: `${label} is required`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    const cleanPhone = formData.phone.trim().replace(/[^\d+]/g, '');
    if (!phoneRegex.test(cleanPhone) && !phoneRegex.test('+91' + cleanPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      toast({
        title: "Weak Password",
        description: `Password requirements: ${passwordErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate pincode format (6 digits for India)
    if (!/^[0-9]{6}$/.test(formData.pincode)) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit pincode",
        variant: "destructive",
      });
      return;
    }

    // Validate location selection - ensure we have proper location codes
    if (!formData.state || !formData.city) {
      toast({
        title: "Location Required",
        description: "Please select your complete location (State and City)",
        variant: "destructive",
      });
      return;
    }

    // Validate that we have a valid OTP
    if (!otp || otp.length !== 6) {
      toast({
        title: "OTP Required",
        description: "Please provide a valid 6-digit OTP for registration.",
        variant: "destructive",
      });
      return;
    }

    console.log('OTP validation passed:', {
      otp: otp,
      otpStep: otpStep,
      email: formData.email
    });

    setIsLoading(true);

    try {
      // Import authService
      const { authService } = await import("@/services/authService");
      
      // Clean and validate phone number
      let cleanPhone = formData.phone.trim().replace(/[^\d+]/g, '');
      
      // Ensure phone number starts with + or a digit
      if (!cleanPhone.startsWith('+') && !cleanPhone.match(/^[1-9]/)) {
        // Add country code for India if no + prefix and doesn't start with valid digit
        cleanPhone = '+91' + cleanPhone;
      }
      
      // Prepare business info - only include non-empty fields
      const businessInfo: {
        businessName: string;
        businessType: string;
        businessDescription: string;
        experience: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        licenseNumber?: string;
        gstNumber?: string;
        panNumber?: string;
      } = {
        businessName: formData.businessName.trim(),
        businessType: formData.businessType,
        businessDescription: formData.businessDescription.trim(),
        experience: formData.experience,
        address: formData.address.trim(),
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode.trim()
      };
      
      // Only add optional fields if they have values
      if (formData.licenseNumber?.trim()) {
        businessInfo.licenseNumber = formData.licenseNumber.trim();
      }
      if (formData.gstNumber?.trim()) {
        businessInfo.gstNumber = formData.gstNumber.trim();
      }
      if (formData.panNumber?.trim()) {
        businessInfo.panNumber = formData.panNumber.trim();
      }
      
      // Prepare documents - only include documents that are actually uploaded
      const documents = {};
      Object.entries(uploadedDocuments).forEach(([key, doc]) => {
        if (doc && doc.url) {
          documents[key] = {
            name: doc.name,
            url: doc.url,
            size: doc.size
          };
        }
      });
      
      const registrationData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: cleanPhone,
        role: "agent", // Vendors are agents in the system
        agreeToTerms: true, // Must be true as per backend validation
        otp: otp.trim(), // Include verified OTP
        businessInfo: businessInfo,
        ...(Object.keys(documents).length > 0 && { documents }) // Only include documents if any exist
      };

      console.log('Submitting registration data:', JSON.stringify(registrationData, null, 2));

      const response = await authService.register(registrationData);
      
      if (response.success) {
        toast({
          title: "Registration Successful!",
          description: "Your vendor account has been created. Please wait for admin approval to start offering services.",
        });
        
        // Redirect to login after successful registration
        setTimeout(() => {
          navigate("/vendor/login");
        }, 2000);
      }
      
    } catch (error) {
      console.error("Vendor registration error:", error);
      
      // Extract more specific error information
      let errorMessage = "An error occurred during registration";
      let shouldRetryOTP = false;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific validation errors
        if (error.message.toLowerCase().includes('validation')) {
          errorMessage = "Please check all required fields and try again";
        } else if (error.message.toLowerCase().includes('email')) {
          errorMessage = "Email validation failed. Please check your email format";
        } else if (error.message.toLowerCase().includes('phone')) {
          errorMessage = "Phone number validation failed. Please check your phone number format";
        } else if (error.message.toLowerCase().includes('otp')) {
          if (error.message.includes('expired') || error.message.includes('not found')) {
            errorMessage = "Your OTP has expired. Please request a new OTP and try again.";
            shouldRetryOTP = true;
          } else {
            errorMessage = "OTP validation failed. Please verify your OTP";
          }
        } else if (error.message.toLowerCase().includes('password')) {
          errorMessage = "Password validation failed. Please check password requirements";
        }
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // If OTP expired, reset the flow to allow getting a new OTP
      if (shouldRetryOTP) {
        setOtpStep("none");
        setOtp("");
        setCurrentStep(5); // Back to OTP step
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setIsLoading(true);
      const { authService } = await import("@/services/authService");
      
      const response = await authService.sendOTP(formData.email, formData.firstName);
      if (response.success) {
        setOtp("");
        setOtpStep("sent"); // Reset to sent state
        setOtpExpiry(response.expiryMinutes || 10);
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email.",
        });
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // This function is called from the review step
    // Just delegate to the registration handler
    await handleRegistration();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-1">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter your first name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-1">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email address"
                  className="pl-10"
                  required
                />
              </div>
              {formData.email && !/\S+@\S+\.\S+/.test(formData.email) && (
                <p className="text-xs text-red-500">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d+]/g, ''); // Allow digits and +
                    if (value.length <= 15) { // Max 15 characters for international numbers
                      handleInputChange("phone", value);
                    }
                  }}
                  placeholder="Enter phone number (e.g., +919876543210 or 9876543210)"
                  className="pl-10"
                  maxLength={15}
                  required
                />
              </div>
              {formData.phone && formData.phone.length > 0 && !/^[+]?[1-9]\d{1,14}$/.test(formData.phone) && (
                <p className="text-xs text-red-500">Please enter a valid phone number</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    minLength={8}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && formData.password.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Password Strength:</span>
                      <span className={`text-xs font-medium ${passwordStrength(formData.password).color}`}>
                        {passwordStrength(formData.password).label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength(formData.password).bgColor}`}
                        style={{ width: `${(passwordStrength(formData.password).score / 5) * 100}%` }}
                      />
                    </div>
                    
                    {/* Password Requirements */}
                    <div className="space-y-1">
                      {validatePassword(formData.password).map((requirement, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          {requirement}
                        </div>
                      ))}
                      {validatePassword(formData.password).length === 0 && formData.password.length >= 8 && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          All requirements met
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password Match Validation */}
                {formData.confirmPassword && formData.confirmPassword.length > 0 && (
                  <div className="space-y-1">
                    {formData.password === formData.confirmPassword ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-1">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Enter your business name"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className="flex items-center gap-1">
                Business Type <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.businessType} 
                onValueChange={(value) => handleInputChange("businessType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="flex items-center gap-1">
                Years of Experience <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.experience} 
                onValueChange={(value) => handleInputChange("experience", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  {experienceOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessDescription" className="flex items-center gap-1">
                Business Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => handleInputChange("businessDescription", e.target.value)}
                placeholder="Describe your business, services, and expertise..."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 50 characters ({formData.businessDescription.length}/50)
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete business address (building, street, area)"
                  className="pl-10"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="border border-primary/20 rounded-lg p-6 bg-transparent">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Business Location
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select your business location for proper verification
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* State Selection */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-1">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        state: value, 
                        stateCode: value,
                        district: '',
                        districtCode: '',
                        city: '',
                        cityCode: '',
                        pincode: ''
                      }));
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
                  <Label htmlFor="district" className="flex items-center gap-1">
                    District <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.district} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        district: value, 
                        districtCode: value,
                        city: '',
                        cityCode: '',
                        pincode: ''
                      }));
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
                  <Label htmlFor="city" className="flex items-center gap-1">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        city: value, 
                        cityCode: value
                      }));
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
              <Label htmlFor="pincode" className="flex items-center gap-1">
                PIN Code <span className="text-red-500">*</span>
              </Label>
              <PincodeAutocomplete
                value={formData.pincode}
                onChange={(pincode, locationData) => {
                  console.log('Pincode selected:', pincode, locationData);
                  setFormData(prev => ({ ...prev, pincode }));
                  
                  // Auto-fill location fields if suggestion provides data
                  if (locationData) {
                    console.log('Auto-filling location from pincode:', locationData);
                    
                    // Set state if available and matches our states list
                    if (locationData.state && states.includes(locationData.state.toUpperCase())) {
                      const stateValue = locationData.state.toUpperCase();
                      setFormData(prev => ({
                        ...prev,
                        state: stateValue,
                        stateCode: stateValue
                      }));
                      
                      // Load districts and set district if available
                      setTimeout(() => {
                        if (locationData.district) {
                          const districtsForState = locaService.getDistricts(stateValue);
                          const matchingDistrict = districtsForState.find(d => 
                            d.toUpperCase() === locationData.district.toUpperCase()
                          );
                          
                          if (matchingDistrict) {
                            setFormData(prev => ({
                              ...prev,
                              district: matchingDistrict,
                              districtCode: matchingDistrict
                            }));
                            
                            // Load cities and set city if available
                            setTimeout(() => {
                              if (locationData.city) {
                                const citiesForDistrict = locaService.getCities(stateValue, matchingDistrict);
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
                    
                    // Show success toast
                    toast({
                      title: "Location Auto-filled",
                      description: `Location details populated from PIN code ${pincode}`,
                    });
                  }
                }}
                state={formData.state}
                district={formData.district}
                city={formData.city}
                placeholder="Enter or select PIN code"
              />
              {formData.pincode && formData.pincode.length === 6 && locaService.isReady() && (
                <div className="text-xs">
                  {locaService.validatePincode(formData.pincode) ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid PIN code
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      PIN code not found in our database
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Location Summary */}
            {(formData.state || formData.district || formData.city) && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Selected Location:
                </p>
                <p className="text-sm text-muted-foreground">
                  {[formData.city, formData.district, formData.state, formData.country]
                    .filter(Boolean)
                    .join(', ')}
                  {formData.pincode && ` - ${formData.pincode}`}
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Your Business Name"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select 
                value={formData.businessType} 
                onValueChange={(value) => handleInputChange("businessType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Select 
                value={formData.experience} 
                onValueChange={(value) => handleInputChange("experience", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">0-1 years</SelectItem>
                  <SelectItem value="2-5">2-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="10+">10+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessDescription">Business Description</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => handleInputChange("businessDescription", e.target.value)}
                placeholder="Describe your business, services, and expertise..."
                rows={4}
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Complete business address (building, street, area)"
                  className="pl-10"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Location Details</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select your business location from the dropdown menus
              </p>
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
                  state: "Select your state...",
                  district: "Select your district...",
                  city: "Select your city..."
                }}
                showValidation={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">PIN Code</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
                placeholder="Enter 6-digit PIN code (e.g., 400001)"
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Document Verification</h3>
              <p className="text-muted-foreground mb-4">
                Upload required documents for verification
              </p>
            </div>

            <div className="space-y-4">
              {/* Legal Information Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Professional License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                    placeholder="RERA/Professional License Number"
                  />
                  <p className="text-xs text-muted-foreground">
                    If applicable (RERA registration, broker license, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                    placeholder="GST Registration Number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="panNumber" className="flex items-center gap-1">
                  PAN Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="panNumber"
                  value={formData.panNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.length <= 10) {
                      handleInputChange("panNumber", value);
                    }
                  }}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  required
                />
                {formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber) && formData.panNumber.length === 10 && (
                  <p className="text-xs text-red-500">Please enter a valid PAN number format</p>
                )}
              </div>

              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadedDocuments.businessRegistration ? 'border-green-300 bg-green-50' : 'border-border hover:border-primary/50'
              }`}>
                <FileText className={`w-8 h-8 mx-auto mb-2 ${
                  uploadedDocuments.businessRegistration ? 'text-green-600' : 'text-muted-foreground'
                }`} />
                <p className="font-medium mb-1 flex items-center justify-center gap-2">
                  Business Registration Certificate
                  <span className="text-red-500">*</span>
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload your business registration or incorporation certificate
                </p>
                <input
                  id="business-registration"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('businessRegistration', file);
                  }}
                />
                <Button 
                  variant={uploadedDocuments.businessRegistration ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => document.getElementById('business-registration')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadedDocuments.businessRegistration ? 'Change File' : 'Choose File'}
                </Button>
                {uploadedDocuments.businessRegistration && (
                  <div className="mt-2 text-sm text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {uploadedDocuments.businessRegistration.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: PDF, JPG, JPEG, PNG (Max 10MB)
                </p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium mb-1">Professional License (Optional)</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload relevant professional licenses or certifications
                </p>
                <input
                  id="professional-license"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('professionalLicense', file);
                  }}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('professional-license')?.click()}
                >
                  Choose File
                </Button>
                {uploadedDocuments.professionalLicense && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ {uploadedDocuments.professionalLicense.name}
                  </div>
                )}
              </div>

              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadedDocuments.identityProof ? 'border-green-300 bg-green-50' : 'border-border hover:border-primary/50'
              }`}>
                <FileText className={`w-8 h-8 mx-auto mb-2 ${
                  uploadedDocuments.identityProof ? 'text-green-600' : 'text-muted-foreground'
                }`} />
                <p className="font-medium mb-1 flex items-center justify-center gap-2">
                  Identity Proof
                  <span className="text-red-500">*</span>
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload Aadhaar card, PAN card, or passport
                </p>
                <input
                  id="identity-proof"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload('identityProof', file);
                  }}
                />
                <Button 
                  variant={uploadedDocuments.identityProof ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => document.getElementById('identity-proof')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadedDocuments.identityProof ? 'Change File' : 'Choose File'}
                </Button>
                {uploadedDocuments.identityProof && (
                  <div className="mt-2 text-sm text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {uploadedDocuments.identityProof.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: PDF, JPG, JPEG, PNG (Max 10MB)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Document Security
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    All documents are encrypted and stored securely. We only use them for verification purposes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
              <p className="text-muted-foreground">
                Enter the 6-digit OTP sent to {formData.email}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="text-center text-lg tracking-wider"
                  required
                />
              </div>

              <Button
                type="button"
                onClick={handleOtpSubmit}
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading ? "Registering..." : "Complete Registration"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resendOtp}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Didn't receive OTP? Resend
                </Button>
              </div>

              {otpExpiry > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  OTP expires in {otpExpiry} minutes
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Email Verification Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    We need to verify your email address before completing your vendor registration.
                  </p>
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Store className="w-4 h-4 mr-2" />
              Vendor Registration
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              Join Our Vendor Network
            </h1>
            <p className="text-xl text-muted-foreground">
              Complete the registration process to become a verified vendor partner
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${
                    currentStep >= step.id 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden md:block w-full h-0.5 mt-5 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                Step {currentStep}: {steps[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {steps[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {renderStepContent()}

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>

                  {currentStep < 5 ? (
                    <Button 
                      type="button" 
                      onClick={handleNext} 
                      disabled={isLoading || !validateStep(currentStep)}
                      className={validateStep(currentStep) ? "" : "opacity-50"}
                    >
                      {isLoading && currentStep === 4 ? "Sending OTP..." : "Next"}
                      {!validateStep(currentStep) && (
                        <AlertCircle className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  ) : currentStep === 5 ? (
                    null // OTP step has its own submit button
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isLoading || !formData.termsAccepted || otpStep !== "verified"}
                    >
                      {isLoading ? "Submitting..." : "Submit Application"}
                    </Button>
                  )}
                </div>

                {/* Step validation indicators */}
                {!validateStep(currentStep) && currentStep < 5 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Please complete the following:</p>
                        <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                          {getValidationErrors(currentStep).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Quick Review</h3>
                <p className="text-sm text-muted-foreground">
                  We'll review your application within 24-48 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Secure Process</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and handled securely
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Easy Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Once approved, you'll get instant access to your dashboard
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Already have account */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Already have a vendor account?{" "}
              <Link to="/vendor/login" className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VendorRegister;
