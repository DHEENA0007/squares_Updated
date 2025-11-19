import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, Home } from 'lucide-react';
import { userService } from '@/services/userService';

const ConfirmDeletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing deletion token.');
        return;
      }

      try {
        const response = await userService.confirmAccountDeletion(token);
        
        if (response.success) {
          setStatus('success');
          setMessage('Your account has been permanently deleted. All your data has been removed from our servers.');
          
          setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            navigate('/v2');
          }, 5000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to delete account.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred while deleting your account.');
      }
    };

    confirmDeletion();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && <Loader2 className="w-16 h-16 text-red-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-16 h-16 text-green-500" />}
            {status === 'error' && <AlertTriangle className="w-16 h-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Deleting Account...'}
            {status === 'success' && 'Account Deleted'}
            {status === 'error' && 'Deletion Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we permanently delete your account'}
            {status === 'success' && 'Your account has been permanently removed'}
            {status === 'error' && 'Unable to delete your account'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={status === 'error' ? 'destructive' : status === 'success' ? 'default' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> This action is permanent. All your data has been removed and cannot be recovered. You can create a new account anytime if needed.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {status === 'success' && (
              <Button onClick={() => navigate('/v2')} className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={() => navigate('/v2/customer/settings')} className="w-full">
                  Back to Settings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/v2')} 
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

export default ConfirmDeletion;
