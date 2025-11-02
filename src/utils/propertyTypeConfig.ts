/**
 * Property Type Configuration for Dynamic Form Fields
 * This configuration determines which fields are shown/required based on property type
 */

export interface PropertyTypeConfig {
  type: string;
  label: string;
  category: 'residential' | 'commercial' | 'land' | 'special';
  requiredFields: string[];
  optionalFields: string[];
  fieldConfigurations: {
    bedrooms?: {
      label: string;
      options: { value: string; label: string }[];
    };
    bathrooms?: {
      label: string;
      options: { value: string; label: string }[];
    };
    areaFields: {
      builtUpArea?: { label: string; placeholder: string; required: boolean };
      carpetArea?: { label: string; placeholder: string; required: boolean };
      plotArea?: { label: string; placeholder: string; required: boolean };
    };
    furnishing?: {
      options: { value: string; label: string }[];
    };
    specialFields?: {
      [key: string]: {
        label: string;
        type: 'select' | 'input' | 'number';
        options?: { value: string; label: string }[];
        placeholder?: string;
        required?: boolean;
      };
    };
  };
  amenitiesFilter?: string[];
}

export const PROPERTY_TYPE_CONFIGS: PropertyTypeConfig[] = [
  // RESIDENTIAL PROPERTIES
  {
    type: 'apartment',
    label: 'Apartment',
    category: 'residential',
    requiredFields: ['bedrooms', 'bathrooms', 'builtUpArea', 'floor', 'totalFloors'],
    optionalFields: ['carpetArea', 'furnishing', 'age', 'facing', 'parkingSpaces'],
    fieldConfigurations: {
      bedrooms: {
        label: 'Bedrooms',
        options: [
          { value: '1', label: '1 BHK' },
          { value: '2', label: '2 BHK' },
          { value: '3', label: '3 BHK' },
          { value: '4', label: '4 BHK' },
          { value: '5', label: '5+ BHK' }
        ]
      },
      bathrooms: {
        label: 'Bathrooms',
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4+' }
        ]
      },
      areaFields: {
        builtUpArea: { label: 'Built-up Area (sq ft)', placeholder: 'e.g., 1200', required: true },
        carpetArea: { label: 'Carpet Area (sq ft)', placeholder: 'e.g., 1000', required: false }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Unfurnished' }
        ]
      },
      specialFields: {
        floor: {
          label: 'Floor',
          type: 'input',
          placeholder: 'e.g., Ground, 1st, 2nd',
          required: true
        },
        totalFloors: {
          label: 'Total Floors',
          type: 'input',
          placeholder: 'e.g., 5, 10, 15',
          required: true
        }
      }
    },
    amenitiesFilter: ['Elevator', 'Parking', 'Security', 'Power Backup', 'Water Supply', 'Gym/Fitness Center', 'Swimming Pool', 'Garden/Park']
  },

  {
    type: 'house',
    label: 'House',
    category: 'residential',
    requiredFields: ['bedrooms', 'bathrooms', 'builtUpArea'],
    optionalFields: ['carpetArea', 'plotArea', 'furnishing', 'age', 'facing', 'parkingSpaces'],
    fieldConfigurations: {
      bedrooms: {
        label: 'Bedrooms',
        options: [
          { value: '1', label: '1 BHK' },
          { value: '2', label: '2 BHK' },
          { value: '3', label: '3 BHK' },
          { value: '4', label: '4 BHK' },
          { value: '5', label: '5+ BHK' }
        ]
      },
      bathrooms: {
        label: 'Bathrooms',
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4+' }
        ]
      },
      areaFields: {
        builtUpArea: { label: 'Built-up Area (sq ft)', placeholder: 'e.g., 2000', required: true },
        carpetArea: { label: 'Carpet Area (sq ft)', placeholder: 'e.g., 1800', required: false },
        plotArea: { label: 'Plot Area (sq ft)', placeholder: 'e.g., 3000', required: false }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Unfurnished' }
        ]
      }
    },
    amenitiesFilter: ['Parking', 'Security', 'Garden/Park', 'Power Backup', 'Water Supply', 'Bore Well']
  },

  {
    type: 'villa',
    label: 'Villa',
    category: 'residential',
    requiredFields: ['bedrooms', 'bathrooms', 'builtUpArea', 'plotArea'],
    optionalFields: ['carpetArea', 'furnishing', 'age', 'facing', 'parkingSpaces'],
    fieldConfigurations: {
      bedrooms: {
        label: 'Bedrooms',
        options: [
          { value: '2', label: '2 BHK' },
          { value: '3', label: '3 BHK' },
          { value: '4', label: '4 BHK' },
          { value: '5', label: '5+ BHK' }
        ]
      },
      bathrooms: {
        label: 'Bathrooms',
        options: [
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5+' }
        ]
      },
      areaFields: {
        builtUpArea: { label: 'Built-up Area (sq ft)', placeholder: 'e.g., 3500', required: true },
        carpetArea: { label: 'Carpet Area (sq ft)', placeholder: 'e.g., 3000', required: false },
        plotArea: { label: 'Plot Area (sq ft)', placeholder: 'e.g., 5000', required: true }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Unfurnished' }
        ]
      }
    },
    amenitiesFilter: ['Swimming Pool', 'Garden/Park', 'Parking', 'Security', 'Power Backup', 'Clubhouse', 'Spa']
  },

  // COMMERCIAL PROPERTIES
  {
    type: 'commercial',
    label: 'Commercial',
    category: 'commercial',
    requiredFields: ['builtUpArea'],
    optionalFields: ['carpetArea', 'furnishing', 'floor', 'totalFloors', 'parkingSpaces'],
    fieldConfigurations: {
      areaFields: {
        builtUpArea: { label: 'Built-up Area (sq ft)', placeholder: 'e.g., 2500', required: true },
        carpetArea: { label: 'Carpet Area (sq ft)', placeholder: 'e.g., 2200', required: false }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Bare Shell' }
        ]
      },
      specialFields: {
        commercialType: {
          label: 'Commercial Type',
          type: 'select',
          options: [
            { value: 'office', label: 'Office Space' },
            { value: 'retail', label: 'Retail Shop' },
            { value: 'showroom', label: 'Showroom' },
            { value: 'warehouse', label: 'Warehouse' },
            { value: 'restaurant', label: 'Restaurant Space' }
          ],
          required: true
        }
      }
    },
    amenitiesFilter: ['Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Fire Safety', 'Central AC']
  },

  {
    type: 'office',
    label: 'Office Space',
    category: 'commercial',
    requiredFields: ['builtUpArea', 'floor'],
    optionalFields: ['carpetArea', 'furnishing', 'totalFloors', 'parkingSpaces'],
    fieldConfigurations: {
      areaFields: {
        builtUpArea: { label: 'Built-up Area (sq ft)', placeholder: 'e.g., 1500', required: true },
        carpetArea: { label: 'Carpet Area (sq ft)', placeholder: 'e.g., 1300', required: false }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Bare Shell' }
        ]
      },
      specialFields: {
        floor: {
          label: 'Floor',
          type: 'input',
          placeholder: 'e.g., Ground, 1st, 2nd',
          required: true
        },
        cabins: {
          label: 'Number of Cabins',
          type: 'number',
          placeholder: 'e.g., 3',
          required: false
        },
        workstations: {
          label: 'Workstations',
          type: 'number',
          placeholder: 'e.g., 20',
          required: false
        }
      }
    },
    amenitiesFilter: ['Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Central AC', 'Cafeteria']
  },

  // LAND/PLOT PROPERTIES
  {
    type: 'plot',
    label: 'Plot',
    category: 'land',
    requiredFields: ['plotArea'],
    optionalFields: ['facing'],
    fieldConfigurations: {
      areaFields: {
        plotArea: { label: 'Plot Area (sq ft)', placeholder: 'e.g., 5000', required: true },
        builtUpArea: { label: 'Total Area (sq ft)', placeholder: 'Same as plot area', required: true }
      },
      specialFields: {
        plotType: {
          label: 'Plot Type',
          type: 'select',
          options: [
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'industrial', label: 'Industrial' }
          ],
          required: true
        },
        boundaryWall: {
          label: 'Boundary Wall',
          type: 'select',
          options: [
            { value: 'complete', label: 'Complete' },
            { value: 'partial', label: 'Partial' },
            { value: 'none', label: 'None' }
          ],
          required: false
        },
        roadWidth: {
          label: 'Road Width (ft)',
          type: 'input',
          placeholder: 'e.g., 30',
          required: false
        },
        cornerPlot: {
          label: 'Corner Plot',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ],
          required: false
        }
      }
    },
    amenitiesFilter: ['Road Access', 'Electricity', 'Water Connection', 'Sewerage']
  },

  {
    type: 'land',
    label: 'Land',
    category: 'land',
    requiredFields: ['plotArea'],
    optionalFields: ['facing'],
    fieldConfigurations: {
      areaFields: {
        plotArea: { label: 'Land Area', placeholder: 'Enter area with unit', required: true },
        builtUpArea: { label: 'Total Area', placeholder: 'Same as land area', required: true }
      },
      specialFields: {
        landType: {
          label: 'Land Type',
          type: 'select',
          options: [
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'agricultural', label: 'Agricultural' },
            { value: 'industrial', label: 'Industrial' }
          ],
          required: true
        },
        areaUnit: {
          label: 'Area Unit',
          type: 'select',
          options: [
            { value: 'sqft', label: 'Square Feet' },
            { value: 'acre', label: 'Acre' },
            { value: 'sqm', label: 'Square Meter' }
          ],
          required: true
        },
        roadWidth: {
          label: 'Road Width (ft)',
          type: 'input',
          placeholder: 'e.g., 30',
          required: false
        },
        cornerPlot: {
          label: 'Corner Plot',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ],
          required: false
        }
      }
    },
    amenitiesFilter: ['Road Access', 'Electricity', 'Water Connection', 'Clear Title']
  },

  // SPECIAL PROPERTIES
  {
    type: 'pg',
    label: 'PG (Paying Guest)',
    category: 'special',
    requiredFields: ['bedrooms', 'builtUpArea'],
    optionalFields: ['bathrooms', 'floor', 'furnishing'],
    fieldConfigurations: {
      bedrooms: {
        label: 'Room Sharing',
        options: [
          { value: '1', label: 'Single Sharing' },
          { value: '2', label: 'Double Sharing' },
          { value: '3', label: 'Triple Sharing' },
          { value: '4', label: '4+ Sharing' }
        ]
      },
      bathrooms: {
        label: 'Bathroom Type',
        options: [
          { value: '1', label: 'Attached' },
          { value: '0', label: 'Common' }
        ]
      },
      areaFields: {
        builtUpArea: { label: 'Room Area (sq ft)', placeholder: 'e.g., 150', required: true }
      },
      furnishing: {
        options: [
          { value: 'fully-furnished', label: 'Fully Furnished' },
          { value: 'semi-furnished', label: 'Semi Furnished' },
          { value: 'unfurnished', label: 'Unfurnished' }
        ]
      },
      specialFields: {
        foodAvailability: {
          label: 'Food Availability',
          type: 'select',
          options: [
            { value: 'meals-included', label: 'Meals Included' },
            { value: 'kitchen-available', label: 'Kitchen Available' },
            { value: 'no-meals', label: 'No Meals' }
          ],
          required: true
        },
        gender: {
          label: 'Gender Preference',
          type: 'select',
          options: [
            { value: 'male', label: 'Boys Only' },
            { value: 'female', label: 'Girls Only' },
            { value: 'both', label: 'Co-ed' }
          ],
          required: true
        }
      }
    },
    amenitiesFilter: ['Meals Included', 'Laundry Service', 'Room Cleaning', '24/7 Security', 'WiFi', 'AC Rooms', 'Attached Bathroom']
  }
];

export const getPropertyTypeConfig = (propertyType: string): PropertyTypeConfig | null => {
  return PROPERTY_TYPE_CONFIGS.find(config => config.type === propertyType) || null;
};

export const getRequiredFields = (propertyType: string): string[] => {
  const config = getPropertyTypeConfig(propertyType);
  return config ? config.requiredFields : [];
};

export const getOptionalFields = (propertyType: string): string[] => {
  const config = getPropertyTypeConfig(propertyType);
  return config ? config.optionalFields : [];
};

export const isFieldRequired = (propertyType: string, fieldName: string): boolean => {
  const requiredFields = getRequiredFields(propertyType);
  return requiredFields.includes(fieldName);
};

export const getFieldConfiguration = (propertyType: string, fieldName: string) => {
  const config = getPropertyTypeConfig(propertyType);
  if (!config) return null;
  
  return config.fieldConfigurations[fieldName as keyof typeof config.fieldConfigurations] || null;
};

export const getPropertyAmenities = (propertyType: string): string[] => {
  const config = getPropertyTypeConfig(propertyType);
  return config?.amenitiesFilter || [];
};

export const validatePropertyData = (propertyType: string, formData: any): { isValid: boolean; errors: string[] } => {
  const config = getPropertyTypeConfig(propertyType);
  if (!config) {
    return { isValid: false, errors: ['Invalid property type'] };
  }

  const errors: string[] = [];
  
  // Check required fields
  config.requiredFields.forEach(field => {
    if (!formData[field] || formData[field] === '') {
      // Convert field name to readable format
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
      errors.push(`${fieldLabel} is required`);
    }
  });

  // Validate area fields
  const areaFields = config.fieldConfigurations.areaFields;
  if (areaFields) {
    Object.entries(areaFields).forEach(([areaType, areaConfig]) => {
      if (areaConfig && areaConfig.required && (!formData[areaType] || formData[areaType] === '')) {
        errors.push(`${areaConfig.label} is required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
