import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, Home } from 'lucide-react';
import { userService } from '@/services/userService';

const ConfirmDeactivation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmDeactivation = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing deactivation token.');
        return;
      }

      try {
        const response = await userService.confirmAccountDeactivation(token);
        
        if (response.success) {
          setStatus('success');
          setMessage('Your account has been deactivated. You can reactivate it anytime by logging in.');
          
          setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to deactivate account.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred while deactivating your account.');
      }
    };

    confirmDeactivation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-16 h-16 text-green-500" />}
            {status === 'error' && <AlertTriangle className="w-16 h-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Deactivating Account...'}
            {status === 'success' && 'Account Deactivated'}
            {status === 'error' && 'Deactivation Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we process your request'}
            {status === 'success' && 'Your account has been temporarily deactivated'}
            {status === 'error' && 'Unable to deactivate your account'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> You can reactivate your account anytime by logging in again. All your data will be restored.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={() => navigate('/customer/settings')} className="w-full">
                  Back to Settings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/v3')} 
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmDeactivation;
