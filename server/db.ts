import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

const pool = new Pool({
  connectionString: "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
});

export const db = drizzle(pool, { schema });