import { useMemo } from 'react';
import { 
  PropertyTypeConfig, 
  getPropertyTypeConfig, 
  getRequiredFields, 
  getOptionalFields, 
  isFieldRequired, 
  getFieldConfiguration, 
  getPropertyAmenities, 
  validatePropertyData,
  PROPERTY_TYPE_CONFIGS 
} from '@/utils/propertyTypeConfig';

interface UsePropertyTypeConfigReturn {
  config: PropertyTypeConfig | null;
  requiredFields: string[];
  optionalFields: string[];
  allPropertyTypes: PropertyTypeConfig[];
  isFieldRequired: (fieldName: string) => boolean;
  getFieldConfig: (fieldName: string) => any;
  getAmenities: () => string[];
  validateData: (formData: any) => { isValid: boolean; errors: string[] };
  isResidential: boolean;
  isCommercial: boolean;
  isLand: boolean;
  isPG: boolean;
}

export const usePropertyTypeConfig = (propertyType: string): UsePropertyTypeConfigReturn => {
  const config = useMemo(() => getPropertyTypeConfig(propertyType), [propertyType]);
  const requiredFields = useMemo(() => getRequiredFields(propertyType), [propertyType]);
  const optionalFields = useMemo(() => getOptionalFields(propertyType), [propertyType]);
  
  const isResidential = useMemo(() => 
    ['apartment', 'villa', 'house'].includes(propertyType), [propertyType]
  );
  
  const isCommercial = useMemo(() => 
    ['commercial', 'office'].includes(propertyType), [propertyType]
  );
  
  const isLand = useMemo(() => 
    ['plot', 'land'].includes(propertyType), [propertyType]
  );
  
  const isPG = useMemo(() => 
    propertyType === 'pg', [propertyType]
  );

  const isFieldRequiredFn = (fieldName: string): boolean => {
    return isFieldRequired(propertyType, fieldName);
  };

  const getFieldConfig = (fieldName: string) => {
    return getFieldConfiguration(propertyType, fieldName);
  };

  const getAmenities = (): string[] => {
    return getPropertyAmenities(propertyType);
  };

  const validateData = (formData: any) => {
    return validatePropertyData(propertyType, formData);
  };

  return {
    config,
    requiredFields,
    optionalFields,
    allPropertyTypes: PROPERTY_TYPE_CONFIGS,
    isFieldRequired: isFieldRequiredFn,
    getFieldConfig,
    getAmenities,
    validateData,
    isResidential,
    isCommercial,
    isLand,
    isPG
  };
};
