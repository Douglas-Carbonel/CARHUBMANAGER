import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkAndFixServiceItems() {
  try {
    console.log('Checking service_items table...');
    
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'service_items'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating service_items table...');
      
      // Create the table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS service_items (
          id SERIAL PRIMARY KEY,
          service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
          service_type_id INTEGER NOT NULL REFERENCES service_types(id),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total_price DECIMAL(10,2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id);
        CREATE INDEX IF NOT EXISTS idx_service_items_service_type_id ON service_items(service_type_id);
      `);
      
      console.log('service_items table created successfully');
    } else {
      console.log('service_items table already exists');
    }
    
    // Check if we need to migrate existing services
    const servicesWithoutItems = await db.execute(sql`
      SELECT s.id, s.service_type_id, s.estimated_value 
      FROM services s 
      LEFT JOIN service_items si ON s.id = si.service_id 
      WHERE s.service_type_id IS NOT NULL 
      AND si.service_id IS NULL
      LIMIT 5
    `);
    
    if (servicesWithoutItems.rows.length > 0) {
      console.log(`Migrating ${servicesWithoutItems.rows.length} services to service_items...`);
      
      for (const service of servicesWithoutItems.rows) {
        await db.execute(sql`
          INSERT INTO service_items (service_id, service_type_id, quantity, unit_price, total_price)
          VALUES (${service.id}, ${service.service_type_id}, 1, ${service.estimated_value || '0.00'}, ${service.estimated_value || '0.00'})
        `);
      }
      
      console.log('Migration completed');
    }
    
    console.log('Service items check completed successfully');
    
  } catch (error) {
    console.error('Error checking service items:', error);
  }
}

checkAndFixServiceItems().then(() => process.exit(0));