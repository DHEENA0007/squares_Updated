-- Seed default configurations from existing hardcoded values

-- Insert Property Types
INSERT INTO property_types (name, value, category, display_order) VALUES
  ('Apartment', 'apartment', 'residential', 1),
  ('Villa', 'villa', 'residential', 2),
  ('House', 'house', 'residential', 3),
  ('Commercial', 'commercial', 'commercial', 4),
  ('Office Space', 'office', 'commercial', 5),
  ('Plot', 'plot', 'land', 6),
  ('Land', 'land', 'land', 7),
  ('PG (Paying Guest)', 'pg', 'special', 8)
ON CONFLICT (value) DO NOTHING;

-- Insert Amenities
INSERT INTO amenities (name, category, display_order) VALUES
  -- Basic Amenities
  ('Parking', 'basic', 1),
  ('Power Backup', 'basic', 2),
  ('Water Supply', 'basic', 3),
  ('Elevator', 'basic', 4),
  ('WiFi', 'basic', 5),

  -- Security Amenities
  ('Security', 'security', 10),
  ('CCTV Surveillance', 'security', 11),
  ('Intercom', 'security', 12),
  ('Fire Safety', 'security', 13),
  ('24/7 Security', 'security', 14),

  -- Recreational Amenities
  ('Swimming Pool', 'recreational', 20),
  ('Gym/Fitness Center', 'recreational', 21),
  ('Garden/Park', 'recreational', 22),
  ('Playground', 'recreational', 23),
  ('Clubhouse', 'recreational', 24),
  ('Jogging Track', 'recreational', 25),
  ('Spa', 'recreational', 26),

  -- Other Amenities
  ('Visitor Parking', 'basic', 30),
  ('Waste Management', 'basic', 31),
  ('Shopping Complex', 'recreational', 32),
  ('Restaurant', 'recreational', 33),
  ('Bore Well', 'basic', 34),
  ('Central AC', 'luxury', 35),
  ('Cafeteria', 'recreational', 36),

  -- Land/Plot specific
  ('Road Access', 'basic', 40),
  ('Electricity', 'basic', 41),
  ('Water Connection', 'basic', 42),
  ('Sewerage', 'basic', 43),
  ('Clear Title', 'basic', 44),

  -- PG specific
  ('Meals Included', 'basic', 50),
  ('Laundry Service', 'basic', 51),
  ('Room Cleaning', 'basic', 52),
  ('Common Kitchen', 'basic', 53),
  ('Common Area', 'basic', 54),
  ('Study Room', 'recreational', 55),
  ('Single Occupancy', 'basic', 56),
  ('Double Occupancy', 'basic', 57),
  ('Triple Occupancy', 'basic', 58),
  ('AC Rooms', 'luxury', 59),
  ('Non-AC Rooms', 'basic', 60),
  ('Attached Bathroom', 'basic', 61),
  ('Common Bathroom', 'basic', 62),
  ('Wi-Fi in Rooms', 'basic', 63),
  ('TV in Rooms', 'luxury', 64)
ON CONFLICT (name) DO NOTHING;

-- Map Amenities to Property Types
-- Apartment amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'apartment'
  AND a.name IN ('Elevator', 'Parking', 'Security', 'Power Backup', 'Water Supply', 'Gym/Fitness Center', 'Swimming Pool', 'Garden/Park')
ON CONFLICT DO NOTHING;

-- Villa amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'villa'
  AND a.name IN ('Swimming Pool', 'Garden/Park', 'Parking', 'Security', 'Power Backup', 'Clubhouse', 'Spa')
ON CONFLICT DO NOTHING;

-- House amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'house'
  AND a.name IN ('Parking', 'Security', 'Garden/Park', 'Power Backup', 'Water Supply', 'Bore Well')
ON CONFLICT DO NOTHING;

-- Commercial amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'commercial'
  AND a.name IN ('Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Fire Safety', 'Central AC')
ON CONFLICT DO NOTHING;

-- Office amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'office'
  AND a.name IN ('Parking', 'Security', 'Power Backup', 'Elevator', 'CCTV Surveillance', 'Central AC', 'Cafeteria')
ON CONFLICT DO NOTHING;

-- Plot amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'plot'
  AND a.name IN ('Road Access', 'Electricity', 'Water Connection', 'Sewerage')
ON CONFLICT DO NOTHING;

-- Land amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'land'
  AND a.name IN ('Road Access', 'Electricity', 'Water Connection', 'Clear Title')
ON CONFLICT DO NOTHING;

-- PG amenities
INSERT INTO property_type_amenities (property_type_id, amenity_id, is_default)
SELECT pt.id, a.id, true
FROM property_types pt
CROSS JOIN amenities a
WHERE pt.value = 'pg'
  AND a.name IN ('Meals Included', 'Laundry Service', 'Room Cleaning', '24/7 Security', 'WiFi', 'AC Rooms', 'Attached Bathroom')
ON CONFLICT DO NOTHING;

-- Insert Filter Configurations

-- Bedroom filters
INSERT INTO filter_configurations (filter_type, name, value, display_label, display_order) VALUES
  ('bedroom', '1 BHK', '1', '1 BHK', 1),
  ('bedroom', '2 BHK', '2', '2 BHK', 2),
  ('bedroom', '3 BHK', '3', '3 BHK', 3),
  ('bedroom', '4 BHK', '4', '4 BHK', 4),
  ('bedroom', '5+ BHK', '5', '5+ BHK', 5),
  ('bedroom', 'Any BHK', 'any', 'Any BHK', 0)
ON CONFLICT (filter_type, value) DO NOTHING;

-- Budget filters
INSERT INTO filter_configurations (filter_type, name, value, min_value, max_value, display_label, display_order) VALUES
  ('budget', 'Any Budget', 'any-budget', NULL, NULL, 'Any Budget', 0),
  ('budget', '₹20L - ₹40L', '20-40', 2000000, 4000000, '₹20L - ₹40L', 1),
  ('budget', '₹40L - ₹60L', '40-60', 4000000, 6000000, '₹40L - ₹60L', 2),
  ('budget', '₹60L - ₹80L', '60-80', 6000000, 8000000, '₹60L - ₹80L', 3),
  ('budget', '₹80L - ₹1Cr', '80-1cr', 8000000, 10000000, '₹80L - ₹1Cr', 4),
  ('budget', '₹1Cr+', '1cr+', 10000000, NULL, '₹1Cr+', 5)
ON CONFLICT (filter_type, value) DO NOTHING;

-- Listing type filters
INSERT INTO filter_configurations (filter_type, name, value, display_label, display_order) VALUES
  ('listing_type', 'All Types', 'all', 'All Types', 0),
  ('listing_type', 'For Sale', 'sale', 'For Sale', 1),
  ('listing_type', 'For Rent', 'rent', 'For Rent', 2),
  ('listing_type', 'For Lease', 'lease', 'For Lease', 3)
ON CONFLICT (filter_type, value) DO NOTHING;

-- Furnishing type filters
INSERT INTO filter_configurations (filter_type, name, value, display_label, display_order) VALUES
  ('furnishing', 'Fully Furnished', 'furnished', 'Fully Furnished', 1),
  ('furnishing', 'Semi Furnished', 'semi_furnished', 'Semi Furnished', 2),
  ('furnishing', 'Unfurnished', 'unfurnished', 'Unfurnished', 3)
ON CONFLICT (filter_type, value) DO NOTHING;

-- Insert Property Type Fields

-- Apartment fields
DO $$
DECLARE
  apartment_id UUID;
BEGIN
  SELECT id INTO apartment_id FROM property_types WHERE value = 'apartment';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (apartment_id, 'bedrooms', 'Bedrooms', 'select', '["1", "2", "3", "4", "5+"]'::jsonb, true, 1),
    (apartment_id, 'bathrooms', 'Bathrooms', 'select', '["1", "2", "3", "4+"]'::jsonb, true, 2),
    (apartment_id, 'builtUpArea', 'Built-up Area (sq.ft)', 'number', NULL, true, 3),
    (apartment_id, 'floor', 'Floor', 'number', NULL, true, 4),
    (apartment_id, 'totalFloors', 'Total Floors', 'number', NULL, true, 5),
    (apartment_id, 'furnishing', 'Furnishing', 'select', '["Fully Furnished", "Semi Furnished", "Unfurnished"]'::jsonb, false, 6)
  ON CONFLICT DO NOTHING;
END $$;

-- Villa fields
DO $$
DECLARE
  villa_id UUID;
BEGIN
  SELECT id INTO villa_id FROM property_types WHERE value = 'villa';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (villa_id, 'bedrooms', 'Bedrooms', 'select', '["2", "3", "4", "5+"]'::jsonb, true, 1),
    (villa_id, 'bathrooms', 'Bathrooms', 'select', '["2", "3", "4", "5+"]'::jsonb, true, 2),
    (villa_id, 'builtUpArea', 'Built-up Area (sq.ft)', 'number', NULL, true, 3),
    (villa_id, 'plotArea', 'Plot Area (sq.ft)', 'number', NULL, true, 4),
    (villa_id, 'furnishing', 'Furnishing', 'select', '["Fully Furnished", "Semi Furnished", "Unfurnished"]'::jsonb, false, 5)
  ON CONFLICT DO NOTHING;
END $$;

-- House fields
DO $$
DECLARE
  house_id UUID;
BEGIN
  SELECT id INTO house_id FROM property_types WHERE value = 'house';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (house_id, 'bedrooms', 'Bedrooms', 'select', '["1", "2", "3", "4", "5+"]'::jsonb, true, 1),
    (house_id, 'bathrooms', 'Bathrooms', 'select', '["1", "2", "3", "4+"]'::jsonb, true, 2),
    (house_id, 'builtUpArea', 'Built-up Area (sq.ft)', 'number', NULL, true, 3),
    (house_id, 'furnishing', 'Furnishing', 'select', '["Fully Furnished", "Semi Furnished", "Unfurnished"]'::jsonb, false, 4)
  ON CONFLICT DO NOTHING;
END $$;

-- Commercial fields
DO $$
DECLARE
  commercial_id UUID;
BEGIN
  SELECT id INTO commercial_id FROM property_types WHERE value = 'commercial';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (commercial_id, 'commercialType', 'Commercial Type', 'select', '["Office Space", "Retail Shop", "Showroom", "Warehouse", "Restaurant Space"]'::jsonb, true, 1),
    (commercial_id, 'builtUpArea', 'Built-up Area (sq.ft)', 'number', NULL, true, 2),
    (commercial_id, 'floor', 'Floor', 'number', NULL, false, 3)
  ON CONFLICT DO NOTHING;
END $$;

-- Office fields
DO $$
DECLARE
  office_id UUID;
BEGIN
  SELECT id INTO office_id FROM property_types WHERE value = 'office';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (office_id, 'builtUpArea', 'Built-up Area (sq.ft)', 'number', NULL, true, 1),
    (office_id, 'floor', 'Floor', 'number', NULL, false, 2),
    (office_id, 'cabins', 'Number of Cabins', 'number', NULL, false, 3),
    (office_id, 'workstations', 'Workstations', 'number', NULL, false, 4)
  ON CONFLICT DO NOTHING;
END $$;

-- Plot fields
DO $$
DECLARE
  plot_id UUID;
BEGIN
  SELECT id INTO plot_id FROM property_types WHERE value = 'plot';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (plot_id, 'plotArea', 'Plot Area (sq.ft)', 'number', NULL, true, 1),
    (plot_id, 'plotType', 'Plot Type', 'select', '["Residential", "Commercial", "Industrial"]'::jsonb, true, 2),
    (plot_id, 'boundaryWall', 'Boundary Wall', 'boolean', NULL, false, 3),
    (plot_id, 'roadWidth', 'Road Width (ft)', 'number', NULL, false, 4),
    (plot_id, 'cornerPlot', 'Corner Plot', 'boolean', NULL, false, 5)
  ON CONFLICT DO NOTHING;
END $$;

-- Land fields
DO $$
DECLARE
  land_id UUID;
BEGIN
  SELECT id INTO land_id FROM property_types WHERE value = 'land';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (land_id, 'landArea', 'Land Area', 'number', NULL, true, 1),
    (land_id, 'areaUnit', 'Area Unit', 'select', '["Square Feet", "Acre", "Square Meter"]'::jsonb, true, 2),
    (land_id, 'landType', 'Land Type', 'select', '["Residential", "Commercial", "Agricultural", "Industrial"]'::jsonb, true, 3)
  ON CONFLICT DO NOTHING;
END $$;

-- PG fields
DO $$
DECLARE
  pg_id UUID;
BEGIN
  SELECT id INTO pg_id FROM property_types WHERE value = 'pg';

  INSERT INTO property_type_fields (property_type_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (pg_id, 'roomSharing', 'Room Sharing', 'select', '["Single", "Double", "Triple", "4+ Sharing"]'::jsonb, true, 1),
    (pg_id, 'foodAvailability', 'Food Availability', 'select', '["Meals Included", "Kitchen Available", "No Meals"]'::jsonb, false, 2),
    (pg_id, 'genderPreference', 'Gender Preference', 'select', '["Boys Only", "Girls Only", "Co-ed"]'::jsonb, false, 3),
    (pg_id, 'numberOfRooms', 'Number of Rooms', 'number', NULL, false, 4)
  ON CONFLICT DO NOTHING;
END $$;

-- Insert Configuration Metadata
INSERT INTO configuration_metadata (config_key, config_value, description) VALUES
  ('app_version', '"1.0.0"'::jsonb, 'Application configuration version'),
  ('last_config_update', 'null'::jsonb, 'Last configuration update timestamp'),
  ('default_currency', '"INR"'::jsonb, 'Default currency for the application')
ON CONFLICT (config_key) DO NOTHING;
