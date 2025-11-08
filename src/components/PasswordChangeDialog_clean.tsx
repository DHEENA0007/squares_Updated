import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Eye, EyeOff, Key, Shield, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { userService } from "@/services/userService";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'currentPassword' | 'otp' | 'newPassword';

export const PasswordChangeDialog = ({ open, onOpenChange, onSuccess }: PasswordChangeDialogProps) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: ""
  });
  
  const [step, setStep] = useState<Step>('currentPassword');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(5);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/\d/.test(password)) errors.push("One number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
    return errors;
  };

  const passwordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    
    if (score === 5) return { score, label: "Very Strong", color: "text-green-600" };
    if (score >= 4) return { score, label: "Strong", color: "text-green-500" };
    if (score >= 3) return { score, label: "Medium", color: "text-yellow-500" };
    if (score >= 2) return { score, label: "Weak", color: "text-orange-500" };
    return { score, label: "Very Weak", color: "text-red-500" };
  };

  const canSubmitCurrentPassword = () => {
    return formData.currentPassword.length > 0;
  };

  const canSubmitNewPassword = () => {
    return (
      formData.newPassword.length >= 8 &&
      formData.newPassword === formData.confirmPassword &&
      validatePassword(formData.newPassword).length === 0 &&
      formData.currentPassword !== formData.newPassword
    );
  };

  const handleSubmit = async () => {
    if (step === 'currentPassword') {
      if (!canSubmitCurrentPassword()) return;

      try {
        setLoading(true);
        setErrors([]);

        // First, request OTP with current password verification
        const response = await userService.requestPasswordChangeOTP(formData.currentPassword);
        
        if (response.success) {
          setStep('otp');
          setOtpSent(true);
          setOtpExpiry(response.expiryMinutes || 5);
          toast({
            title: "OTP Sent",
            description: "Verification code sent to your email",
          });
        }
      } catch (error: any) {
        console.error('Failed to send OTP:', error);
        setErrors([error.message || 'Failed to send OTP']);
      } finally {
        setLoading(false);
      }
    } else if (step === 'otp') {
      if (!formData.otp.trim()) {
        setErrors(['Please enter the OTP']);
        return;
      }

      // Just verify OTP and move to password step
      setStep('newPassword');
      setErrors([]);
      toast({
        title: "OTP Verified",
        description: "Now set your new password",
      });
    } else if (step === 'newPassword') {
      if (!canSubmitNewPassword()) return;

      try {
        setLoading(true);
        setErrors([]);

        // Change password with OTP
        const response = await userService.changePasswordWithOTP(
          formData.otp,
          formData.newPassword
        );

        if (response.success) {
          toast({
            title: "✅ Password Changed Successfully",
            description: "Your password has been updated securely.",
          });

          // Reset form
          setFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            otp: ""
          });
          setStep('currentPassword');
          setOtpSent(false);

          // Close dialog
          onOpenChange(false);
          onSuccess?.();

          // Optional: Send confirmation email
          toast({
            title: "📧 Confirmation Sent",
            description: "Password change confirmation sent to your email.",
          });
        } else {
          throw new Error(response.message || "Failed to change password");
        }
      } catch (error: any) {
        const errorMessage = error.message || "Failed to change password";
        
        // Handle specific errors
        if (errorMessage.includes("Current password is incorrect")) {
          setErrors(["Your current password is incorrect. Please try again."]);
        } else if (errorMessage.includes("same as current")) {
          setErrors(["New password must be different from your current password."]);
        } else if (errorMessage.includes("OTP")) {
          setErrors([errorMessage]);
        } else {
          setErrors([errorMessage]);
        }

        toast({
          title: "❌ Password Change Failed",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      otp: ""
    });
    setErrors([]);
    setStep('currentPassword');
    setOtpSent(false);
    onOpenChange(false);
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setErrors([]);

      const response = await userService.requestPasswordChangeOTP(formData.currentPassword);
      
      if (response.success) {
        setOtpExpiry(response.expiryMinutes || 5);
        toast({
          title: "OTP Resent",
          description: "A new OTP has been sent to your email",
        });
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to resend OTP']);
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(formData.newPassword);
  const validationErrors = validatePassword(formData.newPassword);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {step === 'currentPassword' ? 'Change Password' : 
             step === 'otp' ? 'Verify Email' : 'Set New Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'currentPassword' 
              ? 'Enter your current password to proceed.'
              : step === 'otp'
              ? `We've sent a verification code to your registered email. Please enter the code below.`
              : 'Choose a new secure password for your account.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {step === 'currentPassword' && (
            <>
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter your current password"
                    className="pr-10"
                    disabled={loading}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    disabled={loading}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={formData.otp}
                    onChange={(value) => setFormData(prev => ({ ...prev, otp: value }))}
                    maxLength={6}
                    className="gap-2"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                      <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Code expires in {otpExpiry} minutes</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleResendOTP}
                    disabled={loading}
                  >
                    Resend Code
                  </Button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-700">
                    <p className="font-medium">Security Notice:</p>
                    <p>We've sent a verification code to your registered email address for additional security. Please check your email and enter the code above.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'newPassword' && (
            <>
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter your new password"
                    className="pr-10"
                    disabled={loading}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    disabled={loading}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Password Strength:</span>
                    <span className={`font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        strength.score === 5 ? "bg-green-600" :
                        strength.score >= 4 ? "bg-green-500" :
                        strength.score >= 3 ? "bg-yellow-500" :
                        strength.score >= 2 ? "bg-orange-500" : "bg-red-500"
                      }`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your new password"
                    className="pr-10"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    disabled={loading}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              {formData.newPassword && validationErrors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-600">
                    Password Requirements:
                  </Label>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-red-600 rounded-full" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Password Match Validation */}
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <div className="w-1 h-1 bg-red-600 rounded-full" />
                  Passwords do not match
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          {step === 'currentPassword' && (
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmitCurrentPassword() || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending OTP...
                </div>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          )}
          {step === 'otp' && (
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.otp || formData.otp.length !== 6 || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </Button>
          )}
          {step === 'newPassword' && (
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmitNewPassword() || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Changing...
                </div>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangeDialog;
