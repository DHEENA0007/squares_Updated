import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import type { PropertyType, CreatePropertyTypeDTO, UpdatePropertyTypeDTO } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

const PropertyTypesTab: React.FC = () => {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState<CreatePropertyTypeDTO>({
    name: '',
    value: '',
    category: '',
    icon: '',
    displayOrder: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPropertyTypes();
  }, []);

  const fetchPropertyTypes = async () => {
    try {
      setIsLoading(true);
      const [data, categoryDetails] = await Promise.all([
        configurationService.getAllPropertyTypes(true),
        configurationService.getPropertyTypeCategoryDetails(),
      ]);
      
      setPropertyTypes(data);

      // Extract unique categories from API response
      const uniqueCategories = Array.from(new Set(data.map(pt => pt.category))).sort();
      setCategories(uniqueCategories);

      // Set active category to first one if not set
      if (!activeCategory && uniqueCategories.length > 0) {
        setActiveCategory(uniqueCategories[0]);
      }
    } catch (error) {
      console.error('Error fetching property types:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch property types',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a category name',
        variant: 'destructive',
      });
      return;
    }

    const categoryValue = newCategoryName.toLowerCase().replace(/\s+/g, '_');

    if (categories.includes(categoryValue)) {
      toast({
        title: 'Error',
        description: 'This category already exists',
        variant: 'destructive',
      });
      return;
    }

    setCategories([...categories, categoryValue].sort());
    setActiveCategory(categoryValue);
    setNewCategoryName('');
    setIsNewCategoryDialogOpen(false);

    toast({
      title: 'Success',
      description: `Category "${newCategoryName}" created successfully. You can now add property types to it.`,
    });
  };

  const getTypesByCategory = (category: string) => {
    return propertyTypes.filter((type) => type.category === category);
  };

  const getCategoryCount = (category: string) => {
    const types = getTypesByCategory(category);
    const activeCount = types.filter(t => t.isActive).length;
    return { total: types.length, active: activeCount };
  };

  const handleOpenDialog = (type?: PropertyType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        value: type.value,
        category: type.category,
        icon: type.icon || '',
        displayOrder: type.displayOrder,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        value: '',
        category: activeCategory,
        icon: '',
        displayOrder: getTypesByCategory(activeCategory).length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData({
      name: '',
      value: '',
      category: '',
      icon: '',
      displayOrder: 0,
    });
  };

  const handleSave = async () => {
    try {
      if (editingType) {
        await configurationService.updatePropertyType(editingType._id, formData);
        toast({
          title: 'Success',
          description: 'Property type updated successfully',
        });
      } else {
        await configurationService.createPropertyType(formData);
        toast({
          title: 'Success',
          description: 'Property type created successfully',
        });
      }
      fetchPropertyTypes();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingType ? 'Failed to update property type' : 'Failed to create property type',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await configurationService.updatePropertyType(id, { isActive: !currentStatus });
      toast({
        title: 'Success',
        description: `Property type ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchPropertyTypes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update property type status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property type? This action cannot be undone.')) {
      return;
    }

    try {
      await configurationService.deletePropertyType(id);
      toast({
        title: 'Success',
        description: 'Property type deleted successfully',
      });
      fetchPropertyTypes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete property type',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down', category: string) => {
    const categoryTypes = getTypesByCategory(category);
    const index = categoryTypes.findIndex((t) => t._id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categoryTypes.length - 1)
    ) {
      return;
    }

    const newOrder = [...categoryTypes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await Promise.all(
        newOrder.map((type, idx) =>
          configurationService.updatePropertyType(type._id, { displayOrder: idx })
        )
      );
      fetchPropertyTypes();
      toast({
        title: 'Success',
        description: 'Property types reordered successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder property types',
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderPropertyTypeTable = (category: string) => {
    const types = getTypesByCategory(category);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage {getCategoryLabel(category)} property types
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property Type
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No property types found. Create your first property type to get started.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type, index) => (
                  <TableRow key={type._id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(type._id, 'up', category)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(type._id, 'down', category)}
                          disabled={index === types.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{type.value}</code>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={type.isActive}
                        onCheckedChange={() => handleToggleActive(type._id, type.isActive)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type._id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading property types...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Property Types</h3>
        <p className="text-sm text-muted-foreground">
          Manage property type categories and their display order dynamically
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setIsNewCategoryDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No categories found. Create your first category to get started.
        </div>
      ) : (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <TabsList className="inline-flex">
              {categories.map((category) => {
                const { total, active } = getCategoryCount(category);
                return (
                  <TabsTrigger key={category} value={category}>
                    <div className="flex items-center gap-2">
                      <span>{getCategoryLabel(category)}</span>
                      <Badge variant="secondary" className="ml-1">
                        {active}/{total}
                      </Badge>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              {renderPropertyTypeTable(category)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Property Type' : 'Add Property Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update the property type details below'
                : 'Create a new property type for your application'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Apartment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value (Unique ID)</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., apartment"
                disabled={!!editingType}
              />
              {editingType && (
                <p className="text-xs text-muted-foreground">
                  Value cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                disabled={!!editingType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingType && (
                <p className="text-xs text-muted-foreground">
                  Category cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Optional)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., home"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Create a new property type category. It will automatically be formatted as a unique identifier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Premium Properties"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewCategory();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                This will be converted to lowercase with underscores (e.g., "Premium Properties" → "premium_properties")
              </p>
            </div>

            {newCategoryName && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-medium text-muted-foreground">Category Value:</p>
                <code className="text-sm bg-background px-2 py-1 rounded inline-block mt-1">
                  {newCategoryName.toLowerCase().replace(/\s+/g, '_')}
                </code>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewCategoryDialogOpen(false);
                setNewCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNewCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyTypesTab;
