
-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Update existing admin user with proper fields
UPDATE users 
SET 
  email = COALESCE(email, 'admin@carhub.com'),
  first_name = COALESCE(first_name, 'Administrador'),
  last_name = COALESCE(last_name, 'Sistema'),
  is_active = COALESCE(is_active, true),
  permissions = COALESCE(permissions, ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports'])
WHERE username = 'admin';

-- Insert admin user if it doesn't exist
INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
SELECT 'admin', '$2b$10$8K1p/a0dclsgI22L/h5F9.cWx8Zm7H5bK5Pw/1wKIxtVMRg1KK1g2', 'admin@carhub.com', 'Administrador', 'Sistema', 'admin', true, ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
