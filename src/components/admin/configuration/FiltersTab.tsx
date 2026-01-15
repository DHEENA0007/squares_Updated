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
import { locaService, type PincodeSuggestion } from '@/services/locaService';
import type { FilterConfiguration, CreateFilterConfigurationDTO, FilterDependency } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';
import { Loader2 } from 'lucide-react';

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
  const [allPropertyFields, setAllPropertyFields] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [selectedFieldData, setSelectedFieldData] = useState<any>(null); // To track if a field was selected from suggestions
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

  const [dependencies, setDependencies] = useState<FilterDependency[]>([]);
  const [isDependencyDialogOpen, setIsDependencyDialogOpen] = useState(false);
  const [newDependency, setNewDependency] = useState<FilterDependency>({
    targetFilterType: '',
    sourceFilterType: '',
    sourceFilterValues: [],
  });
  const [availableSourceValues, setAvailableSourceValues] = useState<any[]>([]);

  // Location Search State
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<PincodeSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocaReady, setIsLocaReady] = useState(locaService.isReady());

  useEffect(() => {
    fetchFilters();
    fetchDependencies();
    fetchAllPropertyFields(); // Fetch property fields on mount
    // Initialize location service
    locaService.initialize().then(() => {
      setIsLocaReady(true);
    }).catch(console.error);
  }, []);

  const fetchDependencies = async () => {
    try {
      const deps = await configurationService.getFilterDependencies();
      setDependencies(deps);
    } catch (error) {
      console.error('Failed to fetch dependencies', error);
    }
  };

  // ... existing fetchFilters ...

  const handleSaveDependency = async () => {
    if (!newDependency.targetFilterType || !newDependency.sourceFilterType || newDependency.sourceFilterValues.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    const updatedDependencies = [...dependencies, newDependency];
    try {
      await configurationService.saveFilterDependencies(updatedDependencies);
      setDependencies(updatedDependencies);
      setIsDependencyDialogOpen(false);
      setNewDependency({
        targetFilterType: '',
        sourceFilterType: '',
        sourceFilterValues: [],
      });
      toast({
        title: 'Success',
        description: 'Dependency saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save dependency',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDependency = async (index: number) => {
    const updatedDependencies = dependencies.filter((_, i) => i !== index);
    try {
      await configurationService.saveFilterDependencies(updatedDependencies);
      setDependencies(updatedDependencies);
      toast({
        title: 'Success',
        description: 'Dependency deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete dependency',
        variant: 'destructive',
      });
    }
  };

  // Helper to get source values when source filter type changes
  useEffect(() => {
    const fetchSourceValues = async () => {
      if (!newDependency.sourceFilterType) {
        setAvailableSourceValues([]);
        return;
      }

      if (newDependency.sourceFilterType === 'property_type') {
        const types = await configurationService.getAllPropertyTypes(false);
        setAvailableSourceValues(types.map(t => ({ label: t.name, value: t.value })));
      } else {
        const options = getFiltersByType(newDependency.sourceFilterType);
        setAvailableSourceValues(options.map(o => ({ label: o.displayLabel || o.name, value: o.value })));
      }
    };
    fetchSourceValues();
  }, [newDependency.sourceFilterType, filters]);

  const fetchFilters = async () => {
    try {
      setIsLoading(true);
      const data = await configurationService.getAllFilterConfigurations(true); // Include inactive
      setFilters(data);

      // Extract unique filter types
      const types = Array.from(new Set(data.map(f => f.filterType)));
      setFilterTypes(types.sort());

      if (types.length > 0 && !activeFilterType) {
        setActiveFilterType(types[0]);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch filter configurations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFiltersByType = (type: string) => {
    return filters.filter(f => f.filterType === type).sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const handleCreateNewFilterType = async () => {
    if (!newFilterTypeName.trim()) return;

    const formattedType = newFilterTypeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (filterTypes.includes(formattedType)) {
      toast({
        title: 'Error',
        description: 'Filter type already exists',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Check if a field with options was selected
      if (selectedFieldData && selectedFieldData.fieldOptions && selectedFieldData.fieldOptions.length > 0) {
        // Auto-create filter options from the field's options
        await Promise.all(selectedFieldData.fieldOptions.map((option: string, index: number) => {
          return configurationService.createFilterConfiguration({
            filter_type: formattedType,
            name: option,
            value: option.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_+]/g, ''),
            display_label: option,
            display_order: index + 1,
          });
        }));

        toast({
          title: 'Success',
          description: `Filter type "${formattedType}" created with ${selectedFieldData.fieldOptions.length} options auto-populated from field configuration.`,
        });

        // Refresh filters to show the new options
        fetchFilters();
      } else {
        // Custom filter or field without options - user will add options manually
        toast({
          title: 'Success',
          description: `Filter type "${formattedType}" created. You can now add options to it.`,
        });
      }

      setFilterTypes([...filterTypes, formattedType].sort());
      setActiveFilterType(formattedType);
      setIsNewFilterTypeDialogOpen(false);
      setNewFilterTypeName('');
      setSelectedFieldData(null);

    } catch (error) {
      console.error('Error creating filter type:', error);
      toast({
        title: 'Error',
        description: 'Failed to create filter type',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all property fields for the dropdown
  const fetchAllPropertyFields = async () => {
    try {
      setIsLoadingFields(true);
      const propertyTypes = await configurationService.getAllPropertyTypes(false);
      const allFields: any[] = [];
      const seenFieldNames = new Set<string>();

      for (const pt of propertyTypes) {
        const fields = await configurationService.getPropertyTypeFields(pt._id, false);
        for (const field of fields) {
          // Avoid duplicates by field name
          if (!seenFieldNames.has(field.fieldName)) {
            seenFieldNames.add(field.fieldName);
            allFields.push({
              fieldName: field.fieldName,
              fieldLabel: field.fieldLabel,
              fieldType: field.fieldType,
              fieldOptions: field.fieldOptions || [], // Include field options
              propertyTypeName: pt.name,
            });
          }
        }
      }

      console.log('Fetched property fields:', allFields); // Debug log
      setAllPropertyFields(allFields);
    } catch (error) {
      console.error('Error fetching property fields:', error);
    } finally {
      setIsLoadingFields(false);
    }
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
      // Initialize location query if it's a location filter
      if (filter.filterType === 'location') {
        setLocationQuery(filter.name);
      }
    } else {
      setEditingFilter(null);
      setFormData({
        filter_type: activeFilterType,
        name: '',
        value: '',
        min_value: undefined,
        max_value: undefined,
        display_label: '',
        display_order: 0,
      });
      setLocationQuery('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFilter(null);
    setFormData({
      filter_type: '',
      name: '',
      value: '',
      min_value: undefined,
      max_value: undefined,
      display_label: '',
      display_order: 0,
    });
    setLocationQuery('');
    setLocationSuggestions([]);
  };

  const handleSave = async () => {
    try {
      if (!formData.filter_type || !formData.name || !formData.value) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      if (editingFilter) {
        await configurationService.updateFilterConfiguration(editingFilter.id!, formData);
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
      console.error('Error saving filter:', error);
      toast({
        title: 'Error',
        description: 'Failed to save filter configuration',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this filter option?')) return;

    try {
      await configurationService.deleteFilterConfiguration(id);
      toast({
        title: 'Success',
        description: 'Filter deleted successfully',
      });
      fetchFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete filter',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (filter: FilterConfiguration) => {
    try {
      await configurationService.updateFilterConfiguration(filter.id!, {
        isActive: !filter.isActive
      });
      toast({
        title: 'Success',
        description: `Filter ${filter.isActive ? 'deactivated' : 'activated'} successfully`,
      });
      fetchFilters();
    } catch (error) {
      console.error('Error updating filter status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update filter status',
        variant: 'destructive',
      });
    }
  };

  const renderFilterTable = (type: string) => {
    const typeFilters = getFiltersByType(type);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              {typeFilters.length} options configured
            </h4>
          </div>
          {canCreateFilterOption && (
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          )}
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Display Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeFilters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No options found for this filter type.
                  </TableCell>
                </TableRow>
              ) : (
                typeFilters.map((filter) => (
                  <TableRow key={filter.id}>
                    <TableCell>{filter.displayOrder}</TableCell>
                    <TableCell className="font-medium">{filter.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{filter.value}</Badge>
                    </TableCell>
                    <TableCell>{filter.displayLabel || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={filter.isActive}
                        onCheckedChange={() => canToggleStatus && handleToggleStatus(filter)}
                        disabled={!canToggleStatus}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEditFilter && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(filter)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteFilter && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(filter.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Filter Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Manage filter options for property search and filtering
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDependencyDialogOpen(true)}>
            Manage Dependencies
          </Button>
          {canCreateFilterType && (
            <Button onClick={() => setIsNewFilterTypeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Filter Type
            </Button>
          )}
        </div>
      </div>

      {/* ... existing Tabs ... */}
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

      {/* Dependency Dialog */}
      <Dialog open={isDependencyDialogOpen} onOpenChange={setIsDependencyDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Filter Dependencies</DialogTitle>
            <DialogDescription>
              Configure which filters should appear based on other filter selections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4 items-end border p-4 rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label>Target Filter (Show this...)</Label>
                <Select
                  value={newDependency.targetFilterType}
                  onValueChange={(val) => setNewDependency({ ...newDependency, targetFilterType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterTypes.map(t => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Source Filter (...when this is selected)</Label>
                <Select
                  value={newDependency.sourceFilterType}
                  onValueChange={(val) => setNewDependency({ ...newDependency, sourceFilterType: val, sourceFilterValues: [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="property_type">Property Type</SelectItem>
                    {filterTypes.filter(t => t !== newDependency.targetFilterType).map(t => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trigger Values (Matches any)</Label>
                <Select
                  disabled={!newDependency.sourceFilterType}
                  onValueChange={(val) => {
                    if (!newDependency.sourceFilterValues.includes(val)) {
                      setNewDependency({
                        ...newDependency,
                        sourceFilterValues: [...newDependency.sourceFilterValues, val]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add value..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSourceValues.map((opt: any) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {newDependency.sourceFilterValues.map(val => (
                    <Badge key={val} variant="secondary" className="cursor-pointer" onClick={() => {
                      setNewDependency({
                        ...newDependency,
                        sourceFilterValues: newDependency.sourceFilterValues.filter(v => v !== val)
                      });
                    }}>
                      {availableSourceValues.find((o: any) => o.value === val)?.label || val} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleSaveDependency} className="w-full">Add Rule</Button>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target Filter</TableHead>
                    <TableHead>Depends On</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No dependencies configured</TableCell>
                    </TableRow>
                  ) : (
                    dependencies.map((dep, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dep.targetFilterType}</TableCell>
                        <TableCell>{dep.sourceFilterType}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {dep.sourceFilterValues.map(v => (
                              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteDependency(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ... existing Dialogs ... */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... existing content ... */}
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
                onValueChange={(value: any) => {
                  setFormData({ ...formData, filter_type: value });
                  if (value !== 'location') {
                    setLocationQuery('');
                    setLocationSuggestions([]);
                  }
                }}
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

            {formData.filter_type === 'location' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location_search">Search Location</Label>
                  <div className="relative">
                    <Input
                      id="location_search"
                      value={locationQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setLocationQuery(query);
                        if (query.length > 2) {
                          setIsSearchingLocation(true);
                          // Small timeout to allow UI to update before heavy search
                          setTimeout(() => {
                            const results = locaService.searchLocations(query);
                            setLocationSuggestions(results);
                            setIsSearchingLocation(false);
                          }, 100);
                        } else {
                          setLocationSuggestions([]);
                        }
                      }}
                      placeholder={locaService.isReady() ? "Search city, district, or pincode..." : "Initializing location database..."}
                      className="pr-10"
                      disabled={!locaService.isReady()}
                    />
                    {(!locaService.isReady() || isSearchingLocation) && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {locationQuery.length > 2 && locationSuggestions.length === 0 && !isSearchingLocation && locaService.isReady() && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-4 text-sm text-center text-muted-foreground">
                        No locations found matching "{locationQuery}"
                      </div>
                    )}

                    {locationSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={`${suggestion.pincode}-${index}`}
                            className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b last:border-0"
                            onClick={() => {
                              const locationName = suggestion.city;
                              const locationValue = suggestion.city.toLowerCase().replace(/\s+/g, '-');

                              setFormData({
                                ...formData,
                                name: locationName,
                                value: locationValue,
                                display_label: locationName
                              });
                              setLocationQuery(locationName);
                              setLocationSuggestions([]);
                            }}
                          >
                            <div className="font-medium text-foreground">{suggestion.city}</div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.district}, {suggestion.state} - {suggestion.pincode}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {!locaService.isReady() && (
                    <p className="text-xs text-muted-foreground">
                      Please wait while we load the location database (approx. 20MB)...
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Selected Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Selected Value</Label>
                    <Input
                      id="value"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="display_label">Display Label (Optional)</Label>
              <Input
                id="display_label"
                value={formData.display_label}
                onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                placeholder="Defaults to Name if not provided"
              />
            </div>

            {['budget', 'area'].includes(formData.filter_type) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="min_value">Min Value {formData.filter_type === 'budget' ? '(₹)' : '(sq ft)'}</Label>
                  <Input
                    id="min_value"
                    type="number"
                    value={formData.min_value || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, min_value: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    placeholder={formData.filter_type === 'budget' ? "e.g., 2000000" : "e.g., 1000"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_value">Max Value {formData.filter_type === 'budget' ? '(₹)' : '(sq ft)'}</Label>
                  <Input
                    id="max_value"
                    type="number"
                    value={formData.max_value || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, max_value: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    placeholder={formData.filter_type === 'budget' ? "e.g., 4000000" : "e.g., 2000"}
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
      <Dialog open={isNewFilterTypeDialogOpen} onOpenChange={(open) => {
        setIsNewFilterTypeDialogOpen(open);
        if (open && allPropertyFields.length === 0) {
          fetchAllPropertyFields();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Filter Type</DialogTitle>
            <DialogDescription>
              Create a new filter category. You can type a custom name or select from existing property fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2 relative">
              <Label htmlFor="newFilterTypeName">Filter Type Name *</Label>
              <Input
                id="newFilterTypeName"
                value={newFilterTypeName}
                onChange={(e) => {
                  setNewFilterTypeName(e.target.value);
                  setSelectedFieldData(null); // Clear selection when user types manually
                }}
                placeholder="Type to search or enter custom name..."
                autoComplete="off"
              />

              {/* Auto-suggest dropdown */}
              {newFilterTypeName.length >= 1 && (
                (() => {
                  if (isLoadingFields) {
                    return (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground">
                        Loading fields...
                      </div>
                    );
                  }

                  if (allPropertyFields.length === 0) {
                    return null;
                  }

                  const filtered = allPropertyFields.filter(field =>
                    field.fieldLabel.toLowerCase().includes(newFilterTypeName.toLowerCase()) ||
                    field.fieldName.toLowerCase().includes(newFilterTypeName.toLowerCase())
                  );

                  if (filtered.length === 0) return null;

                  // Don't show if exact match already selected
                  if (filtered.length === 1 && filtered[0].fieldLabel === newFilterTypeName) return null;

                  return (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filtered.map((field) => (
                        <div
                          key={field.fieldName}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-b last:border-0"
                          onClick={() => {
                            setNewFilterTypeName(field.fieldLabel);
                            setSelectedFieldData(field); // Store the selected field data
                          }}
                        >
                          <div className="font-medium">
                            {field.fieldLabel}
                            <span className="text-muted-foreground font-normal ml-1">
                              ({field.propertyTypeName})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Type: {field.fieldType}
                            {field.fieldOptions && field.fieldOptions.length > 0 && (
                              <span className="ml-2 text-green-600">
                                • {field.fieldOptions.length} options will be auto-created
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}

              <p className="text-xs text-muted-foreground">
                Type to search existing fields or enter a custom filter name.
                {selectedFieldData && selectedFieldData.fieldOptions?.length > 0 && (
                  <span className="block mt-1 text-green-600 font-medium">
                    ✓ Selected field has {selectedFieldData.fieldOptions.length} options that will be auto-populated
                  </span>
                )}
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
