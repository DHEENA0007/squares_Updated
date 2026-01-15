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
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export const DynamicPropertyFields: React.FC<DynamicPropertyFieldsProps> = ({
  propertyTypeId,
  values,
  onChange,
  errors = {},
  onValidationChange,
}) => {
  const [fields, setFields] = useState<PropertyTypeField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    const fetchFields = async () => {
      if (!propertyTypeId) {
        setFields([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const fetchedFields = await configurationService.getPropertyTypeFields(propertyTypeId, false);
        // Sort by display order
        const sortedFields = fetchedFields.sort((a, b) => a.displayOrder - b.displayOrder);
        setFields(sortedFields);
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
    const fieldValue = values[field.fieldName] ?? '';
    const hasError = !!errors[field.fieldName];

    switch (field.fieldType) {
      case 'text':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel} {field.isRequired && '*'}
            </Label>
            <Input
              id={field.fieldName}
              value={fieldValue}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={`text-sm md:text-base ${hasError ? 'border-destructive' : ''}`}
            />
            {hasError && (
              <p className="text-sm text-destructive">{errors[field.fieldName]}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel} {field.isRequired && '*'}
            </Label>
            <Input
              id={field.fieldName}
              type="number"
              value={fieldValue}
              onChange={(e) => onChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={`text-sm md:text-base ${hasError ? 'border-destructive' : ''}`}
            />
            {hasError && (
              <p className="text-sm text-destructive">{errors[field.fieldName]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel} {field.isRequired && '*'}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={(value) => onChange(field.fieldName, value)}
            >
              <SelectTrigger className={`text-sm md:text-base ${hasError ? 'border-destructive' : ''}`}>
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
            {hasError && (
              <p className="text-sm text-destructive">{errors[field.fieldName]}</p>
            )}
          </div>
        );

      case 'multiselect':
        const selectedOptions = Array.isArray(fieldValue) ? fieldValue : [];
        return (
          <div key={field._id} className="space-y-2">
            <Label className="text-sm md:text-base">
              {field.fieldLabel} {field.isRequired && '*'}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-lg">
              {field.fieldOptions?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.fieldName}-${option}`}
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={(checked) => {
                      const newValue = checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((item) => item !== option);
                      onChange(field.fieldName, newValue);
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
            {hasError && (
              <p className="text-sm text-destructive">{errors[field.fieldName]}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field._id} className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor={field.fieldName} className="text-sm md:text-base">
              {field.fieldLabel} {field.isRequired && '*'}
            </Label>
            <Switch
              id={field.fieldName}
              checked={fieldValue === true || fieldValue === 'true'}
              onCheckedChange={(checked) => onChange(field.fieldName, checked)}
            />
            {hasError && (
              <p className="text-sm text-destructive">{errors[field.fieldName]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading property fields...</span>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No custom fields configured for this property type. The property type may be using default fields.
        </AlertDescription>
      </Alert>
    );
  }

  // Group fields into rows of 3 for better layout
  const rows: PropertyTypeField[][] = [];
  for (let i = 0; i < fields.length; i += 3) {
    rows.push(fields.slice(i, i + 3));
  }

  return (
    <div className="space-y-6">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid grid-cols-1 ${
            row.length === 1
              ? 'md:grid-cols-1'
              : row.length === 2
              ? 'md:grid-cols-2'
              : 'sm:grid-cols-2 lg:grid-cols-3'
          } gap-4 md:gap-6`}
        >
          {row.map((field) => renderField(field))}
        </div>
      ))}
    </div>
  );
};
