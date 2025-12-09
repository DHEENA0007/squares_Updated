import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PropertyTypesTab from '@/components/admin/configuration/PropertyTypesTab';
import AmenitiesTab from '@/components/admin/configuration/AmenitiesTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PropertyManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('property-types');
  const permissions = user?.rolePermissions || [];
  
  // Check if user has admin role
  const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin';
  
  // Permission checks - support both old role-based AND new permission-based
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canViewPropertyManagement = hasAdminRole || hasPermission(PERMISSIONS.PM_READ);

  useEffect(() => {
    if (!canViewPropertyManagement) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view property management.",
        variant: "destructive",
      });
      navigate('/rolebased');
    }
  }, [canViewPropertyManagement, navigate, toast]);

  if (!canViewPropertyManagement) {
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
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription>
                    <strong>Property Type Fields:</strong> Click the <Settings className="h-3 w-3 inline mx-1" /> icon next to each property type to configure which fields vendors must fill when adding that type of property.
                  </AlertDescription>
                </Alert>
                <PropertyTypesTab />
              </div>
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
