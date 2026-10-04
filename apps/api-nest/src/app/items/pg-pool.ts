import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

export function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return new Pool({ connectionString });
}
