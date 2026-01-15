import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, FolderTree } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NavigationTab from '@/components/admin/configuration/NavigationTab';
import CategoryManagementTab from '@/components/admin/configuration/CategoryManagementTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

const NavigationManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('navigation');

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
            Configure hierarchical navigation structure and categories
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>How it works:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>First, create <strong>categories</strong> to organize property types (e.g., Residential, Commercial)</li>
              <li>Navbar dropdowns are created from <strong>listing types</strong> in Filter Management (For Sale, For Rent, etc.)</li>
              <li>Create property types and assign them to a listing type and category</li>
              <li>Property types appear as options in their assigned listing type's dropdown</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="navigation" className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                Navigation Items
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="navigation">
              <NavigationTab />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagementTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NavigationManagement;
