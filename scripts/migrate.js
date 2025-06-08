
import { Pool } from 'pg';
import { config } from 'dotenv';
import crypto from 'crypto';
import { promisify } from 'util';

config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectando ao banco de dados...');
    
    // Verificar se as colunas já existem
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('first_name', 'last_name', 'role', 'is_active', 'permissions')
    `);
    
    console.log('Colunas existentes:', checkColumns.rows);
    
    if (checkColumns.rows.length < 5) {
      console.log('Executando migração...');
      
      // Executar as alterações na tabela users
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
            ALTER TABLE users ADD COLUMN first_name varchar;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
            ALTER TABLE users ADD COLUMN last_name varchar;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE users ADD COLUMN role varchar DEFAULT 'technician';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
            ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'permissions') THEN
            ALTER TABLE users ADD COLUMN permissions text[] DEFAULT '{}';
          END IF;
        END $$;
      `);
      
      console.log('Migração executada com sucesso!');
    } else {
      console.log('Todas as colunas já existem.');
    }
    
    // Verificar se o usuário admin existe
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin'");
    
    if (adminCheck.rows.length === 0) {
      console.log('Criando usuário admin...');
      const scryptAsync = promisify(crypto.scrypt);
      
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = await scryptAsync('admin123', salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      await pool.query(`
        INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['admin', hashedPassword, 'admin@carhub.com', 'Administrador', 'Sistema', 'admin', true, ['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']]);
      
      console.log('Usuário admin criado com sucesso!');
    } else {
      console.log('Usuário admin já existe.');
      
      // Verificar se o usuário admin tem todas as novas colunas preenchidas
      const adminUser = adminCheck.rows[0];
      let needsUpdate = false;
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (!adminUser.first_name) {
        updates.push(`first_name = $${paramCount++}`);
        values.push('Administrador');
        needsUpdate = true;
      }
      
      if (!adminUser.last_name) {
        updates.push(`last_name = $${paramCount++}`);
        values.push('Sistema');
        needsUpdate = true;
      }
      
      if (!adminUser.role || adminUser.role !== 'admin') {
        updates.push(`role = $${paramCount++}`);
        values.push('admin');
        needsUpdate = true;
      }
      
      if (adminUser.is_active !== true) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(true);
        needsUpdate = true;
      }
      
      if (!adminUser.permissions || adminUser.permissions.length === 0) {
        updates.push(`permissions = $${paramCount++}`);
        values.push(['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        values.push(adminUser.id);
        await pool.query(`
          UPDATE users 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
        `, values);
        
        console.log('Usuário admin atualizado com novas colunas!');
      } else {
        console.log('Usuário admin já possui todas as colunas preenchidas.');
      }
    }
    
    // Mostrar estrutura final da tabela
    const finalStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura final da tabela users:');
    console.table(finalStructure.rows);
    
    // Mostrar dados do usuário admin
    const adminData = await pool.query("SELECT id, username, email, first_name, last_name, role, is_active, permissions FROM users WHERE username = 'admin'");
    console.log('Dados do usuário admin:');
    console.table(adminData.rows);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
