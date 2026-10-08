import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ISoftDeleteItemCommand } from './contract/items.port';
import { PG_POOL } from './pg-pool';

@Injectable()
export class SoftDeleteItemCommand implements ISoftDeleteItemCommand {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async command(userId: string, itemId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE items
       SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [itemId, userId],
    );
    return result.rowCount === 1;
  }
}
