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
import { authService } from "@/services/authService";
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
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  // Auto-scroll to top on component mount and step change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [currentStep, otpStep]);

  // Validation states
  const [emailValidation, setEmailValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ""
  });

  const [phoneValidation, setPhoneValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ""
  });

  const [businessNameValidation, setBusinessNameValidation] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ""
  });

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
    { id: 5, title: "Review & Submit", description: "Review profile" },
    { id: 6, title: "Verify Email", description: "Email verification" }
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
  }, [selectedLocationNames, formData.pincode, formData.address]);

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

  // Business types - matching backend Vendor model enum values
  // These represent the type of real estate services the vendor provides
  const businessTypes = [
    { label: "Real Estate Agent", value: "real_estate_agent" },
    { label: "Property Developer", value: "property_developer" },
    { label: "Construction Company", value: "construction_company" },
    { label: "Interior Designer", value: "interior_designer" },
    { label: "Legal Services", value: "legal_services" },
    { label: "Home Loan Provider", value: "home_loan_provider" },
    { label: "Packers & Movers", value: "packers_movers" },
    { label: "Property Management", value: "property_management" },
    { label: "Other", value: "other" }
  ];

  // Experience options - will be converted to numbers (in years)
  const experienceOptions = [
    { label: "0-1 years", value: 0 },
    { label: "2-5 years", value: 3 },
    { label: "6-10 years", value: 8 },
    { label: "10+ years", value: 10 }
  ];

  // Email availability check
  const checkEmailAvailability = async (email: string) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({
        checking: false,
        available: null,
        message: ""
      });
      return;
    }

    setEmailValidation({ checking: true, available: null, message: "" });
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api'}/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.exists) {
        setEmailValidation({
          checking: false,
          available: false,
          message: "This email is already registered. Please use a different email or login."
        });
      } else {
        setEmailValidation({
          checking: false,
          available: true,
          message: ""
        });
      }
    } catch (error) {
      console.error("Email check error:", error);
      setEmailValidation({
        checking: false,
        available: null,
        message: "Could not verify email availability"
      });
    }
  };

  // Phone number availability check
  const checkPhoneAvailability = async (phone: string) => {
    if (phone.length !== 10) {
      setPhoneValidation({ checking: false, available: null, message: "" });
      return;
    }

    setPhoneValidation({ checking: true, available: null, message: "" });
    
    try {
      const result = await authService.checkPhoneAvailability(phone);
      setPhoneValidation({
        checking: false,
        available: result.available,
        message: result.message
      });
    } catch (error) {
      setPhoneValidation({
        checking: false,
        available: false,
        message: "Unable to validate phone number"
      });
    }
  };

  // Business name availability check
  const checkBusinessNameAvailability = async (businessName: string) => {
    if (businessName.trim().length < 3) {
      setBusinessNameValidation({ checking: false, available: null, message: "" });
      return;
    }

    setBusinessNameValidation({ checking: true, available: null, message: "" });
    
    try {
      const result = await authService.checkBusinessNameAvailability(businessName.trim());
      setBusinessNameValidation({
        checking: false,
        available: result.available,
        message: result.message
      });
    } catch (error) {
      setBusinessNameValidation({
        checking: false,
        available: false,
        message: "Unable to validate business name"
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Trigger validations with debounce
    if (field === "email" && typeof value === "string") {
      setTimeout(() => checkEmailAvailability(value), 500);
    } else if (field === "phone" && typeof value === "string") {
      setTimeout(() => checkPhoneAvailability(value), 500);
    } else if (field === "businessName" && typeof value === "string") {
      setTimeout(() => checkBusinessNameAvailability(value), 500);
    }
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
          formData.phone.length === 10 &&
          /^[6-9]\d{9}$/.test(formData.phone) &&
          emailValidation.available !== false &&
          phoneValidation.available !== false
        );
      case 2:
        return !!(
          formData.businessName.trim() &&
          formData.businessType &&
          formData.businessDescription.trim() &&
          formData.businessDescription.trim().length >= 50 &&
          formData.experience &&
          businessNameValidation.available !== false
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
        return formData.termsAccepted;
      case 6:
        return otpStep === "verified";
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
        else if (emailValidation.available === false) errors.push("Email is already registered");
        if (!formData.phone.trim()) errors.push("Phone number is required");
        else if (formData.phone.length !== 10) errors.push("Phone number must be exactly 10 digits");
        else if (!/^[6-9]\d{9}$/.test(formData.phone)) errors.push("Phone number must start with 6-9");
        else if (phoneValidation.available === false) errors.push("Phone number is already registered");
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
        else if (businessNameValidation.available === false) errors.push("Business name is already registered");
        if (!formData.businessType) errors.push("Business type is required");
        if (!formData.businessDescription.trim()) errors.push("Business description is required");
        else if (formData.businessDescription.trim().length < 10) errors.push("Business description must be at least 10 characters");
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
        if (!formData.panNumber.trim()) {
          errors.push("PAN number is required");
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.trim().toUpperCase())) {
          errors.push("PAN number must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)");
        }
        if (!uploadedDocuments.businessRegistration) errors.push("Business registration certificate is required");
        if (!uploadedDocuments.identityProof) errors.push("Identity proof is required");
        break;
      case 5:
        if (!formData.termsAccepted) errors.push("Please accept the terms and conditions");
        break;
      case 6:
        if (otpStep === "none") errors.push("Please verify your email first");
        break;
    }
    
    return errors;
  };

  const handleDocumentUpload = async (documentType: string, file: File) => {
    if (!file) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `${file.name} exceeds 10MB. Please choose a smaller file.`,
        variant: "destructive",
      });
      return;
    }

    // Show uploading toast
    const uploadingToast = toast({
      title: "Uploading...",
      description: `Uploading ${file.name}`,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'vendor-documents');

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api'}/upload/single`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

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
      
      let errorMessage = `Failed to upload ${file.name}. Please try again.`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Upload timed out. ${file.name} may be too large or connection is slow.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
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

    // Special handling for step 5 (Review & Submit) -> step 6 (OTP)
    if (currentStep === 5) {
      // Submit profile to admin and then send OTP
      await handleProfileSubmission();
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    // Allow navigation to any step that has been completed or is the current step
    // Don't allow jumping forward to incomplete steps
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  // Handle profile preparation and OTP sending (step 5)
  const handleProfileSubmission = async () => {
    try {
      setIsLoading(true);
      
      // Just send OTP, don't submit profile to admin yet
      const otpResponse = await authService.sendOTP(formData.email, formData.firstName);
      
      if (otpResponse.success) {
        setOtpStep("sent");
        setOtpExpiry(otpResponse.expiryMinutes || 10);
        setCurrentStep(6); // Move to OTP step
        
        toast({
          title: "Profile Ready for Submission",
          description: "Please verify your email to submit profile to admin for approval.",
        });
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error) {
      console.error("OTP sending error:", error);
      toast({
        title: "OTP Failed",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

    try {
      setIsLoading(true);
      
      // Complete registration with OTP verification (same as customer flow)
      await handleFinalRegistration();
      
      setOtpStep("verified");
      
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed", 
        description: error instanceof Error ? error.message : "Failed to complete registration. Please try again.",
        variant: "destructive",
      });
      setOtp(""); // Clear OTP on error
    } finally {
      setIsLoading(false);
    }
  };

  // This function is no longer needed as the backend handles admin notification
  // after successful registration

  // Final registration after OTP verification
  const handleFinalRegistration = async () => {
    setIsLoading(true);

    try {
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
        experience: number;
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
        experience: Number(formData.experience), // Convert to number
        address: formData.address.trim(),
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode.trim()
      };
      
      // Only add optional fields if they have values AND are valid
      if (formData.licenseNumber?.trim()) {
        businessInfo.licenseNumber = formData.licenseNumber.trim();
      }
      if (formData.gstNumber?.trim()) {
        businessInfo.gstNumber = formData.gstNumber.trim();
      }
      // PAN Number: Only include if it's provided AND matches the valid format
      if (formData.panNumber?.trim()) {
        const cleanPan = formData.panNumber.trim().toUpperCase();
        // Validate PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          businessInfo.panNumber = cleanPan;
        } else {
          // If PAN is provided but invalid, throw an error
          toast({
            title: "Invalid PAN Number",
            description: "PAN number must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Prepare documents - convert to array format expected by backend
      // Backend expects: verification.documents = [{ type, name, url }]
      // Map document keys to backend document types
      const documentTypeMap: { [key: string]: string } = {
        businessRegistration: 'business_license',
        professionalLicense: 'business_license',
        identityProof: 'identity',
        addressProof: 'address',
        panCard: 'pan_card',
        gstCertificate: 'gst_certificate'
      };
      
      const documents = Object.entries(uploadedDocuments)
        .filter(([_, doc]) => doc && doc.url)
        .map(([key, doc]) => ({
          type: documentTypeMap[key] || 'other',
          name: doc.name,
          url: doc.url,
          status: 'pending',
          uploadDate: new Date().toISOString()
        }));
      
      console.log('Prepared documents for backend:', documents);
      
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
        documents: documents // Always include documents array (can be empty)
      };
      
      console.log('Final registration payload:', JSON.stringify(registrationData, null, 2));

      const response = await authService.register(registrationData);
      
      if (response.success) {
        // Clear any auto-stored tokens - vendors must wait for approval
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        toast({
          title: "Registration Successful!",
          description: "Your vendor account has been created and submitted for admin approval. You will receive an email notification once approved. You can try logging in after approval.",
          duration: 6000,
        });
        
        // Redirect to login after successful registration
        setTimeout(() => {
          navigate("/vendor/login");
        }, 3000);
      }
      
    } catch (error) {
      console.error("Final registration error:", error);
      
      let errorMessage = "An error occurred during registration";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // This function has been removed - registration now properly flows through:
  // Step 5: Review -> handleNext -> handleProfileSubmission (sends OTP)
  // Step 6: OTP Verification -> handleOtpSubmit -> handleFinalRegistration (creates account)

  const resendOtp = async () => {
    try {
      setIsLoading(true);
      
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
    
    // Prevent form submission - all actions are handled by specific buttons
    // Form submission should not trigger any registration logic
    return false;
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
                  className={`pl-10 ${
                    emailValidation.available === false ? "border-red-500" :
                    emailValidation.available === true ? "border-green-500" : ""
                  }`}
                  required
                />
              </div>
              {emailValidation.checking && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {emailValidation.available === false && (
                <p className="text-xs text-red-500">{emailValidation.message}</p>
              )}
              {emailValidation.available === true && (
                <p className="text-xs text-green-600">Email is available</p>
              )}
              {formData.email && !/\S+@\S+\.\S+/.test(formData.email) && !emailValidation.checking && emailValidation.available === null && (
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
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '').substring(0, 10); // Only allow digits, max 10
                    handleInputChange("phone", value);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    const digits = pastedText.replace(/[^\d]/g, '').substring(0, 10);
                    handleInputChange("phone", digits);
                  }}
                  placeholder="Enter 10-digit phone number"
                  className={`pl-10 ${
                    phoneValidation.available === false ? "border-red-500" :
                    phoneValidation.available === true ? "border-green-500" : ""
                  }`}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  required
                />
              </div>
              {phoneValidation.checking && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {phoneValidation.available === false && (
                <p className="text-xs text-red-500">{phoneValidation.message}</p>
              )}
              {phoneValidation.available === true && (
                <p className="text-xs text-green-600">Phone number is available</p>
              )}
              {formData.phone && formData.phone.length > 0 && formData.phone.length < 10 && (
                <p className="text-xs text-red-500">Phone number must be exactly 10 digits</p>
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
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
                value={formData.experience?.toString()} 
                onValueChange={(value) => handleInputChange("experience", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  {experienceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
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
                Minimum 10 characters ({formData.businessDescription.length}/10)
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
                    // Only allow alphanumeric characters and convert to uppercase
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (value.length <= 10) {
                      handleInputChange("panNumber", value);
                    }
                  }}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={formData.panNumber && formData.panNumber.length === 10 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber) ? 'border-red-500' : ''}
                  required
                />
                {formData.panNumber && formData.panNumber.length > 0 && (
                  <div className="text-xs">
                    {formData.panNumber.length < 10 ? (
                      <p className="text-muted-foreground">
                        {10 - formData.panNumber.length} more character{10 - formData.panNumber.length !== 1 ? 's' : ''} needed
                      </p>
                    ) : /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber) ? (
                      <p className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Valid PAN format
                      </p>
                    ) : (
                      <p className="text-red-500">
                        Invalid format. Must be: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
                      </p>
                    )}
                  </div>
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
              <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
              <p className="text-muted-foreground">
                Please review your details before submitting for admin approval
              </p>
            </div>

            {/* Personal Information Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p>{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p>{formData.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p>{formData.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Information Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                    <p>{formData.businessName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                    <p>{formData.businessType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                    <p>{formData.experience}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{formData.businessDescription}</p>
                </div>
              </CardContent>
            </Card>

            {/* Location Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p>{formData.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p>{formData.city}, {formData.district}, {formData.state} - {formData.pincode}</p>
                </div>
              </CardContent>
            </Card>

            {/* Documents Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents & Legal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
                    <p>{formData.panNumber}</p>
                  </div>
                  {formData.gstNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">GST Number</Label>
                      <p>{formData.gstNumber}</p>
                    </div>
                  )}
                  {formData.licenseNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                      <p>{formData.licenseNumber}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Uploaded Documents</Label>
                  <div className="space-y-1 mt-1">
                    {uploadedDocuments.businessRegistration && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Business Registration: {uploadedDocuments.businessRegistration.name}
                      </div>
                    )}
                    {uploadedDocuments.identityProof && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Identity Proof: {uploadedDocuments.identityProof.name}
                      </div>
                    )}
                    {uploadedDocuments.professionalLicense && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Professional License: {uploadedDocuments.professionalLicense.name}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => handleInputChange("termsAccepted", checked)}
                required
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-primary hover:underline">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Next Steps
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Click "Proceed to Email Verification" to receive an OTP. After verifying your email, your profile will be submitted to admin for approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
              <p className="text-muted-foreground">
                Enter the 6-digit OTP sent to {formData.email} to complete your vendor registration.
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
                  autoComplete="off"
                  required
                />
              </div>

              <Button
                type="button"
                onClick={handleOtpSubmit}
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading ? "Completing Registration..." : "Complete Registration"}
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
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Email Verification Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Please check your email for the verification code. After verification, your registration will be complete and your profile will be sent to admin for approval.
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
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">
            <Store className="w-4 h-4 mr-2" />
            Vendor Registration
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            Join Our Vendor Network
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete the registration process to become a verified vendor partner
          </p>
        </div>

        {/* Progress Steps - Step-by-Step Indicator */}
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <div className="relative">
            {/* Connecting Lines */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted -z-10">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            <div className="flex items-start justify-between">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                const isClickable = stepNumber <= currentStep;

                return (
                  <div key={step.id} className="flex flex-col items-center flex-1 max-w-[120px]">
                    <button
                      onClick={() => isClickable && handleStepClick(stepNumber)}
                      disabled={!isClickable}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 cursor-pointer shadow-md'
                          : isCurrent
                          ? 'bg-primary border-primary text-primary-foreground cursor-pointer shadow-lg scale-110'
                          : 'bg-background border-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? <span className="text-white font-bold">{stepNumber}</span> : stepNumber}
                    </button>
                    <div className="text-center mt-2 px-1">
                      <p className={`text-xs font-semibold ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Text */}
            <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              Step {currentStep}: {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-base">
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderStepContent()}

              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || (currentStep === 6 && profileSubmitted)}
                  size="lg"
                >
                  Previous
                </Button>

                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading || !validateStep(currentStep)}
                    className={validateStep(currentStep) ? "shadow-md" : "opacity-50"}
                    size="lg"
                  >
                    Next
                    {!validateStep(currentStep) && (
                      <AlertCircle className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                ) : currentStep === 5 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading || !validateStep(currentStep)}
                    className={validateStep(currentStep) ? "shadow-md" : "opacity-50"}
                    size="lg"
                  >
                    {isLoading ? "Sending OTP..." : "Proceed to Email Verification"}
                    {!validateStep(currentStep) && (
                      <AlertCircle className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                ) : currentStep === 6 ? (
                  null // OTP step has its own submit button
                ) : null}
              </div>

              {/* Step validation indicators */}
              {!validateStep(currentStep) && currentStep < 6 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Please complete the following:</p>
                      <ul className="text-sm text-amber-700 mt-2 space-y-1">
                        {getValidationErrors(currentStep).map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {error}
                          </li>
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
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1 text-sm">Quick Review</h3>
              <p className="text-xs text-muted-foreground">
                We'll review your application within 24-48 hours
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1 text-sm">Secure Process</h3>
              <p className="text-xs text-muted-foreground">
                Your data is encrypted and handled securely
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1 text-sm">Easy Setup</h3>
              <p className="text-xs text-muted-foreground">
                Once approved, you'll get instant access to your dashboard
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Already have account */}
        <div className="text-center py-2">
          <p className="text-muted-foreground">
            Already have a vendor account?{" "}
            <Link to="/vendor/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
    <Footer />
  </>
);
};

export default VendorRegister;