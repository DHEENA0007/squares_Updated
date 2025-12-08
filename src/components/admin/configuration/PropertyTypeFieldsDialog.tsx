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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Settings2, X } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import type { 
  PropertyType, 
  PropertyTypeField, 
  CreatePropertyTypeFieldDTO,
  UpdatePropertyTypeFieldDTO 
} from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

interface PropertyTypeFieldsDialogProps {
  propertyType: PropertyType;
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number Input' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'boolean', label: 'Yes/No' },
];

const PropertyTypeFieldsDialog: React.FC<PropertyTypeFieldsDialogProps> = ({
  propertyType,
  isOpen,
  onClose,
}) => {
  const [fields, setFields] = useState<PropertyTypeField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<PropertyTypeField | null>(null);
  const [optionsInput, setOptionsInput] = useState('');
  const [formData, setFormData] = useState<CreatePropertyTypeFieldDTO>({
    propertyTypeId: propertyType._id,
    fieldName: '',
    fieldLabel: '',
    fieldType: 'text',
    fieldOptions: [],
    isRequired: false,
    displayOrder: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFields();
    }
  }, [isOpen, propertyType._id]);

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      const data = await configurationService.getPropertyTypeFields(propertyType._id, true);
      setFields(data);
    } catch (error) {
      console.error('Error fetching fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch property type fields',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFieldDialog = (field?: PropertyTypeField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        propertyTypeId: propertyType._id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        fieldOptions: field.fieldOptions || [],
        isRequired: field.isRequired,
        displayOrder: field.displayOrder,
      });
      setOptionsInput((field.fieldOptions || []).join(', '));
    } else {
      setEditingField(null);
      setFormData({
        propertyTypeId: propertyType._id,
        fieldName: '',
        fieldLabel: '',
        fieldType: 'text',
        fieldOptions: [],
        isRequired: false,
        displayOrder: fields.length,
      });
      setOptionsInput('');
    }
    setIsFieldDialogOpen(true);
  };

  const handleCloseFieldDialog = () => {
    setIsFieldDialogOpen(false);
    setEditingField(null);
    setOptionsInput('');
  };

  const handleSaveField = async () => {
    if (!formData.fieldName.trim() || !formData.fieldLabel.trim()) {
      toast({
        title: 'Error',
        description: 'Field name and label are required',
        variant: 'destructive',
      });
      return;
    }

    const fieldOptions = ['select', 'multiselect'].includes(formData.fieldType)
      ? optionsInput.split(',').map(opt => opt.trim()).filter(Boolean)
      : [];

    if (['select', 'multiselect'].includes(formData.fieldType) && fieldOptions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide at least one option for select fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataToSave = { ...formData, fieldOptions };
      
      if (editingField) {
        await configurationService.updatePropertyTypeField(editingField._id, dataToSave);
        toast({
          title: 'Success',
          description: 'Field updated successfully',
        });
      } else {
        await configurationService.createPropertyTypeField(dataToSave);
        toast({
          title: 'Success',
          description: 'Field created successfully',
        });
      }
      
      fetchFields();
      handleCloseFieldDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingField ? 'Failed to update field' : 'Failed to create field',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await configurationService.updatePropertyTypeField(id, { isActive: !currentStatus });
      toast({
        title: 'Success',
        description: `Field ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      fetchFields();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update field status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field? Existing properties will retain this data, but new properties will not collect it.')) {
      return;
    }

    try {
      await configurationService.deletePropertyTypeField(id);
      toast({
        title: 'Success',
        description: 'Field deleted successfully',
      });
      fetchFields();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete field',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex((f) => f._id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newOrder = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    try {
      await Promise.all(
        newOrder.map((field, idx) =>
          configurationService.updatePropertyTypeField(field._id, { displayOrder: idx })
        )
      );
      fetchFields();
      toast({
        title: 'Success',
        description: 'Fields reordered successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder fields',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Manage Fields: {propertyType.name}
            </DialogTitle>
            <DialogDescription>
              Configure which fields to collect when vendors add {propertyType.name} properties.
              Changes will apply to new properties only. Existing properties will retain their data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {fields.filter(f => f.isActive).length} active field(s)
              </p>
              <Button onClick={() => handleOpenFieldDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading fields...</div>
            ) : fields.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No fields configured yet. Add your first field to start collecting property details.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Order</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field._id}>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReorder(field._id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReorder(field._id, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{field.fieldLabel}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{field.fieldName}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{field.fieldType}</Badge>
                        </TableCell>
                        <TableCell>
                          {field.isRequired && <Badge variant="secondary">Required</Badge>}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={field.isActive}
                            onCheckedChange={() => handleToggleActive(field._id, field.isActive)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFieldDialog(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteField(field._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Edit/Create Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={handleCloseFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            <DialogDescription>
              Configure the field details. This will affect how vendors input data for this property type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fieldLabel">Field Label *</Label>
              <Input
                id="fieldLabel"
                placeholder="e.g., Number of Floors"
                value={formData.fieldLabel}
                onChange={(e) => setFormData({ ...formData, fieldLabel: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name (Internal) *</Label>
              <Input
                id="fieldName"
                placeholder="e.g., numberOfFloors"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use camelCase, no spaces. This is used internally to store data.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value: any) => setFormData({ ...formData, fieldType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['select', 'multiselect'].includes(formData.fieldType) && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (comma separated) *</Label>
                <Input
                  id="options"
                  placeholder="e.g., 1, 2, 3, 4, 5+"
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate options with commas
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
              />
              <Label htmlFor="isRequired">Required Field</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFieldDialog}>Cancel</Button>
            <Button onClick={handleSaveField}>
              {editingField ? 'Update' : 'Create'} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyTypeFieldsDialog;
