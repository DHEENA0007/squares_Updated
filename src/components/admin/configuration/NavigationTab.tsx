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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import type { NavigationItem } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

const NavigationTab: React.FC = () => {
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('main');
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    displayLabel: '',
    category: 'main',
    parentId: '',
    queryParams: '',
    displayOrder: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchNavigationItems();
  }, []);

  const fetchNavigationItems = async () => {
    try {
      setIsLoading(true);
      const data = await configurationService.getAllNavigationItems(true);
      setNavItems(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch navigation items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (item?: NavigationItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        value: item.value,
        displayLabel: item.displayLabel || '',
        category: item.category as any,
        parentId: item.parentId || '',
        queryParams: item.queryParams ? JSON.stringify(item.queryParams) : '',
        displayOrder: item.displayOrder,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        value: '',
        displayLabel: '',
        category: activeCategory as any,
        parentId: '',
        queryParams: '',
        displayOrder: getItemsByCategory(activeCategory).length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      value: '',
      displayLabel: '',
      category: 'main',
      parentId: '',
      queryParams: '',
      displayOrder: 0,
    });
  };

  const handleSave = async () => {
    try {
      // Parse queryParams from JSON string
      let parsedQueryParams: Record<string, string> | undefined;
      if (formData.queryParams && formData.queryParams.trim()) {
        try {
          parsedQueryParams = JSON.parse(formData.queryParams);
        } catch (e) {
          toast({
            title: 'Error',
            description: 'Invalid JSON format for query parameters',
            variant: 'destructive',
          });
          return;
        }
      }

      const submitData = {
        name: formData.name,
        value: formData.value,
        displayLabel: formData.displayLabel || undefined,
        category: formData.category,
        parentId: formData.parentId || undefined,
        queryParams: parsedQueryParams,
        displayOrder: formData.displayOrder,
      };

      if (editingItem) {
        await configurationService.updateNavigationItem(editingItem._id, submitData);
        toast({
          title: 'Success',
          description: 'Navigation item updated successfully',
        });
      } else {
        await configurationService.createNavigationItem(submitData);
        toast({
          title: 'Success',
          description: 'Navigation item created successfully',
        });
      }
      fetchNavigationItems();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingItem ? 'Failed to update navigation item' : 'Failed to create navigation item',
        variant: 'destructive',
      });
    }
  };

  const getItemsByCategory = (category: string) => {
    return navItems.filter((item) => item.category === category);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await configurationService.updateNavigationItem(id, { isActive: !currentStatus });
      toast({
        title: 'Success',
        description: `Navigation item ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchNavigationItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update navigation item status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this navigation item? This action cannot be undone.')) {
      return;
    }

    try {
      await configurationService.deleteNavigationItem(id);
      toast({
        title: 'Success',
        description: 'Navigation item deleted successfully',
      });
      fetchNavigationItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete navigation item',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down', category: string) => {
    const typeItems = getItemsByCategory(category);
    const index = typeItems.findIndex((item) => item._id === id);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === typeItems.length - 1)
    ) {
      return;
    }

    const newOrder = [...typeItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await Promise.all(
        newOrder.map((item, idx) =>
          configurationService.updateNavigationItem(item._id, { displayOrder: idx })
        )
      );
      fetchNavigationItems();
      toast({
        title: 'Success',
        description: 'Navigation items reordered successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder navigation items',
        variant: 'destructive',
      });
    }
  };

  const renderNavigationTable = (category: string) => {
    const items = getItemsByCategory(category);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage {category} navigation items
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Navigation Item
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Display Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Query Params</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No navigation items found. Create your first item to get started.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(item._id, 'up', category)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(item._id, 'down', category)}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.displayLabel || item.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{item.value}</code>
                    </TableCell>
                    <TableCell>
                      {item.queryParams && Object.keys(item.queryParams).length > 0 ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(item.queryParams)}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item._id, item.isActive)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item._id)}
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
    return <div className="text-center py-8">Loading navigation...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Navigation Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage navigation structure, categories, and property types dynamically
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="main">Main Nav</TabsTrigger>
          <TabsTrigger value="residential">Residential</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
          <TabsTrigger value="agricultural">Agricultural</TabsTrigger>
        </TabsList>

        <TabsContent value="main">{renderNavigationTable('main')}</TabsContent>
        <TabsContent value="residential">{renderNavigationTable('residential')}</TabsContent>
        <TabsContent value="commercial">{renderNavigationTable('commercial')}</TabsContent>
        <TabsContent value="agricultural">{renderNavigationTable('agricultural')}</TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Navigation Item' : 'Add Navigation Item'}
            </DialogTitle>
            <DialogDescription>
              Configure navigation item with display name, value, and query parameters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Flat / Apartment"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., apartment"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">Display Label (Optional)</Label>
              <Input
                id="displayLabel"
                value={formData.displayLabel}
                onChange={(e) => setFormData({ ...formData, displayLabel: e.target.value })}
                placeholder="Defaults to Name if not provided"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Navigation</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="space-y-2">
              <Label htmlFor="queryParams">Query Parameters (JSON)</Label>
              <Input
                id="queryParams"
                value={formData.queryParams}
                onChange={(e) => setFormData({ ...formData, queryParams: e.target.value })}
                placeholder='{"listingType": "sale", "propertyType": "apartment"}'
              />
              <p className="text-xs text-muted-foreground">
                Optional: JSON object for URL query parameters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NavigationTab;
