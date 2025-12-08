import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { userService } from "@/services/userService";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { locaService, PincodeSuggestion } from "@/services/locaService";
import { PincodeAutocomplete } from "@/components/PincodeAutocomplete";
import { useEffect, useCallback } from "react";
import roleService, { Role } from "@/services/roleService";

const baseFields = {
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^[0-9]{10}$/, "Must be exactly 10 digits")
    .min(10, "Must be exactly 10 digits")
    .max(10, "Must be exactly 10 digits"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      "Password must contain uppercase, lowercase, number, and special character (!@#$%^&*)"),
  confirm_password: z.string().min(1, "Please confirm your password"),
  status: z.enum(["active", "inactive"]),
};

const vendorFields = {
  businessName: z.string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters"),
  businessType: z.string()
    .min(1, "Business type is required for vendors")
    .refine(
      (val) => ['real_estate_agent', 'property_developer', 'construction_company', 'interior_designer', 'legal_services', 'home_loan_provider', 'packers_movers', 'property_management', 'other'].includes(val),
      "Invalid business type"
    ),
  businessDescription: z.string()
    .min(50, "Business description must be at least 50 characters")
    .max(500, "Business description cannot exceed 500 characters"),
  experience: z.string()
    .refine(
      (val) => !val || (Number(val) >= 0 && Number(val) <= 50),
      "Experience must be between 0 and 50 years"
    ),
  licenseNumber: z.string()
    .max(50, "License number cannot exceed 50 characters")
    .optional(),
  gstNumber: z.string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      "Invalid GST number format (e.g., 22ABCDE1234F1Z5)"
    ),
  panNumber: z.string()
    .min(10, "PAN number must be exactly 10 characters")
    .max(10, "PAN number must be exactly 10 characters")
    .refine(
      (val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
      "Invalid PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)"
    ),
  website: z.string()
    .url("Invalid URL format")
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address cannot exceed 200 characters"),
  city: z.string()
    .min(2, "City is required")
    .max(50, "City name cannot exceed 50 characters"),
  district: z.string()
    .min(2, "District is required")
    .max(50, "District name cannot exceed 50 characters"),
  state: z.string()
    .min(2, "State is required")
    .max(50, "State name cannot exceed 50 characters"),
  pincode: z.string()
    .length(6, "Pincode must be exactly 6 digits")
    .regex(/^[0-9]{6}$/, "Pincode must contain only numbers"),
};

const optionalVendorFields = {
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  businessDescription: z.string().optional(),
  experience: z.string().optional(),
  licenseNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
};

const vendorSchemaObj = z.object(vendorFields);

const userSchema = z.object({
  role: z.string().min(1, "Role is required"),
  ...baseFields,
  ...optionalVendorFields,
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
}).superRefine((data, ctx) => {
  const role = data.role.toLowerCase();
  if (role === 'agent' || role === 'vendor') {
    const result = vendorSchemaObj.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: issue.path,
        });
      });
    }
  }
});

type UserFormValues = z.infer<typeof userSchema>;

const AddUser = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isVendorRole = (r: string) => r.toLowerCase() === 'agent' || r.toLowerCase() === 'vendor';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("customer");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingBusinessName, setIsCheckingBusinessName] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [businessNameAvailable, setBusinessNameAvailable] = useState<boolean | null>(null);
  const [emailTimeoutId, setEmailTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [phoneTimeoutId, setPhoneTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [businessNameTimeoutId, setBusinessNameTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [businessNameAbortController, setBusinessNameAbortController] = useState<AbortController | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getRoles({ limit: 100, isActive: true });
        setRoles(response.data.roles);
      } catch (error) {
        console.error("Failed to fetch roles", error);
      }
    };
    fetchRoles();
  }, []);

  // Location service states
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locaInitialized, setLocaInitialized] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "customer",
      status: "active",
      password: "",
      confirm_password: "",
      businessName: "",
      businessType: "",
      businessDescription: "",
      experience: "0",
      licenseNumber: "",
      gstNumber: "",
      panNumber: "",
      website: "",
      address: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
    },
  });

  // Initialize locaService
  useEffect(() => {
    const initLocaService = async () => {
      try {
        if (!locaService.isReady()) {
          await locaService.initialize();
        }
        const loadedStates = locaService.getStates();
        setStates(loadedStates);
        setLocaInitialized(true);
      } catch (error) {
        console.error('Failed to initialize loca service:', error);
        setStates([]);
      }
    };

    initLocaService();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (selectedState && locaInitialized) {
      const loadedDistricts = locaService.getDistricts(selectedState);
      setDistricts(loadedDistricts);
      setSelectedDistrict("");
      setSelectedCity("");
      setCities([]);
    } else {
      setDistricts([]);
      setSelectedDistrict("");
      setCities([]);
    }
  }, [selectedState, locaInitialized]);

  // Load cities when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict && locaInitialized) {
      const loadedCities = locaService.getCities(selectedState, selectedDistrict);
      setCities(loadedCities);
      setSelectedCity("");
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedState, selectedDistrict, locaInitialized]);

  // Clear business name check when role changes
  useEffect(() => {
    if (!isVendorRole(selectedRole)) {
      setBusinessNameAvailable(null);
      setIsCheckingBusinessName(false);
      if (businessNameTimeoutId) {
        clearTimeout(businessNameTimeoutId);
        setBusinessNameTimeoutId(null);
      }
      if (businessNameAbortController) {
        businessNameAbortController.abort();
        setBusinessNameAbortController(null);
      }
    }
  }, [selectedRole, businessNameTimeoutId, businessNameAbortController]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (emailTimeoutId) clearTimeout(emailTimeoutId);
      if (phoneTimeoutId) clearTimeout(phoneTimeoutId);
      if (businessNameTimeoutId) clearTimeout(businessNameTimeoutId);
      if (businessNameAbortController) businessNameAbortController.abort();
    };
  }, [emailTimeoutId, phoneTimeoutId, businessNameTimeoutId, businessNameAbortController]);

  // Email availability check with debounce
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await userService.checkAvailability({ email });
      setEmailAvailable(response.data.email.available);

      if (!response.data.email.available) {
        form.setError('email', {
          type: 'manual',
          message: response.data.email.message
        });
      } else {
        // Clear any existing error when email becomes available
        form.clearErrors('email');
      }
    } catch (error) {
      console.error('Email check failed:', error);
      setEmailAvailable(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Phone availability check with debounce
  const checkPhoneAvailability = async (phone: string) => {
    if (!phone || phone.length !== 10) {
      setPhoneAvailable(null);
      return;
    }

    setIsCheckingPhone(true);
    try {
      const response = await userService.checkAvailability({ phone });
      setPhoneAvailable(response.data.phone.available);

      if (!response.data.phone.available) {
        form.setError('phone', {
          type: 'manual',
          message: response.data.phone.message
        });
      } else {
        // Clear any existing error when phone becomes available
        form.clearErrors('phone');
      }
    } catch (error) {
      console.error('Phone check failed:', error);
      setPhoneAvailable(null);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Business name availability check with debounce (only for vendor role)
  const checkBusinessNameAvailability = useCallback(async (businessName: string) => {
    // Cancel any pending request
    if (businessNameAbortController) {
      businessNameAbortController.abort();
    }

    // Only check for vendor/agent role
    if (selectedRole !== 'agent') {
      setBusinessNameAvailable(null);
      return;
    }

    if (!businessName || businessName.trim().length < 2) {
      setBusinessNameAvailable(null);
      return;
    }

    const controller = new AbortController();
    setBusinessNameAbortController(controller);
    setIsCheckingBusinessName(true);

    try {
      const response = await userService.checkAvailability({ businessName: businessName.trim() });

      // Don't update state if request was aborted
      if (controller.signal.aborted) return;

      setBusinessNameAvailable(response.data.businessName?.available ?? null);

      if (response.data.businessName && !response.data.businessName.available) {
        form.setError('businessName', {
          type: 'manual',
          message: response.data.businessName.message
        });
      } else {
        form.clearErrors('businessName');
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Business name check failed:', error);
      setBusinessNameAvailable(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsCheckingBusinessName(false);
        setBusinessNameAbortController(null);
      }
    }
  }, [selectedRole, form, businessNameAbortController]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      // Check if availability checks are still running
      if (isCheckingEmail) {
        toast({
          title: "Please wait",
          description: "Email availability check in progress...",
          variant: "destructive",
        });
        return;
      }

      if (isCheckingPhone) {
        toast({
          title: "Please wait",
          description: "Phone availability check in progress...",
          variant: "destructive",
        });
        return;
      }

      // Only check business name for vendor role
      if (isVendorRole(data.role) && isCheckingBusinessName) {
        toast({
          title: "Please wait",
          description: "Business name availability check in progress...",
          variant: "destructive",
        });
        return;
      }

      // Final validation before submission
      if (emailAvailable === false) {
        toast({
          title: "Error",
          description: "Email is already registered. Please use a different email.",
          variant: "destructive",
        });
        return;
      }

      if (phoneAvailable === false) {
        toast({
          title: "Error",
          description: "Phone number is already registered. Please use a different number.",
          variant: "destructive",
        });
        return;
      }

      // Check business name for vendor role only
      if (isVendorRole(data.role)) {
        if (businessNameAvailable === false) {
          toast({
            title: "Error",
            description: "Business name is already registered. Please use a different name.",
            variant: "destructive",
          });
          return;
        }

        if (businessNameAvailable === null && data.businessName && data.businessName.trim().length >= 2) {
          toast({
            title: "Error",
            description: "Please wait for business name availability check to complete.",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate required fields for vendor role
      if (isVendorRole(data.role)) {
        if (!data.businessName || !data.businessType) {
          toast({
            title: "Error",
            description: "Business name and type are required for vendor accounts.",
            variant: "destructive",
          });
          return;
        }

        if (!data.businessDescription || data.businessDescription.length < 50) {
          toast({
            title: "Error",
            description: "Business description must be at least 50 characters.",
            variant: "destructive",
          });
          return;
        }

        if (!data.panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber)) {
          toast({
            title: "Error",
            description: "Valid PAN number is required for vendor accounts.",
            variant: "destructive",
          });
          return;
        }

        if (!data.address || data.address.length < 10) {
          toast({
            title: "Error",
            description: "Complete address is required for vendor accounts (minimum 10 characters).",
            variant: "destructive",
          });
          return;
        }

        if (!data.city || !data.state || !data.pincode) {
          toast({
            title: "Error",
            description: "City, state, and pincode are required for vendor accounts.",
            variant: "destructive",
          });
          return;
        }

        if (data.gstNumber && data.gstNumber.length > 0 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber)) {
          toast({
            title: "Error",
            description: "Invalid GST number format.",
            variant: "destructive",
          });
          return;
        }
      }

      const userData: any = {
        email: data.email,
        password: data.password,
        profile: {
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
        },
        role: data.role,
        status: data.status,
      };

      // If role is agent/vendor, include vendor profile data
      if (isVendorRole(data.role)) {
        userData.businessInfo = {
          businessName: data.businessName.trim(),
          businessType: data.businessType,
          businessDescription: data.businessDescription.trim(),
          experience: parseInt(data.experience || "0"),
          address: data.address.trim(),
          city: data.city,
          state: data.state,
          pincode: data.pincode.trim(),
        };

        // Only add optional fields if they have values
        if (data.licenseNumber?.trim()) {
          userData.businessInfo.licenseNumber = data.licenseNumber.trim();
        }
        if (data.gstNumber?.trim()) {
          userData.businessInfo.gstNumber = data.gstNumber.trim();
        }
        if (data.panNumber?.trim()) {
          userData.businessInfo.panNumber = data.panNumber.trim().toUpperCase();
        }
        if (data.website?.trim()) {
          userData.businessInfo.website = data.website.trim();
        }

      }

      // Add address for vendor users
      if (isVendorRole(data.role)) {
        userData.profile.address = {
          street: data.address,
          city: data.city,
          district: data.district,
          state: data.state,
          zipCode: data.pincode,
          country: "India",
          countryCode: "IN",
          stateCode: "",
          districtCode: "",
          cityCode: "",
        };
      }

      const response = await userService.createUser(userData);

      toast({
        title: "Success",
        description: `${isVendorRole(data.role) ? "Vendor" : "User"} created successfully.${isVendorRole(data.role) ? " Vendor profile has been auto-approved." : ""}`,
      });
      navigate("/admin/users");
    } catch (error: any) {
      console.error("Failed to create user:", error);

      // Extract error message
      let errorMessage = "Failed to create user. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Check for specific errors
      if (errorMessage.includes("Duplicate business name")) {
        errorMessage = "Business name already exists. Please choose a different name.";
      } else if (errorMessage.includes("duplicate key") && errorMessage.includes("email")) {
        errorMessage = "Email address is already registered.";
      } else if (errorMessage.includes("duplicate key") && errorMessage.includes("phone")) {
        errorMessage = "Phone number is already registered.";
      } else if (errorMessage.includes("vendor profile")) {
        errorMessage = `${errorMessage} The user account was not created.`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const isVendor = isVendorRole(selectedRole);

  return (
    <div className="max-w-5xl mx-auto mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New User</h1>
        <p className="text-muted-foreground mt-1">Create a new user account</p>
      </div>

      <div className="bg-card rounded-lg border p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>User account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="Enter email"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const value = e.target.value;

                                // Clear existing timeout
                                if (emailTimeoutId) {
                                  clearTimeout(emailTimeoutId);
                                }

                                if (value && value.includes('@')) {
                                  const timeoutId = setTimeout(() => {
                                    checkEmailAvailability(value);
                                  }, 500);
                                  setEmailTimeoutId(timeoutId);
                                } else {
                                  setEmailAvailable(null);
                                  form.clearErrors('email');
                                }
                              }}
                              className={emailAvailable === false ? 'border-red-500' : emailAvailable === true ? 'border-green-500' : ''}
                            />
                            {isCheckingEmail && (
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Checking...</span>
                            )}
                            {!isCheckingEmail && emailAvailable === true && (
                              <span className="absolute right-3 top-2.5 text-xs text-green-600">Available ✓</span>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Enter 10-digit phone"
                              {...field}
                              maxLength={10}
                              onChange={(e) => {
                                field.onChange(e);
                                const value = e.target.value;

                                // Clear existing timeout
                                if (phoneTimeoutId) {
                                  clearTimeout(phoneTimeoutId);
                                }

                                if (value && value.length === 10) {
                                  const timeoutId = setTimeout(() => {
                                    checkPhoneAvailability(value);
                                  }, 500);
                                  setPhoneTimeoutId(timeoutId);
                                } else {
                                  setPhoneAvailable(null);
                                  form.clearErrors('phone');
                                }
                              }}
                              className={phoneAvailable === false ? 'border-red-500' : phoneAvailable === true ? 'border-green-500' : ''}
                            />
                            {isCheckingPhone && (
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Checking...</span>
                            )}
                            {!isCheckingPhone && phoneAvailable === true && (
                              <span className="absolute right-3 top-2.5 text-xs text-green-600">Available ✓</span>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedRole(value);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.length > 0 ? (
                              roles.map((role) => (
                                <SelectItem key={role._id} value={role.name}>
                                  {role.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="agent">Vendor/Agent</SelectItem>
                                <SelectItem value="subadmin">Sub Admin</SelectItem>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-enter password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vendor/Agent Information */}
            {isVendor && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Vendor business details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Enter business name"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    const value = e.target.value;

                                    if (businessNameTimeoutId) {
                                      clearTimeout(businessNameTimeoutId);
                                    }

                                    // Only check if role is agent/vendor
                                    if (isVendorRole(selectedRole) && value && value.trim().length >= 2) {
                                      const timeoutId = setTimeout(() => {
                                        checkBusinessNameAvailability(value);
                                      }, 500); // 500ms debounce
                                      setBusinessNameTimeoutId(timeoutId);
                                    } else {
                                      setBusinessNameAvailable(null);
                                      form.clearErrors('businessName');
                                    }
                                  }}
                                  className={businessNameAvailable === false ? 'border-red-500' : businessNameAvailable === true ? 'border-green-500' : ''}
                                  maxLength={100}
                                />
                                {isCheckingBusinessName && (
                                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Checking...</span>
                                )}
                                {!isCheckingBusinessName && businessNameAvailable === true && (
                                  <span className="absolute right-3 top-2.5 text-xs text-green-600">Available ✓</span>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select business type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                                <SelectItem value="property_developer">Property Developer</SelectItem>
                                <SelectItem value="construction_company">Construction Company</SelectItem>
                                <SelectItem value="interior_designer">Interior Designer</SelectItem>
                                <SelectItem value="legal_services">Legal Services</SelectItem>
                                <SelectItem value="home_loan_provider">Home Loan Provider</SelectItem>
                                <SelectItem value="packers_movers">Packers & Movers</SelectItem>
                                <SelectItem value="property_management">Property Management</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter years" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessDescription"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Business Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the business, services, and expertise (minimum 50 characters)..."
                                rows={4}
                                {...field}
                                maxLength={500}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              {field.value?.length || 0}/500 characters (minimum 50)
                            </p>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Legal Information</CardTitle>
                    <CardDescription>Business registration and license details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="panNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PAN Number *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCDE1234F"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  if (value.length <= 10) {
                                    field.onChange(value);
                                  }
                                }}
                                maxLength={10}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gstNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="22ABCDE1234F1Z5"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  if (value.length <= 15) {
                                    field.onChange(value);
                                  }
                                }}
                                maxLength={15}
                              />
                            </FormControl>
                            <FormMessage />
                            {field.value && field.value.length > 0 && field.value.length < 15 && (
                              <p className="text-xs text-muted-foreground">
                                GST number should be 15 characters
                              </p>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="licenseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>License Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter license number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location Information</CardTitle>
                    <CardDescription>Business address and location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Complete business address (building, street, area)"
                                {...field}
                                rows={2}
                                maxLength={200}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              {field.value?.length || 0}/200 characters (minimum 10)
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Location Fields using locaService */}
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedState(value);
                                form.setValue("district", "");
                                form.setValue("city", "");
                              }}
                              disabled={!locaInitialized}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={locaInitialized ? "Select state" : "Loading..."} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {states.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>District *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedDistrict(value);
                                form.setValue("city", "");
                              }}
                              disabled={!selectedState || districts.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={selectedState ? "Select district" : "Select state first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {districts.map((district) => (
                                  <SelectItem key={district} value={district}>
                                    {district}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedCity(value);
                              }}
                              disabled={!selectedDistrict || cities.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={selectedDistrict ? "Select city" : "Select district first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode *</FormLabel>
                            <FormControl>
                              <PincodeAutocomplete
                                value={field.value}
                                onChange={(pincode, locationData) => {
                                  console.log('Pincode selected:', pincode, locationData);
                                  field.onChange(pincode);

                                  // Auto-fill location fields if suggestion provides data
                                  if (locationData) {
                                    console.log('Auto-filling location from pincode:', locationData);

                                    // Set state if available and matches our states list
                                    if (locationData.state && states.includes(locationData.state.toUpperCase())) {
                                      const stateValue = locationData.state.toUpperCase();
                                      setSelectedState(stateValue);
                                      form.setValue("state", stateValue);

                                      // Load districts and set district if available
                                      setTimeout(() => {
                                        if (locationData.district) {
                                          const districtsForState = locaService.getDistricts(stateValue);
                                          const matchingDistrict = districtsForState.find(d =>
                                            d.toUpperCase() === locationData.district.toUpperCase()
                                          );

                                          if (matchingDistrict) {
                                            setSelectedDistrict(matchingDistrict);
                                            form.setValue("district", matchingDistrict);

                                            // Load cities and set city if available
                                            setTimeout(() => {
                                              if (locationData.city) {
                                                const citiesForDistrict = locaService.getCities(stateValue, matchingDistrict);
                                                const matchingCity = citiesForDistrict.find(c =>
                                                  c.toUpperCase() === locationData.city.toUpperCase()
                                                );

                                                if (matchingCity) {
                                                  setSelectedCity(matchingCity);
                                                  form.setValue("city", matchingCity);
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
                                state={selectedState}
                                district={selectedDistrict}
                                city={selectedCity}
                                placeholder="Enter or select PIN code"
                              />
                            </FormControl>
                            <FormMessage />
                            {field.value && field.value.length === 6 && locaService.isReady() && (
                              <div className="text-xs">
                                {locaService.validatePincode(field.value) ? (
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
                          </FormItem>
                        )}
                      />

                      {/* Location Summary */}
                      {(selectedState || selectedDistrict || selectedCity) && (
                        <div className="bg-muted/50 border border-border rounded-lg p-4">
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Selected Location:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {[selectedCity, selectedDistrict, selectedState, "India"]
                              .filter(Boolean)
                              .join(', ')}
                            {form.watch("pincode") && ` - ${form.watch("pincode")}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/users")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCheckingEmail || isCheckingPhone || isCheckingBusinessName}
              >
                Create {isVendor ? "Vendor" : "User"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddUser;