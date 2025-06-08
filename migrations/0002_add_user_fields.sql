
-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Update existing admin user with proper fields
UPDATE users 
SET 
  email = 'admin@carhub.com',
  "firstName" = 'Administrador',
  "lastName" = 'Sistema',
  "isActive" = true,
  permissions = ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
WHERE username = 'admin' AND id = 1;
