import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PropertyTypesTab from '@/components/admin/configuration/PropertyTypesTab';
import AmenitiesTab from '@/components/admin/configuration/AmenitiesTab';
import FiltersTab from '@/components/admin/configuration/FiltersTab';
import NavigationTab from '@/components/admin/configuration/NavigationTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FilterManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('property-management');

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
            Filter Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage property types, amenities, and filters dynamically
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          Changes made here will affect all property listings, filters, and search functionality across the application.
          Please review changes carefully before saving.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="property-management">Property Management</TabsTrigger>
              <TabsTrigger value="filter-configuration">Filter Configuration</TabsTrigger>
              <TabsTrigger value="navigation-management">Navigation Management</TabsTrigger>
            </TabsList>

            <TabsContent value="property-management" className="mt-6">
              <Tabs defaultValue="property-types" className="w-full">
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
            </TabsContent>

            <TabsContent value="filter-configuration" className="mt-6">
              <FiltersTab />
            </TabsContent>

            <TabsContent value="navigation-management" className="mt-6">
              <NavigationTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FilterManagement;
