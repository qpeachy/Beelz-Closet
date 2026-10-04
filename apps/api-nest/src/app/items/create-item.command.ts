import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ICreateItemCommand, ItemWrite } from './contract/items.port';
import { readActiveItem, type ItemRecord } from './item-row';
import { PG_POOL } from './pg-pool';

@Injectable()
export class CreateItemCommand implements ICreateItemCommand {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async command(input: ItemWrite): Promise<ItemRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO items (
           user_id, url, category_id, subcategory_id, material_id, dominant_color
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          input.userId,
          input.url,
          input.categoryId,
          input.subcategoryId,
          input.materialId,
          input.dominantColor,
        ],
      );
      const itemId = inserted.rows[0]?.id;
      if (!itemId) {
        throw new Error('Insert item n’a pas renvoyé d’id');
      }
      await client.query(
        `INSERT INTO metrics (
           item_id, temperature, weather_condition_id, situation_id, mood_id, comment, recorded_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
      const created = await readActiveItem(client, input.userId, itemId);
      if (!created) {
        throw new Error('Pièce créée introuvable');
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
