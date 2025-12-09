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
import type { FilterConfiguration, CreateFilterConfigurationDTO } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';

const FiltersTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = user?.rolePermissions || [];
  
  // Check if user has admin role
  const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin';
  
  // Permission checks - support both old role-based AND new permission-based
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canCreateFilterType = hasAdminRole || hasPermission(PERMISSIONS.FILTER_CREATE_NTP);
  const canCreateFilterOption = hasAdminRole || hasPermission(PERMISSIONS.FILTER_CREATE_FTO);
  const canEditFilter = hasAdminRole || hasPermission(PERMISSIONS.FILTER_EDIT);
  const canDeleteFilter = hasAdminRole || hasPermission(PERMISSIONS.FILTER_DELETE);
  const canToggleStatus = hasAdminRole || hasPermission(PERMISSIONS.FILTER_STATUS);
  const canChangeOrder = hasAdminRole || hasPermission(PERMISSIONS.FILTER_ORDER);
  
  const [filters, setFilters] = useState<FilterConfiguration[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewFilterTypeDialogOpen, setIsNewFilterTypeDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FilterConfiguration | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<string>('');
  const [newFilterTypeName, setNewFilterTypeName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateFilterConfigurationDTO>({
    filter_type: '',
    name: '',
    value: '',
    min_value: undefined,
    max_value: undefined,
    display_label: '',
    display_order: 0,
  });

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setIsLoading(true);
      const data = await configurationService.getAllFilterConfigurations(true);
      setFilters(data);

      // Extract unique filter types
      const types = Array.from(new Set(data.map(f => f.filterType))).sort();
      setFilterTypes(types);

      // Set active filter type to first one if not set
      if (!activeFilterType && types.length > 0) {
        setActiveFilterType(types[0]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch filters',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFiltersByType = (filterType: string) => {
    return filters.filter((f) => f.filterType === filterType);
  };

  const handleCreateNewFilterType = () => {
    if (!newFilterTypeName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a filter type name',
        variant: 'destructive',
      });
      return;
    }

    // Convert to lowercase with underscores
    const filterTypeValue = newFilterTypeName.toLowerCase().replace(/\s+/g, '_');

    // Check if already exists
    if (filterTypes.includes(filterTypeValue)) {
      toast({
        title: 'Error',
        description: 'This filter type already exists',
        variant: 'destructive',
      });
      return;
    }

    // Add to filter types and set as active
    setFilterTypes([...filterTypes, filterTypeValue].sort());
    setActiveFilterType(filterTypeValue);
    setNewFilterTypeName('');
    setIsNewFilterTypeDialogOpen(false);

    toast({
      title: 'Success',
      description: `Filter type "${newFilterTypeName}" created. You can now add filter options for it.`,
    });
  };

  const handleOpenDialog = (filter?: FilterConfiguration) => {
    if (filter) {
      setEditingFilter(filter);
      setFormData({
        filter_type: filter.filterType,
        name: filter.name,
        value: filter.value,
        min_value: filter.minValue,
        max_value: filter.maxValue,
        display_label: filter.displayLabel,
        display_order: filter.displayOrder,
      });
    } else {
      setEditingFilter(null);
      const currentFilters = getFiltersByType(activeFilterType);
      setFormData({
        filter_type: activeFilterType as any,
        name: '',
        value: '',
        min_value: undefined,
        max_value: undefined,
        display_label: '',
        display_order: currentFilters.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFilter(null);
    setFormData({
      filter_type: 'bedroom',
      name: '',
      value: '',
      min_value: undefined,
      max_value: undefined,
      display_label: '',
      display_order: 0,
    });
  };

  const handleSave = async () => {
    try {
      if (editingFilter) {
        await configurationService.updateFilterConfiguration(editingFilter._id, formData);
        toast({
          title: 'Success',
          description: 'Filter updated successfully',
        });
      } else {
        await configurationService.createFilterConfiguration(formData);
        toast({
          title: 'Success',
          description: 'Filter created successfully',
        });
      }
      fetchFilters();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingFilter ? 'Failed to update filter' : 'Failed to create filter',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await configurationService.updateFilterConfiguration(id, { isActive: !currentStatus });
      toast({
        title: 'Success',
        description: `Filter ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchFilters();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update filter status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this filter? This action cannot be undone.')) {
      return;
    }

    try {
      await configurationService.deleteFilterConfiguration(id);
      toast({
        title: 'Success',
        description: 'Filter deleted successfully',
      });
      fetchFilters();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete filter',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down', filterType: string) => {
    const typeFilters = getFiltersByType(filterType);
    const index = typeFilters.findIndex((f) => f._id === id);

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === typeFilters.length - 1)
    ) {
      return;
    }

    const newOrder = [...typeFilters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await Promise.all(
        newOrder.map((filter, idx) =>
          configurationService.updateFilterConfiguration(filter._id, { display_order: idx })
        )
      );
      fetchFilters();
      toast({
        title: 'Success',
        description: 'Filters reordered successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder filters',
        variant: 'destructive',
      });
    }
  };

  const renderFilterTable = (filterType: string) => {
    const typeFilters = getFiltersByType(filterType);
    const filteredTypeFilters = typeFilters.filter(filter =>
      filter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filter.displayLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filter.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get user-friendly label from filter type
    const getFilterTypeLabel = () => {
      return filterType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage {getFilterTypeLabel()} filter options
          </p>
          {canCreateFilterOption && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add {getFilterTypeLabel()} Option
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search filter options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Display Label</TableHead>
                <TableHead>Value</TableHead>
                {filterType === 'budget' && (
                  <>
                    <TableHead>Min Value</TableHead>
                    <TableHead>Max Value</TableHead>
                  </>
                )}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTypeFilters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={filterType === 'budget' ? 8 : 6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No filter options match your search.' : 'No filter options found. Create your first filter option to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTypeFilters.map((filter, index) => {
                  const originalIndex = typeFilters.findIndex(f => f._id === filter._id);
                  return (
                  <TableRow key={filter._id}>
                    <TableCell>
                      {canChangeOrder && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(filter._id, 'up', filterType)}
                            disabled={originalIndex === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(filter._id, 'down', filterType)}
                            disabled={originalIndex === typeFilters.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{filter.name}</TableCell>
                    <TableCell>{filter.displayLabel || '-'}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{filter.value}</code>
                    </TableCell>
                    {filterType === 'budget' && (
                      <>
                        <TableCell>{filter.minValue || '-'}</TableCell>
                        <TableCell>{filter.maxValue || '-'}</TableCell>
                      </>
                    )}
                    <TableCell>
                      <Switch
                        checked={filter.isActive}
                        onCheckedChange={() => handleToggleActive(filter._id, filter.isActive)}
                        disabled={!canToggleStatus}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEditFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(filter)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(filter._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
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
    return <div className="text-center py-8">Loading filters...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Filter Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Manage filter options for property search and filtering
          </p>
        </div>
        {canCreateFilterType && (
          <Button onClick={() => setIsNewFilterTypeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Filter Type
          </Button>
        )}
      </div>

      {filterTypes.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No filter types found. Create your first filter type to get started.</p>
          {canCreateFilterType && (
            <Button onClick={() => setIsNewFilterTypeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Filter Type
            </Button>
          )}
        </div>
      ) : (
        <Tabs value={activeFilterType} onValueChange={setActiveFilterType}>
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabsList className="inline-flex">
              {filterTypes.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {filterTypes.map((type) => (
            <TabsContent key={type} value={type}>
              {renderFilterTable(type)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFilter ? 'Edit Filter' : 'Add Filter'}
            </DialogTitle>
            <DialogDescription>
              {editingFilter
                ? 'Update the filter details below'
                : 'Create a new filter option'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter_type">Filter Type</Label>
              <Select
                value={formData.filter_type}
                onValueChange={(value: any) => setFormData({ ...formData, filter_type: value })}
                disabled={!!editingFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., For Sale"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value (Unique ID) *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., sale"
                disabled={!!editingFilter}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_label">Display Label (Optional)</Label>
              <Input
                id="display_label"
                value={formData.display_label}
                onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                placeholder="Defaults to Name if not provided"
              />
            </div>

            {formData.filter_type === 'budget' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min_value">Min Value (₹)</Label>
                  <Input
                    id="min_value"
                    type="number"
                    value={formData.min_value || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, min_value: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    placeholder="e.g., 2000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_value">Max Value (₹)</Label>
                  <Input
                    id="max_value"
                    type="number"
                    value={formData.max_value || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, max_value: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    placeholder="e.g., 4000000"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingFilter ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Filter Type Dialog */}
      <Dialog open={isNewFilterTypeDialogOpen} onOpenChange={setIsNewFilterTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Filter Type</DialogTitle>
            <DialogDescription>
              Create a new filter category to organize your property search filters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFilterTypeName">Filter Type Name *</Label>
              <Input
                id="newFilterTypeName"
                value={newFilterTypeName}
                onChange={(e) => setNewFilterTypeName(e.target.value)}
                placeholder="e.g., Property Status, Location Type, Price Range"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewFilterType();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                This will be converted to lowercase with underscores (e.g., "property_status")
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsNewFilterTypeDialogOpen(false);
              setNewFilterTypeName('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewFilterType}>
              Create Filter Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiltersTab;
