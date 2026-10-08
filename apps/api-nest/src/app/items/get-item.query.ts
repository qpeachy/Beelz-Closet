import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { IGetItemQuery } from './contract/items.port';
import { ITEM_SELECT, mapItemRow, type DbItemRow, type ItemRecord } from './item-row';
import { PG_POOL } from './pg-pool';

@Injectable()
export class GetItemQuery implements IGetItemQuery {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async query(userId: string, itemId: string): Promise<ItemRecord | null> {
    const result = await this.pool.query<DbItemRow>(
      `${ITEM_SELECT}
       WHERE i.user_id = $1 AND i.id = $2 AND i.deleted_at IS NULL`,
      [userId, itemId],
    );
    const row = result.rows[0];
    return row ? mapItemRow(row) : null;
  }
}
