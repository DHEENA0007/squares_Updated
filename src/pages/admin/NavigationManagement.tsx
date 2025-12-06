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
            Configure hierarchical navigation structure for the home page navbar
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>How it works:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Navbar dropdowns are created from <strong>listing types</strong> in Filter Management (For Sale, For Rent, etc.)</li>
              <li>Create property types below and assign them to a listing type</li>
              <li>Property types appear as options in their assigned listing type's dropdown</li>
              <li>Use tabs to view property types grouped by listing type</li>
            </ol>
          </div>
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
