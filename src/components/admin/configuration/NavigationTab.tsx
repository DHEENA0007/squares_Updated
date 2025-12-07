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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import type { NavigationItem } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

const NavigationTab: React.FC = () => {
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [listingTypes, setListingTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    displayLabel: '',
    category: 'residential',
    parentId: '',
    queryParams: '',
    displayOrder: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchNavigationItems();
    fetchListingTypes();
  }, []);

  const fetchListingTypes = async () => {
    try {
      const types = await configurationService.getFilterConfigurationsByType('listing_type', false);
      setListingTypes(types);
    } catch (error) {
      console.error('Failed to load listing types:', error);
    }
  };

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
        category: 'residential',
        parentId: activeTab === 'all' ? '' : activeTab,
        queryParams: '',
        displayOrder: navItems.length,
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
      category: 'residential',
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
        category: formData.category as 'main' | 'commercial' | 'residential' | 'agricultural',
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

  const getItemsByListingType = (listingTypeValue: string) => {
    return navItems.filter((item) => item.parentId === listingTypeValue);
  };

  const getAllUnassignedItems = () => {
    return navItems.filter((item) => !item.parentId);
  };

  const renderNavigationTable = (listingTypeValue: string | null) => {
    const items = listingTypeValue === null ? getAllUnassignedItems() : getItemsByListingType(listingTypeValue);
    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.displayLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const listingType = listingTypeValue ? listingTypes.find(lt => lt.value === listingTypeValue) : null;
    const title = listingType ? (listingType.displayLabel || listingType.name) : 'Unassigned';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {listingType
              ? `Property types shown under "${title}" in the navbar dropdown`
              : 'Property types not yet assigned to any listing type'}
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property Type
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search navigation items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Display Label</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Listing Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? 'No navigation items match your search.'
                      : (listingType
                          ? `No property types assigned to "${title}" yet. Create one to get started.`
                          : 'No unassigned property types. All items are assigned to listing types.')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => {
                  const originalIndex = items.findIndex(i => i._id === item._id);
                  return (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(item._id, 'up', listingTypeValue)}
                          disabled={originalIndex === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(item._id, 'down', listingTypeValue)}
                          disabled={originalIndex === items.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.displayLabel || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{item.value}</code>
                    </TableCell>
                    <TableCell>
                      {item.parentId ? (
                        <Badge variant="secondary">
                          {listingTypes.find(lt => lt.value === item.parentId)?.displayLabel || item.parentId}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
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
                );
                })
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
        <h3 className="text-lg font-semibold">Navigation Property Types</h3>
        <p className="text-sm text-muted-foreground">
          Create property types and assign them to listing types. They will appear as dropdown options in the navbar.
        </p>
      </div>

      {listingTypes.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No listing types found. Please create listing types in <strong>Filter Management</strong> first (e.g., For Sale, For Rent).
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            <TabsTrigger value="all" className="flex-shrink-0">
              All / Unassigned
            </TabsTrigger>
            {listingTypes.map(type => (
              <TabsTrigger key={type._id} value={type.value} className="flex-shrink-0">
                {type.displayLabel || type.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">{renderNavigationTable(null)}</TabsContent>
          {listingTypes.map(type => (
            <TabsContent key={type._id} value={type.value}>
              {renderNavigationTable(type.value)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Property Type' : 'Add Property Type'}
            </DialogTitle>
            <DialogDescription>
              Configure property type with name, value, and assign it to a listing type
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
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Listing Type (Parent)</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select listing type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (top level)</SelectItem>
                    {listingTypes.map(type => (
                      <SelectItem key={type._id} value={type.value}>
                        {type.displayLabel || type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which listing type (For Sale, For Rent) this property appears under
                </p>
              </div>
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
