import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Client } from 'pg';

export type HealthOk = { status: 'ok'; database: 'up' };
export type HealthError = { status: 'error'; database: 'down' };

@Injectable()
export class PostgresHealthService {
  async ping(): Promise<HealthOk> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      } satisfies HealthError);
    }

    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      } satisfies HealthError);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
