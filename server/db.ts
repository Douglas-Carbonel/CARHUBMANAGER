import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
});

export const db = drizzle(pool);