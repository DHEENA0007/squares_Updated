import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Key, Shield, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { userService } from "@/services/userService";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PasswordChangeDialog = ({ open, onOpenChange }: PasswordChangeDialogProps) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);

  // Password validation
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
    return errors;
  };

  const passwordStrength = (password: string): { score: number; label: string; color: string } => {
    const errors = validatePassword(password);
    const score = Math.max(0, 5 - errors.length);
    
    if (score === 5) return { score, label: "Very Strong", color: "text-green-600" };
    if (score >= 4) return { score, label: "Strong", color: "text-green-500" };
    if (score >= 3) return { score, label: "Medium", color: "text-yellow-500" };
    if (score >= 2) return { score, label: "Weak", color: "text-orange-500" };
    return { score, label: "Very Weak", color: "text-red-500" };
  };

  const canSubmit = () => {
    return (
      formData.currentPassword.length > 0 &&
      formData.newPassword.length >= 8 &&
      formData.newPassword === formData.confirmPassword &&
      validatePassword(formData.newPassword).length === 0 &&
      formData.currentPassword !== formData.newPassword
    );
  };

  const handleSubmit = async () => {
    if (step === 'password') {
      if (!canSubmit()) return;

      try {
        setLoading(true);
        setErrors([]);

        // First, request OTP
        const response = await userService.requestPasswordChangeOTP(formData.currentPassword);
        
        if (response.success) {
          setStep('otp');
          setOtpSent(true);
          setOtpExpiry(response.expiryMinutes || 5);
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

      try {
        setLoading(true);
        setErrors([]);

        // Verify OTP and change password
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
          setStep('password');
          setOtpSent(false);

          // Close dialog
          onOpenChange(false);

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
    setStep('password');
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
            {step === 'password' ? 'Change Password' : 'Verify Email'}
          </DialogTitle>
          <DialogDescription>
            {step === 'password' 
              ? 'Enter your current password and choose a new secure password.'
              : `We've sent a verification code to your registered email. Please enter the code below.`
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

          {step === 'otp' && (
            <>
              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={formData.otp}
                  onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
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

          {step === 'password' && (
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
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

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
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        strength.score >= 4 ? 'bg-green-500' :
                        strength.score >= 3 ? 'bg-yellow-500' :
                        strength.score >= 2 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${strength.color}`}>
                    {strength.label}
                  </span>
                </div>
                
                {/* Password Requirements */}
                {validationErrors.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-muted-foreground">Requirements:</p>
                    {validationErrors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-red-600">
                        <X className="w-3 h-3" />
                        <span>{error}</span>
                      </div>
                    ))}
                    {validatePassword(formData.newPassword).length === 0 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-3 h-3" />
                        <span>Password meets all requirements</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="text-xs">
                {formData.newPassword === formData.confirmPassword ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="w-3 h-3" />
                    <span>Passwords don't match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-medium">Security Tips:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Use a unique password you haven't used elsewhere</li>
                  <li>Consider using a password manager</li>
                  <li>Don't share your password with anyone</li>
                </ul>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          {step === 'password' && (
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit() || loading}
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
