import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  const errorMessage = process.env.NODE_ENV === 'production'
    ? "DATABASE_URL must be set. In Railway: Add PostgreSQL database service and link it to your app service, or manually add DATABASE_URL in Variables."
    : "DATABASE_URL must be set. Did you forget to provision a database?";
  throw new Error(errorMessage);
}

// Create PostgreSQL connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Railway PostgreSQL connection settings
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create Drizzle database instance
export const db = drizzle({ client: pool, schema });