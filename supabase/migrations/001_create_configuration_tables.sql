-- Create configuration tables for dynamic property management

-- Table for Property Types
CREATE TABLE IF NOT EXISTS property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'residential', 'commercial', 'land', 'special'
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Property Type Fields (dynamic fields per property type)
CREATE TABLE IF NOT EXISTS property_type_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type_id UUID REFERENCES property_types(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'select', 'multiselect', 'boolean'
  field_options JSONB, -- For select/multiselect fields
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Amenities
CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50), -- 'basic', 'luxury', 'security', 'recreational'
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Property Type Amenities mapping
CREATE TABLE IF NOT EXISTS property_type_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type_id UUID REFERENCES property_types(id) ON DELETE CASCADE,
  amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_type_id, amenity_id)
);

-- Table for Filter Configurations
CREATE TABLE IF NOT EXISTS filter_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type VARCHAR(50) NOT NULL, -- 'bedroom', 'budget', 'listing_type', 'furnishing'
  name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  min_value NUMERIC, -- For budget ranges
  max_value NUMERIC, -- For budget ranges
  display_label VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(filter_type, value)
);

-- Table for Configuration Metadata (general settings)
CREATE TABLE IF NOT EXISTS configuration_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_property_types_category ON property_types(category);
CREATE INDEX idx_property_types_active ON property_types(is_active);
CREATE INDEX idx_property_type_fields_type ON property_type_fields(property_type_id);
CREATE INDEX idx_amenities_category ON amenities(category);
CREATE INDEX idx_amenities_active ON amenities(is_active);
CREATE INDEX idx_filter_configurations_type ON filter_configurations(filter_type);
CREATE INDEX idx_filter_configurations_active ON filter_configurations(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_property_types_updated_at BEFORE UPDATE ON property_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_type_fields_updated_at BEFORE UPDATE ON property_type_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amenities_updated_at BEFORE UPDATE ON amenities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filter_configurations_updated_at BEFORE UPDATE ON filter_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_metadata_updated_at BEFORE UPDATE ON configuration_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_type_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_type_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for read access (all authenticated users can read active configs)
CREATE POLICY "Allow read access for authenticated users on property_types"
  ON property_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Allow read access for authenticated users on property_type_fields"
  ON property_type_fields FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Allow read access for authenticated users on amenities"
  ON amenities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Allow read access for authenticated users on property_type_amenities"
  ON property_type_amenities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access for authenticated users on filter_configurations"
  ON filter_configurations FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Allow read access for authenticated users on configuration_metadata"
  ON configuration_metadata FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for superadmin (full access)
-- Note: You'll need to implement a function to check if user is superadmin
-- For now, we'll use a placeholder that needs to be implemented based on your auth structure

-- Create function to check superadmin role
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This needs to be implemented based on your user/role structure
  -- For example, checking auth.uid() against a users table with role column
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Superadmin policies for all operations
CREATE POLICY "Superadmin full access on property_types"
  ON property_types FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin full access on property_type_fields"
  ON property_type_fields FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin full access on amenities"
  ON amenities FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin full access on property_type_amenities"
  ON property_type_amenities FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin full access on filter_configurations"
  ON filter_configurations FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin full access on configuration_metadata"
  ON configuration_metadata FOR ALL
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Comments for documentation
COMMENT ON TABLE property_types IS 'Stores dynamic property type configurations';
COMMENT ON TABLE property_type_fields IS 'Stores dynamic fields specific to each property type';
COMMENT ON TABLE amenities IS 'Stores all available amenities';
COMMENT ON TABLE property_type_amenities IS 'Maps amenities to property types';
COMMENT ON TABLE filter_configurations IS 'Stores filter options for search and filtering';
COMMENT ON TABLE configuration_metadata IS 'Stores general application configuration';
