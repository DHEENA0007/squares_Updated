import axios from 'axios';
import type {
  PropertyType,
  PropertyTypeField,
  Amenity,
  PropertyTypeAmenity,
  FilterConfiguration,
  NavigationItem,
  ConfigurationMetadata,
  CreatePropertyTypeDTO,
  UpdatePropertyTypeDTO,
  CreatePropertyTypeFieldDTO,
  UpdatePropertyTypeFieldDTO,
  CreateAmenityDTO,
  UpdateAmenityDTO,
  CreateFilterConfigurationDTO,
  UpdateFilterConfigurationDTO,
  CreateNavigationItemDTO,
  UpdateNavigationItemDTO,
  PropertyTypeWithFields,
} from '@/types/configuration';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: `${API_BASE_URL}/configuration`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class ConfigurationService {
  // ============= Property Type Categories =============

  async getPropertyTypeCategories(): Promise<string[]> {
    const { data } = await api.get<{ success: boolean; data: string[] }>(
      '/property-type-categories'
    );
    return data.data;
  }

  async getPropertyTypeCategoryDetails(): Promise<Array<{ category: string; totalCount: number; activeCount: number }>> {
    try {
      const { data } = await api.get<{ success: boolean; data: Array<{ category: string; totalCount: number; activeCount: number }> }>(
        '/property-type-categories/details'
      );
      return data.data;
    } catch (error) {
      console.error('Error fetching category details:', error);
      return [];
    }
  }

  // ============= Property Types =============

  async getAllPropertyTypes(includeInactive = false): Promise<PropertyType[]> {
    const { data } = await api.get<{ success: boolean; data: PropertyType[] }>(
      '/property-types',
      { params: { includeInactive } }
    );

    // Convert MongoDB _id to id for compatibility
    return data.data.map(type => ({
      ...type,
      id: type._id,
      is_active: type.isActive,
      display_order: type.displayOrder,
      created_at: type.createdAt,
      updated_at: type.updatedAt,
    })) as any;
  }

  async getPropertyTypeById(id: string): Promise<PropertyType | null> {
    try {
      const { data } = await api.get<{ success: boolean; data: PropertyType }>(
        `/property-types/${id}`
      );

      const type = data.data;
      return {
        ...type,
        id: type._id,
        is_active: type.isActive,
        display_order: type.displayOrder,
        created_at: type.createdAt,
        updated_at: type.updatedAt,
      } as any;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getPropertyTypeWithDetails(id: string): Promise<PropertyTypeWithFields | null> {
    const propertyType = await this.getPropertyTypeById(id);
    if (!propertyType) return null;

    const fields = await this.getPropertyTypeFields(id);
    const amenities = await this.getPropertyTypeAmenities(id);

    return {
      ...propertyType,
      fields,
      amenities,
    };
  }

  async createPropertyType(data: CreatePropertyTypeDTO): Promise<PropertyType> {
    const { data: response } = await api.post<{ success: boolean; data: PropertyType }>(
      '/property-types',
      data
    );

    const type = response.data;
    return {
      ...type,
      id: type._id,
      is_active: type.isActive,
      display_order: type.displayOrder,
      created_at: type.createdAt,
      updated_at: type.updatedAt,
    } as any;
  }

  async updatePropertyType(id: string, data: UpdatePropertyTypeDTO): Promise<PropertyType> {
    const { data: response } = await api.put<{ success: boolean; data: PropertyType }>(
      `/property-types/${id}`,
      data
    );

    const type = response.data;
    return {
      ...type,
      id: type._id,
      is_active: type.isActive,
      display_order: type.displayOrder,
      created_at: type.createdAt,
      updated_at: type.updatedAt,
    } as any;
  }

  async deletePropertyType(id: string): Promise<void> {
    await api.delete(`/property-types/${id}`);
  }

  // ============= Property Type Fields =============

  async getPropertyTypeFields(propertyTypeId: string, includeInactive = false): Promise<PropertyTypeField[]> {
    const { data } = await api.get<{ success: boolean; data: PropertyTypeField[] }>(
      `/property-types/${propertyTypeId}/fields`,
      { params: { includeInactive } }
    );

    return data.data.map(field => ({
      ...field,
      id: field._id,
      property_type_id: field.propertyTypeId,
      field_name: field.fieldName,
      field_label: field.fieldLabel,
      field_type: field.fieldType,
      field_options: field.fieldOptions,
      is_required: field.isRequired,
      is_active: field.isActive,
      display_order: field.displayOrder,
      created_at: field.createdAt,
      updated_at: field.updatedAt,
    })) as any;
  }

  async createPropertyTypeField(data: CreatePropertyTypeFieldDTO): Promise<PropertyTypeField> {
    const { data: response } = await api.post<{ success: boolean; data: PropertyTypeField }>(
      '/property-type-fields',
      data
    );

    const field = response.data;
    return {
      ...field,
      id: field._id,
      property_type_id: field.propertyTypeId,
      field_name: field.fieldName,
      field_label: field.fieldLabel,
      field_type: field.fieldType,
      field_options: field.fieldOptions,
      is_required: field.isRequired,
      is_active: field.isActive,
      display_order: field.displayOrder,
      created_at: field.createdAt,
      updated_at: field.updatedAt,
    } as any;
  }

  async updatePropertyTypeField(id: string, data: UpdatePropertyTypeFieldDTO): Promise<PropertyTypeField> {
    const { data: response } = await api.put<{ success: boolean; data: PropertyTypeField }>(
      `/property-type-fields/${id}`,
      data
    );

    const field = response.data;
    return {
      ...field,
      id: field._id,
      property_type_id: field.propertyTypeId,
      field_name: field.fieldName,
      field_label: field.fieldLabel,
      field_type: field.fieldType,
      field_options: field.fieldOptions,
      is_required: field.isRequired,
      is_active: field.isActive,
      display_order: field.displayOrder,
      created_at: field.createdAt,
      updated_at: field.updatedAt,
    } as any;
  }

  async deletePropertyTypeField(id: string): Promise<void> {
    await api.delete(`/property-type-fields/${id}`);
  }

  // ============= Amenities =============

  async getAllAmenities(includeInactive = false): Promise<Amenity[]> {
    const { data } = await api.get<{ success: boolean; data: Amenity[] }>(
      '/amenities',
      { params: { includeInactive } }
    );

    return data.data.map(amenity => ({
      ...amenity,
      id: amenity._id,
      is_active: amenity.isActive,
      display_order: amenity.displayOrder,
      created_at: amenity.createdAt,
      updated_at: amenity.updatedAt,
    })) as any;
  }

  async getAmenitiesByCategory(category: string): Promise<Amenity[]> {
    const { data } = await api.get<{ success: boolean; data: Amenity[] }>(
      '/amenities',
      { params: { category } }
    );

    return data.data.map(amenity => ({
      ...amenity,
      id: amenity._id,
      is_active: amenity.isActive,
      display_order: amenity.displayOrder,
      created_at: amenity.createdAt,
      updated_at: amenity.updatedAt,
    })) as any;
  }

  async createAmenity(data: CreateAmenityDTO): Promise<Amenity> {
    const { data: response } = await api.post<{ success: boolean; data: Amenity }>(
      '/amenities',
      data
    );

    const amenity = response.data;
    return {
      ...amenity,
      id: amenity._id,
      is_active: amenity.isActive,
      display_order: amenity.displayOrder,
      created_at: amenity.createdAt,
      updated_at: amenity.updatedAt,
    } as any;
  }

  async updateAmenity(id: string, data: UpdateAmenityDTO): Promise<Amenity> {
    const { data: response } = await api.put<{ success: boolean; data: Amenity }>(
      `/amenities/${id}`,
      data
    );

    const amenity = response.data;
    return {
      ...amenity,
      id: amenity._id,
      is_active: amenity.isActive,
      display_order: amenity.displayOrder,
      created_at: amenity.createdAt,
      updated_at: amenity.updatedAt,
    } as any;
  }

  async deleteAmenity(id: string): Promise<void> {
    await api.delete(`/amenities/${id}`);
  }

  // ============= Property Type Amenities Mapping =============

  async getPropertyTypeAmenities(propertyTypeId: string): Promise<Amenity[]> {
    const { data } = await api.get<{ success: boolean; data: Amenity[] }>(
      `/property-types/${propertyTypeId}/amenities`
    );

    return data.data.map(amenity => ({
      ...amenity,
      id: amenity._id,
      is_active: amenity.isActive,
      display_order: amenity.displayOrder,
      created_at: amenity.createdAt,
      updated_at: amenity.updatedAt,
    })) as any;
  }

  async linkAmenityToPropertyType(
    propertyTypeId: string,
    amenityId: string,
    isDefault = false
  ): Promise<void> {
    // This would need a specific endpoint in the backend
    throw new Error('Not implemented - use updatePropertyTypeAmenities instead');
  }

  async unlinkAmenityFromPropertyType(propertyTypeId: string, amenityId: string): Promise<void> {
    // This would need a specific endpoint in the backend
    throw new Error('Not implemented - use updatePropertyTypeAmenities instead');
  }

  async updatePropertyTypeAmenities(propertyTypeId: string, amenityIds: string[]): Promise<void> {
    await api.put(`/property-types/${propertyTypeId}/amenities`, { amenityIds });
  }

  // ============= Filter Configurations =============

  async getAllFilterConfigurations(includeInactive = false): Promise<FilterConfiguration[]> {
    const { data } = await api.get<{ success: boolean; data: FilterConfiguration[] }>(
      '/filters',
      { params: { includeInactive } }
    );

    return data.data.map(filter => ({
      ...filter,
      id: filter._id,
      filter_type: filter.filterType,
      min_value: filter.minValue,
      max_value: filter.maxValue,
      display_label: filter.displayLabel,
      is_active: filter.isActive,
      display_order: filter.displayOrder,
      created_at: filter.createdAt,
      updated_at: filter.updatedAt,
    })) as any;
  }

  async getFilterConfigurationsByType(filterType: string, includeInactive = false): Promise<FilterConfiguration[]> {
    const { data } = await api.get<{ success: boolean; data: FilterConfiguration[] }>(
      '/filters',
      { params: { filterType, includeInactive } }
    );

    return data.data.map(filter => ({
      ...filter,
      id: filter._id,
      filter_type: filter.filterType,
      min_value: filter.minValue,
      max_value: filter.maxValue,
      display_label: filter.displayLabel,
      is_active: filter.isActive,
      display_order: filter.displayOrder,
      created_at: filter.createdAt,
      updated_at: filter.updatedAt,
    })) as any;
  }

  async createFilterConfiguration(data: CreateFilterConfigurationDTO): Promise<FilterConfiguration> {
    // Transform snake_case to camelCase for backend
    const backendData = {
      filterType: data.filter_type,
      name: data.name,
      value: data.value,
      minValue: data.min_value,
      maxValue: data.max_value,
      displayLabel: data.display_label,
      displayOrder: data.display_order,
    };

    const { data: response } = await api.post<{ success: boolean; data: FilterConfiguration }>(
      '/filters',
      backendData
    );

    const filter = response.data;
    return {
      ...filter,
      id: filter._id,
      filter_type: filter.filterType,
      min_value: filter.minValue,
      max_value: filter.maxValue,
      display_label: filter.displayLabel,
      is_active: filter.isActive,
      display_order: filter.displayOrder,
      created_at: filter.createdAt,
      updated_at: filter.updatedAt,
    } as any;
  }

  async updateFilterConfiguration(id: string, data: UpdateFilterConfigurationDTO): Promise<FilterConfiguration> {
    // Transform snake_case to camelCase for backend
    const backendData: any = {};
    if (data.filter_type !== undefined) backendData.filterType = data.filter_type;
    if (data.name !== undefined) backendData.name = data.name;
    if (data.value !== undefined) backendData.value = data.value;
    if (data.min_value !== undefined) backendData.minValue = data.min_value;
    if (data.max_value !== undefined) backendData.maxValue = data.max_value;
    if (data.display_label !== undefined) backendData.displayLabel = data.display_label;
    if (data.display_order !== undefined) backendData.displayOrder = data.display_order;
    if (data.isActive !== undefined) backendData.isActive = data.isActive;

    const { data: response } = await api.put<{ success: boolean; data: FilterConfiguration }>(
      `/filters/${id}`,
      backendData
    );

    const filter = response.data;
    return {
      ...filter,
      id: filter._id,
      filter_type: filter.filterType,
      min_value: filter.minValue,
      max_value: filter.maxValue,
      display_label: filter.displayLabel,
      is_active: filter.isActive,
      display_order: filter.displayOrder,
      created_at: filter.createdAt,
      updated_at: filter.updatedAt,
    } as any;
  }

  async deleteFilterConfiguration(id: string): Promise<void> {
    await api.delete(`/filters/${id}`);
  }

  // ============= Configuration Metadata =============

  async getConfigurationMetadata(key: string): Promise<ConfigurationMetadata | null> {
    try {
      const { data } = await api.get<{ success: boolean; data: ConfigurationMetadata }>(
        `/metadata/${key}`
      );

      const metadata = data.data;
      return {
        ...metadata,
        id: metadata._id,
        config_key: metadata.configKey,
        config_value: metadata.configValue,
        created_at: metadata.createdAt,
        updated_at: metadata.updatedAt,
      } as any;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async setConfigurationMetadata(key: string, value: any, description?: string): Promise<ConfigurationMetadata> {
    const { data: response } = await api.post<{ success: boolean; data: ConfigurationMetadata }>(
      '/metadata',
      {
        configKey: key,
        configValue: value,
        description,
      }
    );

    const metadata = response.data;
    return {
      ...metadata,
      id: metadata._id,
      config_key: metadata.configKey,
      config_value: metadata.configValue,
      created_at: metadata.createdAt,
      updated_at: metadata.updatedAt,
    } as any;
  }

  // ============= Navigation Items =============

  async getAllNavigationItems(includeInactive = false): Promise<NavigationItem[]> {
    const { data } = await api.get<{ success: boolean; data: NavigationItem[] }>(
      '/navigation-items',
      { params: { includeInactive } }
    );

    return data.data;
  }

  async getNavigationItemsByCategory(category: string, includeInactive = false): Promise<NavigationItem[]> {
    const { data } = await api.get<{ success: boolean; data: NavigationItem[] }>(
      '/navigation-items',
      { params: { category, includeInactive } }
    );

    return data.data;
  }

  async getNavigationItemById(id: string): Promise<NavigationItem | null> {
    try {
      const { data } = await api.get<{ success: boolean; data: NavigationItem }>(
        `/navigation-items/${id}`
      );

      return data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createNavigationItem(data: CreateNavigationItemDTO): Promise<NavigationItem> {
    const { data: response } = await api.post<{ success: boolean; data: NavigationItem }>(
      '/navigation-items',
      data
    );

    return response.data;
  }

  async updateNavigationItem(id: string, data: UpdateNavigationItemDTO): Promise<NavigationItem> {
    const { data: response } = await api.put<{ success: boolean; data: NavigationItem }>(
      `/navigation-items/${id}`,
      data
    );

    return response.data;
  }

  async deleteNavigationItem(id: string): Promise<void> {
    await api.delete(`/navigation-items/${id}`);
  }
}

export const configurationService = new ConfigurationService();
