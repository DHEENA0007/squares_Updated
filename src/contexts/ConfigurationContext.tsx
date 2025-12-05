import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { configurationService } from '@/services/configurationService';
import type {
  PropertyType,
  Amenity,
  FilterConfiguration,
  PropertyTypeField,
  ConfigurationContextType,
} from '@/types/configuration';

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [filterConfigurations, setFilterConfigurations] = useState<FilterConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [types, amen, filters] = await Promise.all([
        configurationService.getAllPropertyTypes(),
        configurationService.getAllAmenities(),
        configurationService.getAllFilterConfigurations(),
      ]);

      setPropertyTypes(types);
      setAmenities(amen);
      setFilterConfigurations(filters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
      console.error('Error fetching configurations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPropertyTypeFields = async (propertyTypeId: string): Promise<PropertyTypeField[]> => {
    try {
      return await configurationService.getPropertyTypeFields(propertyTypeId);
    } catch (err) {
      console.error('Error fetching property type fields:', err);
      return [];
    }
  };

  const getPropertyTypeAmenities = async (propertyTypeId: string): Promise<Amenity[]> => {
    try {
      return await configurationService.getPropertyTypeAmenities(propertyTypeId);
    } catch (err) {
      console.error('Error fetching property type amenities:', err);
      return [];
    }
  };

  const getFiltersByType = (filterType: string): FilterConfiguration[] => {
    return filterConfigurations.filter((filter) => filter.filter_type === filterType);
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const value: ConfigurationContextType = {
    propertyTypes,
    amenities,
    filterConfigurations,
    isLoading,
    error,
    fetchConfigurations,
    getPropertyTypeFields,
    getPropertyTypeAmenities,
    getFiltersByType,
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = (): ConfigurationContextType => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};
