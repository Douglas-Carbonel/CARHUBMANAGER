
-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'permissions') THEN
        ALTER TABLE users ADD COLUMN permissions TEXT[] DEFAULT '{}';
    END IF;
    
    -- Ensure existing columns have the right defaults
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'technician';
    ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;
END $$;

-- Update existing admin user with proper fields (safe update)
UPDATE users 
SET 
  email = COALESCE(email, 'admin@carhub.com'),
  first_name = COALESCE(first_name, 'Administrador'),
  last_name = COALESCE(last_name, 'Sistema'),
  is_active = COALESCE(is_active, true),
  role = COALESCE(role, 'admin'),
  permissions = COALESCE(permissions, ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports'])
WHERE username = 'admin';

-- Insert admin user if it doesn't exist
INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
SELECT 'admin', '$2b$10$8K1p/a0dclsgI22L/h5F9.cWx8Zm7H5bK5Pw/1wKIxtVMRg1KK1g2', 'admin@carhub.com', 'Administrador', 'Sistema', 'admin', true, ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
