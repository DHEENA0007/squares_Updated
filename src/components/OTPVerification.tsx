import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Shield, CheckCircle } from 'lucide-react';
import { userService } from '@/services/userService';

interface OTPVerificationProps {
  email: string;
  firstName: string;
  onVerificationSuccess: () => void;
  onResendOTP?: () => void;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  firstName,
  onVerificationSuccess,
  onResendOTP
}) => {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setOTP(value);
      setError('');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await userService.verifyOTP(email, otp);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      }
    } catch (error: any) {
      setError(error.message || 'Invalid OTP. Please try again.');
      
      // Update attempts left if provided in error response
      if (error.attemptsLeft !== undefined) {
        setAttemptsLeft(error.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    setOTP('');

    try {
      const result = await userService.sendOTP(email, firstName);
      
      if (result.success) {
        setTimeLeft((result.expiryMinutes || 10) * 60); // Convert to seconds
        setAttemptsLeft(5); // Reset attempts
        onResendOTP?.();
      }
    } catch (error: any) {
      setError(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-green-600">Email Verified!</h3>
            <p className="text-muted-foreground">
              Your email has been successfully verified. You can now complete your registration.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Mail className="w-12 h-12 text-primary" />
            <Shield className="w-5 h-5 text-green-500 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
          </div>
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to
          <br />
          <strong>{email}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm font-medium">
              Enter verification code
            </label>
            <Input
              id="otp"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={handleOTPChange}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest"
              disabled={loading}
              autoComplete="one-time-code"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {attemptsLeft > 0 ? `${attemptsLeft} attempts remaining` : 'No attempts left'}
              </span>
              {timeLeft > 0 && (
                <span>Expires in {formatTime(timeLeft)}</span>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleResendOTP}
            disabled={resendLoading || timeLeft > 0}
          >
            {resendLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : timeLeft > 0 ? (
              `Resend in ${formatTime(timeLeft)}`
            ) : (
              'Resend Code'
            )}
          </Button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">Security Tip</p>
              <p>Never share this code with anyone. BuildHomeMart Squares will never ask for your verification code.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
