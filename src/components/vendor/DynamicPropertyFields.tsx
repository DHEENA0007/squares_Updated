import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { configurationService } from '@/services/configurationService';
import type { PropertyTypeField } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

interface DynamicPropertyFieldsProps {
  propertyTypeId: string;
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

const DynamicPropertyFields: React.FC<DynamicPropertyFieldsProps> = ({
  propertyTypeId,
  values,
  onChange,
  errors = {},
  onValidationChange,
}) => {
  const [fields, setFields] = useState<PropertyTypeField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Validate required fields whenever values or fields change
  useEffect(() => {
    if (!onValidationChange || fields.length === 0) return;

    const validationErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.isRequired) {
        const value = values[field.fieldName];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          validationErrors[field.fieldName] = `${field.fieldLabel} is required`;
        }
      }
    });

    const isValid = Object.keys(validationErrors).length === 0;
    onValidationChange(isValid, validationErrors);
  }, [values, fields, onValidationChange]);

  useEffect(() => {
    if (!propertyTypeId) {
      setFields([]);
      return;
    }

    const fetchFields = async () => {
      try {
        setIsLoading(true);
        const fieldsData = await configurationService.getPropertyTypeFields(propertyTypeId, false);
        setFields(fieldsData.sort((a, b) => a.displayOrder - b.displayOrder));
      } catch (error) {
        console.error('Error fetching property type fields:', error);
        toast({
          title: 'Error',
          description: 'Failed to load property fields',
          variant: 'destructive',
        });
        setFields([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [propertyTypeId, toast]);

  const renderField = (field: PropertyTypeField) => {
    const value = values[field.fieldName] ?? '';
    const error = errors[field.fieldName];

    switch (field.fieldType) {
      case 'text':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              value={value}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={`text-sm md:text-base ${error ? 'border-destructive' : ''}`}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.fieldName}
              type="number"
              value={value}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={`text-sm md:text-base ${error ? 'border-destructive' : ''}`}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => onChange(field.fieldName, val)}>
              <SelectTrigger className={`text-sm md:text-base ${error ? 'border-destructive' : ''}`}>
                <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.fieldOptions?.map((option) => (
                  <SelectItem key={option} value={option} className="text-sm md:text-base">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'multiselect':
        const multiValues = Array.isArray(value) ? value : [];
        return (
          <div key={field._id} className="space-y-2">
            <Label className="text-sm md:text-base">
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {field.fieldOptions?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.fieldName}-${option}`}
                    checked={multiValues.includes(option)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...multiValues, option]
                        : multiValues.filter((v) => v !== option);
                      onChange(field.fieldName, newValues);
                    }}
                  />
                  <Label
                    htmlFor={`${field.fieldName}-${option}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'boolean':
        return (
          <div key={field._id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id={field.fieldName}
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => onChange(field.fieldName, checked)}
              />
              <Label htmlFor={field.fieldName} className="text-sm md:text-base cursor-pointer">
                {field.fieldLabel}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading property fields...</span>
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {fields.map((field) => renderField(field))}
      </div>
    </div>
  );
};

export default DynamicPropertyFields;
