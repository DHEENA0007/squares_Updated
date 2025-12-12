// TypeScript types for dynamic configuration system (MongoDB format)

export interface PropertyType {
  _id: string;
  name: string;
  value: string;
  category: string; // Allow any category, not just predefined ones
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTypeField {
  _id: string;
  propertyTypeId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  fieldOptions?: string[];
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  _id: string;
  name: string;
  category?: 'basic' | 'luxury' | 'security' | 'recreational';
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTypeAmenity {
  _id: string;
  propertyTypeId: string;
  amenityId: string;
  isDefault: boolean;
  createdAt: string;
}

export interface FilterConfiguration {
  _id: string;
  filterType: string; // Allow any filter type, not just predefined ones
  name: string;
  value: string;
  minValue?: number;
  maxValue?: number;
  displayLabel: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NavigationItem {
  _id: string;
  name: string;
  value: string;
  displayLabel?: string;
  category: string; // Allow any category
  parentId?: string;
  queryParams?: Record<string, string>;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurationMetadata {
  _id: string;
  configKey: string;
  configValue: any;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs for API operations (camelCase for MongoDB)
export interface CreatePropertyTypeDTO {
  name: string;
  value: string;
  category: string; // Allow any category
  icon?: string;
  displayOrder?: number;
}

export interface UpdatePropertyTypeDTO extends Partial<CreatePropertyTypeDTO> {
  isActive?: boolean;
}

export interface CreatePropertyTypeFieldDTO {
  propertyTypeId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  fieldOptions?: string[];
  isRequired?: boolean;
  displayOrder?: number;
}

export interface UpdatePropertyTypeFieldDTO extends Partial<CreatePropertyTypeFieldDTO> {
  isActive?: boolean;
}

export interface CreateAmenityDTO {
  name: string;
  category?: 'basic' | 'luxury' | 'security' | 'recreational';
  icon?: string;
  displayOrder?: number;
}

export interface UpdateAmenityDTO extends Partial<CreateAmenityDTO> {
  isActive?: boolean;
}

export interface CreateFilterConfigurationDTO {
  filter_type: string; // Allow any filter type
  name: string;
  value: string;
  min_value?: number;
  max_value?: number;
  display_label: string;
  display_order?: number;
}

export interface UpdateFilterConfigurationDTO extends Partial<CreateFilterConfigurationDTO> {
  isActive?: boolean;
}

export interface CreateNavigationItemDTO {
  name: string;
  value: string;
  displayLabel?: string;
  category: string; // Allow any category
  parentId?: string;
  queryParams?: Record<string, string>;
  displayOrder?: number;
}

export interface UpdateNavigationItemDTO extends Partial<CreateNavigationItemDTO> {
  isActive?: boolean;
}

export interface PropertyTypeWithFields extends PropertyType {
  fields: PropertyTypeField[];
  amenities: Amenity[];
}

export interface ConfigurationState {
  propertyTypes: PropertyType[];
  amenities: Amenity[];
  filterConfigurations: FilterConfiguration[];
  isLoading: boolean;
  error: string | null;
}

export interface ConfigurationContextType extends ConfigurationState {
  fetchConfigurations: () => Promise<void>;
  getPropertyTypeFields: (propertyTypeId: string) => Promise<PropertyTypeField[]>;
  getPropertyTypeAmenities: (propertyTypeId: string) => Promise<Amenity[]>;
  getFiltersByType: (filterType: string) => FilterConfiguration[];
}
