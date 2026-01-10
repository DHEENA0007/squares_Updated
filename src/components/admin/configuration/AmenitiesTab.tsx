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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

import { configurationService } from '@/services/configurationService';
import type { Amenity, CreateAmenityDTO, PropertyType } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/config/permissionConfig';

const AmenitiesTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = user?.rolePermissions || [];

  // Check if user has admin role
  const hasAdminRole = user?.role === 'admin' || user?.role === 'superadmin';

  // Permission checks - support both old role-based AND new permission-based
  const hasPermission = (permission: string) => permissions.includes(permission);
  const canCreateAmenity = hasAdminRole || hasPermission(PERMISSIONS.PM_A_CREATE);
  const canEditAmenity = hasAdminRole || hasPermission(PERMISSIONS.PM_A_EDIT);
  const canDeleteAmenity = hasAdminRole || hasPermission(PERMISSIONS.PM_A_DELETE);
  const canToggleStatus = hasAdminRole || hasPermission(PERMISSIONS.PM_A_STATUS);
  const canChangeOrder = hasAdminRole || hasPermission(PERMISSIONS.PM_A_ORDER);

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [amenityPropertyTypesMap, setAmenityPropertyTypesMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [formData, setFormData] = useState<CreateAmenityDTO>({
    name: '',
    category: 'basic',
    icon: '',
    displayOrder: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [amenitiesData, propertyTypesData] = await Promise.all([
        configurationService.getAllAmenities(true),
        configurationService.getAllPropertyTypes(true),
      ]);
      setAmenities(amenitiesData);
      setPropertyTypes(propertyTypesData);

      // Fetch all mappings in one go
      const allMappings = await configurationService.getAllPropertyTypeAmenities();

      const amenityPTMap: Record<string, string[]> = {};

      // Initialize map
      amenitiesData.forEach(a => {
        amenityPTMap[a._id] = [];
      });

      // Populate map from mappings
      allMappings.forEach(mapping => {
        // Handle populated fields
        const amenityId = mapping.amenityId?._id || mapping.amenityId;
        const propertyTypeId = mapping.propertyTypeId?._id || mapping.propertyTypeId;

        if (amenityId && propertyTypeId) {
          if (!amenityPTMap[amenityId]) {
            amenityPTMap[amenityId] = [];
          }
          if (!amenityPTMap[amenityId].includes(propertyTypeId)) {
            amenityPTMap[amenityId].push(propertyTypeId);
          }
        }
      });

      setAmenityPropertyTypesMap(amenityPTMap);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = async (amenity?: Amenity) => {
    if (amenity) {
      setEditingAmenity(amenity);
      setFormData({
        name: amenity.name,
        category: amenity.category || 'basic',
        icon: amenity.icon || '',
        displayOrder: amenity.displayOrder,
      });

      // Use cached property type mappings
      setSelectedPropertyTypes(amenityPropertyTypesMap[amenity._id] || []);
    } else {
      setEditingAmenity(null);
      setFormData({
        name: '',
        category: 'basic',
        icon: '',
        displayOrder: amenities.length,
      });
      setSelectedPropertyTypes([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAmenity(null);
    setFormData({
      name: '',
      category: 'basic',
      icon: '',
      displayOrder: 0,
    });
    setSelectedPropertyTypes([]);
  };

  const handleSave = async () => {
    try {
      let amenityId: string;

      if (editingAmenity) {
        await configurationService.updateAmenity(editingAmenity._id, formData);
        amenityId = editingAmenity._id;
      } else {
        const newAmenity = await configurationService.createAmenity(formData);
        amenityId = newAmenity._id;
      }

      // Update property type amenity mappings efficiently
      // Get currently linked property types from our local cache
      const currentLinkedPTs = editingAmenity ? (amenityPropertyTypesMap[editingAmenity._id] || []) : [];

      // Determine which PTs need updates
      const ptsToAdd = selectedPropertyTypes.filter(id => !currentLinkedPTs.includes(id));
      const ptsToRemove = currentLinkedPTs.filter(id => !selectedPropertyTypes.includes(id));

      const ptsToUpdate = [...ptsToAdd, ...ptsToRemove];

      // Only update the ones that changed
      await Promise.all(ptsToUpdate.map(async (ptId) => {
        const currentAmenities = await configurationService.getPropertyTypeAmenities(ptId);
        let updatedAmenityIds = currentAmenities.map(a => a._id);

        if (ptsToAdd.includes(ptId)) {
          // Add if not already present
          if (!updatedAmenityIds.includes(amenityId)) {
            updatedAmenityIds.push(amenityId);
          }
        } else {
          // Remove
          updatedAmenityIds = updatedAmenityIds.filter(id => id !== amenityId);
        }

        await configurationService.updatePropertyTypeAmenities(ptId, updatedAmenityIds);
      }));

      toast({
        title: 'Success',
        description: editingAmenity ? 'Amenity updated successfully' : 'Amenity created successfully',
      });
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingAmenity ? 'Failed to update amenity' : 'Failed to create amenity',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await configurationService.updateAmenity(id, { isActive: !currentStatus });
      toast({
        title: 'Success',
        description: `Amenity ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update amenity status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this amenity? This action cannot be undone.')) {
      return;
    }

    try {
      await configurationService.deleteAmenity(id);
      toast({
        title: 'Success',
        description: 'Amenity deleted successfully',
      });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete amenity',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = amenities.findIndex((a) => a._id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === amenities.length - 1)
    ) {
      return;
    }

    const newOrder = [...amenities];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await Promise.all(
        newOrder.map((amenity, idx) =>
          configurationService.updateAmenity(amenity._id, { displayOrder: idx })
        )
      );
      setAmenities(newOrder);
      toast({
        title: 'Success',
        description: 'Amenities reordered successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder amenities',
        variant: 'destructive',
      });
    }
  };

  const filteredAmenities = amenities.filter(amenity =>
    amenity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading amenities...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Amenities</h3>
          <p className="text-sm text-muted-foreground">
            Manage amenities available for property listings
          </p>
        </div>
        {canCreateAmenity && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Amenity
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Input
              placeholder="Search amenities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Property Types</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAmenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No amenities found. Create your first amenity to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredAmenities.map((amenity, index) => {
                const linkedPropertyTypeIds = amenityPropertyTypesMap[amenity._id] || [];
                const linkedPropertyTypeNames = linkedPropertyTypeIds
                  .map(ptId => propertyTypes.find(pt => pt._id === ptId)?.name)
                  .filter(Boolean);

                return (
                  <TableRow key={amenity._id}>
                    <TableCell>
                      {canChangeOrder && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(amenity._id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(amenity._id, 'down')}
                            disabled={index === amenities.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{amenity.name}</TableCell>
                    <TableCell>
                      {amenity.category ? (
                        <Badge variant="outline">{amenity.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {linkedPropertyTypeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {linkedPropertyTypeNames.map((name, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No property types</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={amenity.isActive}
                        onCheckedChange={() => handleToggleActive(amenity._id, amenity.isActive)}
                        disabled={!canToggleStatus}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEditAmenity && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(amenity)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteAmenity && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(amenity._id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAmenity ? 'Edit Amenity' : 'Add Amenity'}
            </DialogTitle>
            <DialogDescription>
              {editingAmenity
                ? 'Update the amenity details below'
                : 'Create a new amenity for property listings'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Swimming Pool"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="recreational">Recreational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Optional)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., waves"
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

            <div className="space-y-2">
              <Label>Property Types</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which property types can have this amenity
              </p>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {propertyTypes.map((propertyType) => (
                  <div key={propertyType._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pt-${propertyType._id}`}
                      checked={selectedPropertyTypes.includes(propertyType._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPropertyTypes([...selectedPropertyTypes, propertyType._id]);
                        } else {
                          setSelectedPropertyTypes(
                            selectedPropertyTypes.filter((id) => id !== propertyType._id)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`pt-${propertyType._id}`} className="font-normal cursor-pointer">
                      {propertyType.name} <Badge variant="outline" className="ml-2">{propertyType.category}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAmenity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AmenitiesTab;
