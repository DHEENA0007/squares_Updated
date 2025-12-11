import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SignupIllustration from "@/components/illustrations/SignupIllustration";
import { authService } from "@/services/authService";
import { validateEmail, validateIndianPhone, validatePassword } from "@/utils/sanitize";

const Signup = () => {
  const navigate = useNavigate();
  
  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [canResend, setCanResend] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.firstName.trim().length < 2) {
      toast({
        title: "Error",
        description: "First name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    if (!validateEmail(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate Indian phone number format
    if (!validateIndianPhone(formData.phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number starting with 6-9",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      toast({
        title: "Error",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Check if phone validation passed
    if (phoneValidation.available === false) {
      toast({
        title: "Error",
        description: phoneValidation.message || "Phone number is not available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Send OTP first (includes phone validation on backend)
      const otpResponse = await authService.sendOTP(formData.email, formData.firstName, formData.phone);
      
      if (otpResponse.success) {
        setStep("otp");
        setOtpExpiry(otpResponse.expiryMinutes || 10);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error("OTP sending error:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Register user with OTP verification
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: "customer",
        agreeToTerms: true,
        otp: otp, // Include OTP in registration
      });

      if (response.success) {
        setStep("success");
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        toast({
          title: "Registration Successful!",
          description: "Your account has been created successfully. Redirecting to login...",
        });
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Reset OTP field on error
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setIsLoading(true);
      await authService.sendOTP(formData.email, formData.firstName, formData.phone);
      setOtp("");
    } catch (error) {
      console.error("Resend OTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background to-accent/10">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Illustration Section */}
          <div className="hidden lg:block">
            <div className="w-full h-auto rounded-2xl shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
              <SignupIllustration />
            </div>
          </div>

          {/* Form Section */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-card rounded-2xl shadow-xl p-8 border">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                <p className="text-muted-foreground">
                  {step === "form" 
                    ? "Sign up to get started with BuildHomeMart"
                    : "Enter the OTP sent to your email"}
                </p>
              </div>

              {step === "form" ? (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="10-digit phone number"
                      value={formData.phone}
                      onChange={(e) => {
                        const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phone: newPhone });
                        
                        // Debounce phone validation
                        if (newPhone.length === 10) {
                          setTimeout(() => checkPhoneAvailability(newPhone), 500);
                        } else {
                          setPhoneValidation({ checking: false, available: null, message: "" });
                        }
                      }}
                      required
                      className={
                        phoneValidation.available === false ? "border-red-500" :
                        phoneValidation.available === true ? "border-green-500" : ""
                      }
                    />
                    {phoneValidation.checking && (
                      <p className="text-xs text-muted-foreground">Checking availability...</p>
                    )}
                    {phoneValidation.available === false && (
                      <p className="text-xs text-red-500">{phoneValidation.message}</p>
                    )}
                    {phoneValidation.available === true && (
                      <p className="text-xs text-green-600">{phoneValidation.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Must be 8+ characters with uppercase, lowercase, number, and special character (!@#$%^&*)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                                        <a href="/login" className="text-primary font-medium hover:underline">
                      Login here
                    </a>
                  </p>
                </form>
              ) : step === "otp" ? (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-center block">Enter 6-Digit OTP</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      OTP sent to {formData.email}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? "Verifying..." : "Register"}
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={resendOtp}
                      disabled={isLoading}
                    >
                      Resend OTP
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setStep("form")}
                    >
                      Back to Form
                    </Button>
                  </div>
                </form>
              ) : step === "success" ? (
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-600 mb-2">Account Created Successfully!</h3>
                    <p className="text-muted-foreground">
                      Your account has been created and email verified. Redirecting to login page...
                    </p>
                  </div>
                  <Button 
                                        onClick={() => navigate("/login")} 
                    className="w-full"
                  >
                    Continue to Login
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
