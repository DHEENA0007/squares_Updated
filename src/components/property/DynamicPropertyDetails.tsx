import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePropertyTypeConfig } from '@/hooks/usePropertyTypeConfig';

interface DynamicPropertyDetailsProps {
  propertyType: string;
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  showValidationErrors?: boolean;
}

export const DynamicPropertyDetails: React.FC<DynamicPropertyDetailsProps> = ({
  propertyType,
  formData,
  setFormData,
  showValidationErrors = false
}) => {
  const {
    config,
    isResidential,
    isCommercial,
    isLand,
    isPG,
    isFieldRequired,
    validateData
  } = usePropertyTypeConfig(propertyType);

  const validation = validateData(formData);

  if (!config) {
    return (
      <Alert>
        <AlertDescription>
          Please select a property type to see relevant property specifications.
        </AlertDescription>
      </Alert>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderBedroomsBathrooms = () => {
    if (!isResidential && !isPG) return null;

    const bedroomsConfig = config.fieldConfigurations.bedrooms;
    const bathroomsConfig = config.fieldConfigurations.bathrooms;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bedrooms */}
        {bedroomsConfig && (
          <div className="space-y-2">
            <Label htmlFor="bedrooms" className="text-base font-medium">
              {bedroomsConfig.label} {isFieldRequired('bedrooms') && '*'}
            </Label>
            <Select 
              value={formData.bedrooms} 
              onValueChange={(value) => handleInputChange('bedrooms', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {bedroomsConfig.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bathrooms */}
        {bathroomsConfig && (
          <div className="space-y-2">
            <Label htmlFor="bathrooms" className="text-base font-medium">
              {bathroomsConfig.label} {isFieldRequired('bathrooms') && '*'}
            </Label>
            <Select 
              value={formData.bathrooms} 
              onValueChange={(value) => handleInputChange('bathrooms', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {bathroomsConfig.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Furnishing */}
        {config.fieldConfigurations.furnishing && (isResidential || isCommercial) && (
          <div className="space-y-2">
            <Label htmlFor="furnishing" className="text-base font-medium">
              Furnishing {isFieldRequired('furnishing') && '*'}
            </Label>
            <Select 
              value={formData.furnishing} 
              onValueChange={(value) => handleInputChange('furnishing', value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {config.fieldConfigurations.furnishing.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

  const renderAreaFields = () => {
    const areaFields = config.fieldConfigurations.areaFields;
    if (!areaFields) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Built-up Area */}
        {areaFields.builtUpArea && (
          <div className="space-y-2">
            <Label htmlFor="builtUpArea" className="text-base font-medium">
              {areaFields.builtUpArea.label} {areaFields.builtUpArea.required && '*'}
            </Label>
            <Input
              id="builtUpArea"
              placeholder={areaFields.builtUpArea.placeholder}
              className="h-12"
              value={formData.builtUpArea}
              onChange={(e) => handleInputChange('builtUpArea', e.target.value)}
            />
          </div>
        )}

        {/* Carpet Area */}
        {areaFields.carpetArea && (
          <div className="space-y-2">
            <Label htmlFor="carpetArea" className="text-base font-medium">
              {areaFields.carpetArea.label} {areaFields.carpetArea.required && '*'}
            </Label>
            <Input
              id="carpetArea"
              placeholder={areaFields.carpetArea.placeholder}
              className="h-12"
              value={formData.carpetArea}
              onChange={(e) => handleInputChange('carpetArea', e.target.value)}
            />
          </div>
        )}

        {/* Plot Area */}
        {areaFields.plotArea && (
          <div className="space-y-2">
            <Label htmlFor="plotArea" className="text-base font-medium">
              {areaFields.plotArea.label} {areaFields.plotArea.required && '*'}
            </Label>
            <Input
              id="plotArea"
              placeholder={areaFields.plotArea.placeholder}
              className="h-12"
              value={formData.plotArea}
              onChange={(e) => handleInputChange('plotArea', e.target.value)}
            />
          </div>
        )}
      </div>
    );
  };

  const renderSpecialFields = () => {
    const specialFields = config.fieldConfigurations.specialFields;
    if (!specialFields) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(specialFields).map(([fieldName, fieldConfig]) => (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName} className="text-base font-medium">
              {fieldConfig.label} {fieldConfig.required && '*'}
            </Label>
            
            {fieldConfig.type === 'select' && fieldConfig.options ? (
              <Select 
                value={formData[fieldName]} 
                onValueChange={(value) => handleInputChange(fieldName, value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {fieldConfig.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={fieldName}
                type={fieldConfig.type === 'number' ? 'number' : 'text'}
                placeholder={fieldConfig.placeholder}
                className="h-12"
                value={formData[fieldName]}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Property Category Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold capitalize">
          {config.category} Property Details
        </h3>
        <p className="text-sm text-muted-foreground">
          Fill in the details specific to {config.label.toLowerCase()}
        </p>
      </div>

      {/* Validation Errors */}
      {showValidationErrors && !validation.isValid && validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <div>Please fix the following errors:</div>
            <ul className="list-disc list-inside mt-2">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Bedrooms, Bathrooms, Furnishing */}
      {renderBedroomsBathrooms()}

      {/* Area Fields */}
      {renderAreaFields()}

      {/* Special Fields */}
      {renderSpecialFields()}

      {/* Property Type Specific Alerts */}
      {isPG && (
        <Alert>
          <AlertDescription>
            For PG properties, room sharing indicates the number of people per room, 
            and area should reflect the individual room size.
          </AlertDescription>
        </Alert>
      )}

      {isLand && (
        <Alert>
          <AlertDescription>
            For land/plot properties, ensure you specify the correct land type and 
            verify all legal documentation before listing.
          </AlertDescription>
        </Alert>
      )}

      {isCommercial && (
        <Alert>
          <AlertDescription>
            Commercial properties may have different pricing structures and 
            legal requirements. Verify zoning permissions before listing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
