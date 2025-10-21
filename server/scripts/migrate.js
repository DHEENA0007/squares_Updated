require('dotenv').config();
const { supabase } = require('../config/database');

const createTables = async () => {
  console.log('🔄 Creating database tables...');

  const tables = [
    // Users table
    `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'agent', 'admin', 'service_provider')),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deactivated')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deactivated_at TIMESTAMP WITH TIME ZONE
    );
    `,

    // User profiles table
    `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      avatar TEXT,
      bio TEXT,
      address TEXT,
      date_of_birth DATE,
      gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
      preferences JSONB DEFAULT '{}',
      email_verified BOOLEAN DEFAULT FALSE,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Properties table
    `
    CREATE TABLE IF NOT EXISTS properties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('apartment', 'villa', 'house', 'commercial', 'plot', 'office')),
      listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sell', 'rent')),
      bhk VARCHAR(20),
      area DECIMAL(10,2) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(10) NOT NULL,
      coordinates JSONB,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold', 'rented', 'rejected', 'inactive')),
      featured BOOLEAN DEFAULT FALSE,
      verified BOOLEAN DEFAULT FALSE,
      views INTEGER DEFAULT 0,
      age_of_property INTEGER,
      furnishing_status VARCHAR(50) CHECK (furnishing_status IN ('furnished', 'semi_furnished', 'unfurnished')),
      parking_spaces INTEGER DEFAULT 0,
      total_floors INTEGER,
      property_floor INTEGER,
      facing_direction VARCHAR(50),
      rejection_reason TEXT,
      approved_at TIMESTAMP WITH TIME ZONE,
      approved_by UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Property images table
    `
    CREATE TABLE IF NOT EXISTS property_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      caption VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Property amenities table
    `
    CREATE TABLE IF NOT EXISTS property_amenities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      amenity_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Property nearby places table
    `
    CREATE TABLE IF NOT EXISTS property_nearby_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      place_name VARCHAR(200) NOT NULL,
      place_type VARCHAR(50) NOT NULL,
      distance DECIMAL(5,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // User favorites table
    `
    CREATE TABLE IF NOT EXISTS user_favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, property_id)
    );
    `,

    // Property views table
    `
    CREATE TABLE IF NOT EXISTS property_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Property inquiries table
    `
    CREATE TABLE IF NOT EXISTS property_inquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      inquiry_type VARCHAR(50) DEFAULT 'general',
      message TEXT NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Conversations table
    `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
      participant1_id UUID REFERENCES users(id) ON DELETE CASCADE,
      participant2_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Messages table
    `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Message attachments table
    `
    CREATE TABLE IF NOT EXISTS message_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_type VARCHAR(100),
      file_name VARCHAR(255),
      file_size INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Service providers table
    `
    CREATE TABLE IF NOT EXISTS service_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      services TEXT[] DEFAULT '{}',
      phone VARCHAR(20),
      email VARCHAR(255),
      avatar TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      service_areas TEXT[] DEFAULT '{}',
      rating DECIMAL(3,2) DEFAULT 0.0,
      total_ratings INTEGER DEFAULT 0,
      experience INTEGER,
      verified BOOLEAN DEFAULT FALSE,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Service requests table
    `
    CREATE TABLE IF NOT EXISTS service_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      service_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
      provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
      amount DECIMAL(12,2),
      priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
      progress INTEGER DEFAULT 0,
      estimated_completion TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      cancellation_reason TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,

    // Service ratings table
    `
    CREATE TABLE IF NOT EXISTS service_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(service_request_id)
    );
    `,

    // System settings table
    `
    CREATE TABLE IF NOT EXISTS system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      data_type VARCHAR(50) DEFAULT 'string',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_by UUID REFERENCES users(id)
    );
    `
  ];

  try {
    for (const [index, tableSQL] of tables.entries()) {
      console.log(`Creating table ${index + 1}/${tables.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: tableSQL });
      if (error) {
        console.error(`Error creating table ${index + 1}:`, error);
        throw error;
      }
    }

    console.log('✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const createIndexes = async () => {
  console.log('🔄 Creating database indexes...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);',
    'CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);',
    'CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);',
    'CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);',
    'CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);',
    'CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);',
    'CREATE INDEX IF NOT EXISTS idx_properties_state ON properties(state);',
    'CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);',
    'CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_property_amenities_property ON property_amenities(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_favorites_property ON user_favorites(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_property_views_property ON property_views(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_property_views_user ON property_views(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_property_inquiries_property ON property_inquiries(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_property_inquiries_user ON property_inquiries(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_property ON conversations(property_id);',
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);',
    'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);',
    'CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);',
    'CREATE INDEX IF NOT EXISTS idx_service_requests_user ON service_requests(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_service_requests_provider ON service_requests(provider_id);',
    'CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);',
    'CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(service_type);',
    'CREATE INDEX IF NOT EXISTS idx_service_ratings_provider ON service_ratings(provider_id);'
  ];

  try {
    for (const [index, indexSQL] of indexes.entries()) {
      console.log(`Creating index ${index + 1}/${indexes.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        console.error(`Error creating index ${index + 1}:`, error);
        // Don't throw on index creation errors, just log them
      }
    }

    console.log('✅ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

const insertDefaultData = async () => {
  console.log('🔄 Inserting default data...');

  try {
    // Insert default system settings
    const defaultSettings = [
      {
        key: 'site_name',
        value: 'Ninety Nine Acres',
        category: 'general',
        description: 'Website name',
        data_type: 'string'
      },
      {
        key: 'site_description',
        value: 'Your trusted real estate partner',
        category: 'general',
        description: 'Website description',
        data_type: 'string'
      },
      {
        key: 'contact_email',
        value: 'contact@ninetyneacres.com',
        category: 'contact',
        description: 'Main contact email',
        data_type: 'email'
      },
      {
        key: 'contact_phone',
        value: '+91 98765 43210',
        category: 'contact',
        description: 'Main contact phone',
        data_type: 'phone'
      },
      {
        key: 'max_property_images',
        value: '20',
        category: 'properties',
        description: 'Maximum images per property',
        data_type: 'number'
      },
      {
        key: 'property_approval_required',
        value: 'true',
        category: 'properties',
        description: 'Require admin approval for new properties',
        data_type: 'boolean'
      },
      {
        key: 'featured_property_price',
        value: '999',
        category: 'pricing',
        description: 'Price for featuring a property (in INR)',
        data_type: 'number'
      }
    ];

    for (const setting of defaultSettings) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'key' });
      
      if (error) {
        console.error('Error inserting setting:', error);
      }
    }

    // Insert sample service providers
    const sampleProviders = [
      {
        name: 'HDFC Bank',
        description: 'Leading bank providing home loans with competitive rates',
        services: ['home_loan'],
        phone: '+91 1800 266 4332',
        email: 'homeloans@hdfc.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        service_areas: ['Mumbai', 'Pune', 'Nashik'],
        rating: 4.5,
        total_ratings: 150,
        experience: 25,
        verified: true
      },
      {
        name: 'Agarwal Packers & Movers',
        description: 'Trusted moving services across India',
        services: ['movers'],
        phone: '+91 98765 43210',
        email: 'info@agarwalpackers.com',
        city: 'Delhi',
        state: 'Delhi',
        service_areas: ['Delhi', 'Mumbai', 'Bangalore', 'Chennai'],
        rating: 4.2,
        total_ratings: 200,
        experience: 15,
        verified: true
      },
      {
        name: 'Legal Associates',
        description: 'Property legal services and documentation',
        services: ['legal'],
        phone: '+91 87654 32109',
        email: 'contact@legalassociates.com',
        city: 'Bangalore',
        state: 'Karnataka',
        service_areas: ['Bangalore', 'Mysore', 'Mangalore'],
        rating: 4.7,
        total_ratings: 75,
        experience: 20,
        verified: true
      }
    ];

    for (const provider of sampleProviders) {
      const { error } = await supabase
        .from('service_providers')
        .insert(provider);
      
      if (error) {
        console.error('Error inserting service provider:', error);
      }
    }

    console.log('✅ Default data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting default data:', error);
  }
};

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    await createTables();
    await createIndexes();
    await insertDefaultData();
    
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  createTables,
  createIndexes,
  insertDefaultData,
  runMigration
};