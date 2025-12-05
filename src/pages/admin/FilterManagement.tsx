import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import FiltersTab from '@/components/admin/configuration/FiltersTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FilterManagement: React.FC = () => {
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
            <Filter className="h-8 w-8" />
            Filter Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure search filters for the property search page
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> These filters appear on the customer property search page.
          Create dynamic filter types like Bedrooms, Budget, Listing Type, Furnishing, etc.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <FiltersTab />
        </CardContent>
      </Card>
    </div>
  );
};

export default FilterManagement;
