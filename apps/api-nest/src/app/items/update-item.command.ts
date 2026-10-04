import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { IUpdateItemCommand, ItemWrite } from './contract/items.port';
import { readActiveItem, type ItemRecord } from './item-row';
import { PG_POOL } from './pg-pool';

@Injectable()
export class UpdateItemCommand implements IUpdateItemCommand {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async command(itemId: string, input: ItemWrite): Promise<ItemRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `UPDATE items
         SET category_id = $3,
             subcategory_id = $4,
             material_id = $5,
             dominant_color = $6
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [
          itemId,
          input.userId,
          input.categoryId,
          input.subcategoryId,
          input.materialId,
          input.dominantColor,
        ],
      );
      if (updated.rowCount !== 1) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(
        `UPDATE metrics
         SET temperature = $2,
             weather_condition_id = $3,
             situation_id = $4,
             mood_id = $5,
             comment = $6,
             recorded_at = $7
         WHERE item_id = $1`,
        [
          itemId,
          input.temperature,
          input.weatherConditionId,
          input.situationId,
          input.moodId,
          input.comment,
          input.recordedAt,
        ],
      );
      const row = await readActiveItem(client, input.userId, itemId);
      await client.query('COMMIT');
      return row;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
