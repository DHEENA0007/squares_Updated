# Property Type Configuration System - Implementation Guide

## Overview
This document explains the comprehensive property type configuration system implemented in the squares codebase. The system ensures that the correct property details are collected based on the selected property type, providing a dynamic and user-friendly experience.

## Key Components

### 1. Property Type Configuration (`/src/utils/propertyTypeConfig.ts`)
This is the central configuration file that defines:
- **Property Types**: apartment, house, villa, commercial, office, plot, land, pg
- **Required Fields**: Fields that must be filled for each property type
- **Optional Fields**: Fields that are optional for each property type
- **Field Configurations**: Specific settings for each field (labels, options, placeholders)
- **Validation Rules**: Property-specific validation logic

#### Property Categories:
- **Residential**: apartment, house, villa
- **Commercial**: commercial, office
- **Land**: plot, land
- **Special**: pg (Paying Guest)

### 2. React Hook (`/src/hooks/usePropertyTypeConfig.ts`)
Provides easy access to configuration data with:
- Property type validation
- Dynamic field requirements
- Category detection (isResidential, isCommercial, isLand, isPG)
- Amenities filtering based on property type
- Form data validation

### 3. Dynamic Form Component (`/src/components/property/DynamicPropertyDetails.tsx`)
A reusable React component that:
- Renders appropriate fields based on property type
- Shows/hides sections dynamically
- Provides property-specific labels and options
- Displays validation errors
- Handles different input types (select, input, number)

## Property Type Specific Fields

### Residential Properties (Apartment, House, Villa)

#### Required Fields:
- **Bedrooms**: BHK configuration (1 BHK, 2 BHK, etc.)
- **Bathrooms**: Number of bathrooms
- **Built-up Area**: Total built-up area in sq ft
- **Floor** (apartments): Floor number and total floors
- **Plot Area** (villas): Required for villas

#### Optional Fields:
- **Carpet Area**: Usable floor area
- **Furnishing**: Fully/Semi/Unfurnished
- **Age**: Property age categories
- **Facing**: Direction (North, South, etc.)
- **Parking**: Number of parking spaces

#### Specific Configurations:
```typescript
// Apartment
bedrooms: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
builtUpArea: required, placeholder: "e.g., 1200"
floor: required (Ground, 1st, 2nd, etc.)

// Villa  
bedrooms: ['2 BHK', '3 BHK', '4 BHK', '5+ BHK'] (minimum 2)
plotArea: required, placeholder: "e.g., 5000"
builtUpArea: required, placeholder: "e.g., 3500"
```

### Commercial Properties (Commercial, Office)

#### Required Fields:
- **Built-up Area**: Commercial space area
- **Commercial Type**: Office, Retail, Showroom, etc.
- **Floor** (office): Floor location

#### Optional Fields:
- **Carpet Area**: Usable office area
- **Furnishing**: Fully Furnished/Semi/Bare Shell
- **Cabins**: Number of private cabins (office)
- **Workstations**: Desk capacity (office)

#### Specific Configurations:
```typescript
// Office
specialFields: {
  cabins: { type: 'number', placeholder: 'e.g., 3' }
  workstations: { type: 'number', placeholder: 'e.g., 20' }
}
furnishing: ['Fully Furnished', 'Semi Furnished', 'Bare Shell']
```

### Land/Plot Properties (Plot, Land)

#### Required Fields:
- **Plot Area**: Total land area
- **Land Type**: Residential/Commercial/Agricultural/Industrial
- **Area Unit**: sq ft, acre, sq meter

#### Optional Fields:
- **Boundary Wall**: Complete/Partial/None
- **Facing**: Land orientation

#### Specific Configurations:
```typescript
// Land
specialFields: {
  landType: { 
    options: ['Residential', 'Commercial', 'Agricultural', 'Industrial']
  }
  areaUnit: {
    options: ['Square Feet', 'Acre', 'Square Meter']
  }
}
```

### PG (Paying Guest) Properties

#### Required Fields:
- **Room Sharing**: Single/Double/Triple/4+ Sharing
- **Room Area**: Individual room size
- **Food Availability**: Meals Included/Kitchen Available/No Meals
- **Gender Preference**: Boys Only/Girls Only/Co-ed

#### Optional Fields:
- **Bathroom Type**: Attached/Common
- **Furnishing**: Room furnishing level

#### Specific Configurations:
```typescript
bedrooms: {
  label: 'Room Sharing',
  options: ['Single Sharing', 'Double Sharing', 'Triple Sharing', '4+ Sharing']
}
bathrooms: {
  label: 'Bathroom Type', 
  options: ['Attached', 'Common']
}
specialFields: {
  foodAvailability: { required: true },
  gender: { required: true }
}
```

## Amenities Configuration

Each property type has filtered amenities relevant to that category:

### Residential Amenities:
- Swimming Pool, Gym, Security, Parking
- Garden/Park, Clubhouse, Power Backup
- Elevator, WiFi, CCTV Surveillance

### Commercial Amenities:
- Parking, Security, Power Backup
- Elevator, CCTV, Fire Safety
- Central AC, Cafeteria

### Land Amenities:
- Road Access, Electricity
- Water Connection, Clear Title

### PG Amenities:
- Meals Included, Laundry Service
- 24/7 Security, WiFi, AC Rooms
- Attached Bathroom, Room Cleaning

## Implementation Examples

### 1. Using in Property Forms:
```tsx
import { DynamicPropertyDetails } from '@/components/property/DynamicPropertyDetails';
import { usePropertyTypeConfig } from '@/hooks/usePropertyTypeConfig';

const PropertyForm = () => {
  const [formData, setFormData] = useState({...});
  const { validateData, getAmenities } = usePropertyTypeConfig(formData.propertyType);

  return (
    <div>
      {/* Basic fields */}
      
      {/* Dynamic property details */}
      <DynamicPropertyDetails
        propertyType={formData.propertyType}
        formData={formData}
        setFormData={setFormData}
        showValidationErrors={true}
      />
      
      {/* Amenities with filtered options */}
      <AmenitiesSelector amenities={getAmenities()} />
    </div>
  );
};
```

### 2. Form Validation:
```tsx
const handleSubmit = () => {
  const validation = validateData(formData);
  if (!validation.isValid) {
    // Show errors: validation.errors
    return;
  }
  // Submit form
};
```

### 3. Conditional Field Display:
```tsx
const { isResidential, isCommercial, isLand, isPG } = usePropertyTypeConfig(propertyType);

if (isResidential) {
  // Show bedroom/bathroom fields
}
if (isPG) {
  // Show PG-specific fields
}
```

## Updated Files

### Core Configuration:
- `/src/utils/propertyTypeConfig.ts` - Main configuration
- `/src/hooks/usePropertyTypeConfig.ts` - React hook
- `/src/components/property/DynamicPropertyDetails.tsx` - Dynamic form component

### Updated Forms:
- `/src/pages/admin/AddProperty.tsx` - Updated to use dynamic system
- `/src/pages/vendor/AddProperty.tsx` - Can be updated similarly
- `/src/pages/customer/AddProperty.tsx` - Can be updated similarly

### Example Implementation:
- `/src/components/property/PropertyFormExample.tsx` - Complete example

## Benefits

1. **Consistency**: All property forms use the same configuration
2. **Maintainability**: Single source of truth for field configurations
3. **User Experience**: Only relevant fields are shown
4. **Validation**: Automatic validation based on property type
5. **Extensibility**: Easy to add new property types or modify existing ones
6. **Type Safety**: TypeScript interfaces ensure data consistency

## Future Enhancements

1. **Dynamic Pricing Models**: Different pricing structures per property type
2. **Location-based Configurations**: Adjust fields based on location
3. **Custom Property Types**: Allow users to create custom property categories
4. **Advanced Validation**: Complex cross-field validation rules
5. **Conditional Amenities**: Show amenities based on property features

## Migration Guide

To update existing forms to use this system:

1. Import the hook: `import { usePropertyTypeConfig } from '@/hooks/usePropertyTypeConfig';`
2. Add to component: `const { config, isResidential, ... } = usePropertyTypeConfig(propertyType);`
3. Replace static field definitions with dynamic ones
4. Use `<DynamicPropertyDetails>` component for property-specific fields
5. Update amenities to use filtered list: `getAmenities()`
6. Add validation: `validateData(formData)`

This system ensures that users see only relevant fields for their property type, improving the user experience and data quality.
