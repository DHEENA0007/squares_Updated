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

const AmenitiesTab: React.FC = () => {
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
    display_order: 0,
  });
  const { toast } = useToast();

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

      // Fetch property types for each amenity
      const amenityPTMap: Record<string, string[]> = {};
      for (const amenity of amenitiesData) {
        const linkedPTs: string[] = [];
        for (const pt of propertyTypesData) {
          const ptAmenities = await configurationService.getPropertyTypeAmenities(pt.id);
          if (ptAmenities.some(a => a.id === amenity.id)) {
            linkedPTs.push(pt.id);
          }
        }
        amenityPTMap[amenity.id] = linkedPTs;
      }
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
        display_order: amenity.display_order,
      });

      // Fetch which property types have this amenity
      try {
        const linkedPropertyTypes: string[] = [];
        for (const pt of propertyTypes) {
          const ptAmenities = await configurationService.getPropertyTypeAmenities(pt.id);
          if (ptAmenities.some(a => a.id === amenity.id)) {
            linkedPropertyTypes.push(pt.id);
          }
        }
        setSelectedPropertyTypes(linkedPropertyTypes);
      } catch (error) {
        console.error('Failed to fetch property type amenities:', error);
        setSelectedPropertyTypes([]);
      }
    } else {
      setEditingAmenity(null);
      setFormData({
        name: '',
        category: 'basic',
        icon: '',
        display_order: amenities.length,
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
      display_order: 0,
    });
    setSelectedPropertyTypes([]);
  };

  const handleSave = async () => {
    try {
      let amenityId: string;

      if (editingAmenity) {
        await configurationService.updateAmenity(editingAmenity.id, formData);
        amenityId = editingAmenity.id;
      } else {
        const newAmenity = await configurationService.createAmenity(formData);
        amenityId = newAmenity.id;
      }

      // Update property type amenity mappings
      for (const propertyType of propertyTypes) {
        const isSelected = selectedPropertyTypes.includes(propertyType.id);
        const currentAmenities = await configurationService.getPropertyTypeAmenities(propertyType.id);
        const hasAmenity = currentAmenities.some(a => a.id === amenityId);

        if (isSelected && !hasAmenity) {
          // Add amenity to property type
          const updatedAmenityIds = [...currentAmenities.map(a => a.id), amenityId];
          await configurationService.updatePropertyTypeAmenities(propertyType.id, updatedAmenityIds);
        } else if (!isSelected && hasAmenity) {
          // Remove amenity from property type
          const updatedAmenityIds = currentAmenities.filter(a => a.id !== amenityId).map(a => a.id);
          await configurationService.updatePropertyTypeAmenities(propertyType.id, updatedAmenityIds);
        }
      }

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
      await configurationService.updateAmenity(id, { is_active: !currentStatus });
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
    const index = amenities.findIndex((a) => a.id === id);
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
          configurationService.updateAmenity(amenity.id, { display_order: idx })
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
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Amenity
        </Button>
      </div>

      <div className="border rounded-lg">
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
            {amenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No amenities found. Create your first amenity to get started.
                </TableCell>
              </TableRow>
            ) : (
              amenities.map((amenity, index) => {
                const linkedPropertyTypeIds = amenityPropertyTypesMap[amenity.id] || [];
                const linkedPropertyTypeNames = linkedPropertyTypeIds
                  .map(ptId => propertyTypes.find(pt => pt.id === ptId)?.name)
                  .filter(Boolean);

                return (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(amenity.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorder(amenity.id, 'down')}
                          disabled={index === amenities.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
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
                        checked={amenity.is_active}
                        onCheckedChange={() => handleToggleActive(amenity.id, amenity.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(amenity)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(amenity.id)}
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

            <div className="space-y-2">
              <Label>Property Types</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which property types can have this amenity
              </p>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {propertyTypes.map((propertyType) => (
                  <div key={propertyType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pt-${propertyType.id}`}
                      checked={selectedPropertyTypes.includes(propertyType.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPropertyTypes([...selectedPropertyTypes, propertyType.id]);
                        } else {
                          setSelectedPropertyTypes(
                            selectedPropertyTypes.filter((id) => id !== propertyType.id)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`pt-${propertyType.id}`} className="font-normal cursor-pointer">
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
