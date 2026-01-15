import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import { useToast } from '@/hooks/use-toast';

interface NavigationCategory {
  value: string;
  label: string;
  isActive: boolean;
  displayOrder: number;
}

const CategoryManagementTab: React.FC = () => {
  const [categories, setCategories] = useState<NavigationCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    isActive: true,
    displayOrder: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await configurationService.getNavigationCategories();
      setCategories(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch categories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      const category = categories[index];
      setFormData({
        value: category.value,
        label: category.label,
        isActive: category.isActive,
        displayOrder: category.displayOrder,
      });
    } else {
      setEditingIndex(null);
      setFormData({
        value: '',
        label: '',
        isActive: true,
        displayOrder: categories.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
    setFormData({
      value: '',
      label: '',
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.value.trim() || !formData.label.trim()) {
        toast({
          title: 'Error',
          description: 'Value and Label are required',
          variant: 'destructive',
        });
        return;
      }

      // Check for duplicate values
      const isDuplicate = categories.some((cat, idx) => 
        cat.value.toLowerCase() === formData.value.toLowerCase().trim() && idx !== editingIndex
      );

      if (isDuplicate) {
        toast({
          title: 'Error',
          description: 'A category with this value already exists',
          variant: 'destructive',
        });
        return;
      }

      let updatedCategories = [...categories];

      if (editingIndex !== null) {
        updatedCategories[editingIndex] = {
          ...formData,
          value: formData.value.trim(),
          label: formData.label.trim(),
        };
      } else {
        updatedCategories.push({
          ...formData,
          value: formData.value.trim(),
          label: formData.label.trim(),
        });
      }

      await configurationService.updateNavigationCategories(updatedCategories);
      
      toast({
        title: 'Success',
        description: editingIndex !== null ? 'Category updated successfully' : 'Category created successfully',
      });
      
      fetchCategories();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save category',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (index: number) => {
    try {
      const updatedCategories = [...categories];
      updatedCategories[index].isActive = !updatedCategories[index].isActive;
      
      await configurationService.updateNavigationCategories(updatedCategories);
      
      toast({
        title: 'Success',
        description: `Category ${updatedCategories[index].isActive ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('Are you sure you want to delete this category? This may affect existing navigation items.')) {
      return;
    }

    try {
      const updatedCategories = categories.filter((_, idx) => idx !== index);
      await configurationService.updateNavigationCategories(updatedCategories);
      
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
      
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    try {
      const updatedCategories = [...categories];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      [updatedCategories[index], updatedCategories[targetIndex]] = 
        [updatedCategories[targetIndex], updatedCategories[index]];
      
      // Update display orders
      updatedCategories.forEach((cat, idx) => {
        cat.displayOrder = idx;
      });

      await configurationService.updateNavigationCategories(updatedCategories);
      
      toast({
        title: 'Success',
        description: 'Categories reordered successfully',
      });
      
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder categories',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Navigation Categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage property categories used in navigation items (e.g., Residential, Commercial)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Important:</p>
          <p>
            Deleting or modifying categories may affect existing navigation items. 
            Ensure navigation items are updated accordingly.
          </p>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Order</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No categories found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category, index) => (
                <TableRow key={category.value}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === categories.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{category.value}</code>
                  </TableCell>
                  <TableCell className="font-medium">{category.label}</TableCell>
                  <TableCell>
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => handleToggleActive(index)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(index)}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              Configure category for organizing navigation items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value * (lowercase, no spaces)</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., residential"
                required
              />
              <p className="text-xs text-muted-foreground">
                Used internally, must be unique
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Residential"
                required
              />
              <p className="text-xs text-muted-foreground">
                Display name shown to users
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagementTab;
