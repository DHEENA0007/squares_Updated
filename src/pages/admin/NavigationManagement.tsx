import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NavigationTab from '@/components/admin/configuration/NavigationTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const NavigationManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Menu className="h-8 w-8" />
            Navigation Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage navigation bar items for the home page
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> Configure the main navigation menu items that appear on the home page navigation bar.
          Create dynamic categories and subcategories for property listings.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <NavigationTab />
        </CardContent>
      </Card>
    </div>
  );
};

export default NavigationManagement;
