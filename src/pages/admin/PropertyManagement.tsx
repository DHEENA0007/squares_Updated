import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PropertyTypesTab from '@/components/admin/configuration/PropertyTypesTab';
import AmenitiesTab from '@/components/admin/configuration/AmenitiesTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PropertyManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('property-types');

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
            <Settings className="h-8 w-8" />
            Property Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage property types, listing types, and amenities for property listings
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> These settings affect the Add Property page and how properties are categorized.
          Changes here will be reflected when adding or editing properties.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="property-types">Property Types</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
            </TabsList>

            <TabsContent value="property-types" className="mt-6">
              <PropertyTypesTab />
            </TabsContent>

            <TabsContent value="amenities" className="mt-6">
              <AmenitiesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyManagement;
