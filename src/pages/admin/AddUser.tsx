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
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { userService } from "@/services/userService";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EnhancedLocationSelector from "@/components/vendor/EnhancedLocationSelector";

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
  status: z.enum(["active", "inactive", "suspended", "pending"]),
};

const vendorFields = {
  businessName: z.string().min(2, "Business name is required for vendors"),
  businessType: z.string().min(1, "Business type is required for vendors"),
  businessDescription: z.string().optional(),
  experience: z.string().optional(),
  licenseNumber: z.string().optional(),
  gstNumber: z.string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      "Invalid GST number format"
    ),
  panNumber: z.string()
    .optional()
    .refine(
      (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
      "Invalid PAN format (e.g., ABCDE1234F)"
    ),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{6}$/.test(val),
      "Pincode must be exactly 6 digits"
    ),
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

const userSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("agent"), ...baseFields, ...vendorFields }),
  z.object({ role: z.literal("customer"), ...baseFields, ...optionalVendorFields }),
  z.object({ role: z.literal("admin"), ...baseFields, ...optionalVendorFields }),
  z.object({ role: z.literal("subadmin"), ...baseFields, ...optionalVendorFields }),
  z.object({ role: z.literal("superadmin"), ...baseFields, ...optionalVendorFields }),
]).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type UserFormValues = z.infer<typeof userSchema>;

const AddUser = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("customer");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [locationData, setLocationData] = useState({
    country: "India",
    countryCode: "IN",
    state: "",
    stateCode: "",
    district: "",
    districtCode: "",
    city: "",
    cityCode: "",
    pincode: "",
  });

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
      experience: "",
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
      }
    } catch (error) {
      console.error('Phone check failed:', error);
      setPhoneAvailable(null);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      // Final validation before submission
      if (!emailAvailable) {
        toast({
          title: "Error",
          description: "Email is already registered. Please use a different email.",
          variant: "destructive",
        });
        return;
      }

      if (!phoneAvailable) {
        toast({
          title: "Error",
          description: "Phone number is already registered. Please use a different number.",
          variant: "destructive",
        });
        return;
      }

      // Validate required fields for vendor role
      if (data.role === "agent") {
        if (!data.businessName || !data.businessType) {
          toast({
            title: "Error",
            description: "Business name and type are required for vendor accounts.",
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
      if (data.role === "agent") {
        userData.businessInfo = {
          businessName: data.businessName,
          businessType: data.businessType,
          businessDescription: data.businessDescription,
          experience: parseInt(data.experience || "0"),
          licenseNumber: data.licenseNumber,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          website: data.website,
        };

        userData.profile.address = {
          street: data.address,
          city: locationData.city || data.city,
          district: locationData.district || data.district,
          state: locationData.state || data.state,
          zipCode: data.pincode,
          country: locationData.country,
          countryCode: locationData.countryCode,
          stateCode: locationData.stateCode,
          districtCode: locationData.districtCode,
          cityCode: locationData.cityCode,
        };
      }

      await userService.createUser(userData);
      
      toast({
        title: "Success",
        description: `${data.role === "agent" ? "Vendor" : "User"} created successfully.`,
      });
      navigate("/admin/users");
    } catch (error) {
      console.error("Failed to create user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLocationChange = (location: any) => {
    setLocationData({
      country: location.country || "India",
      countryCode: location.countryCode || "IN",
      state: location.state || "",
      stateCode: location.stateCode || "",
      district: location.district || "",
      districtCode: location.districtCode || "",
      city: location.city || "",
      cityCode: location.cityCode || "",
      pincode: location.pincode || "",
    });

    form.setValue("city", location.city || "");
    form.setValue("district", location.district || "");
    form.setValue("state", location.state || "");
    form.setValue("pincode", location.pincode || "");
  };

  const isVendor = selectedRole === "agent";

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
                                if (value && value.includes('@')) {
                                  const timeoutId = setTimeout(() => {
                                    checkEmailAvailability(value);
                                  }, 500);
                                  return () => clearTimeout(timeoutId);
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
                              onChange={(e) => {
                                field.onChange(e);
                                const value = e.target.value;
                                if (value && value.length === 10) {
                                  const timeoutId = setTimeout(() => {
                                    checkPhoneAvailability(value);
                                  }, 500);
                                  return () => clearTimeout(timeoutId);
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
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="agent">Vendor/Agent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="subadmin">Sub Admin</SelectItem>
                            <SelectItem value="superadmin">Super Admin</SelectItem>
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
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
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
                              <Input placeholder="Enter business name" {...field} />
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
                            <FormLabel>Business Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the business..." 
                                rows={3}
                                {...field} 
                              />
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
                            <FormLabel>PAN Number</FormLabel>
                            <FormControl>
                              <Input placeholder="ABCDE1234F" {...field} />
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
                              <Input placeholder="22ABCDE1234F1Z5" {...field} />
                            </FormControl>
                            <FormMessage />
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
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <EnhancedLocationSelector
                        value={locationData}
                        onChange={handleLocationChange}
                      />
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
              <Button type="submit">Create {isVendor ? "Vendor" : "User"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddUser;