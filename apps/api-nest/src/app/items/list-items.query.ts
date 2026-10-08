import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { IListItemsQuery } from './contract/items.port';
import { ITEM_SELECT, mapItemRow, type DbItemRow, type ItemRecord } from './item-row';
import { PG_POOL } from './pg-pool';

@Injectable()
export class ListItemsQuery implements IListItemsQuery {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async query(userId: string): Promise<ItemRecord[]> {
    const result = await this.pool.query<DbItemRow>(
      `${ITEM_SELECT}
       WHERE i.user_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.created_at DESC`,
      [userId],
    );
    return result.rows.map(mapItemRow);
  }
}
