import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { IListLookupsQuery, LookupLists } from './contract/items.port';
import { PG_POOL } from './pg-pool';

type CategoryRow = { name: string; slot_type: 'single' | 'multi'; is_required: boolean };
type SubcategoryRow = { category: string; name: string };
type NameRow = { name: string };

@Injectable()
export class ListLookupsQuery implements IListLookupsQuery {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async query(): Promise<LookupLists> {
    const [categories, subcategories, materials, situations, moods, weather] =
      await Promise.all([
        this.pool.query<CategoryRow>(
          `SELECT name, slot_type, is_required FROM categories ORDER BY name`,
        ),
        this.pool.query<SubcategoryRow>(
          `SELECT c.name AS category, s.name
           FROM subcategories s
           JOIN categories c ON c.id = s.category_id
           ORDER BY c.name, s.name`,
        ),
        this.pool.query<NameRow>(`SELECT name FROM materials ORDER BY name`),
        this.pool.query<NameRow>(`SELECT name FROM situations ORDER BY name`),
        this.pool.query<NameRow>(`SELECT name FROM moods ORDER BY name`),
        this.pool.query<NameRow>(
          `SELECT name FROM weather_conditions ORDER BY name`,
        ),
      ]);

    return {
      categories: categories.rows.map((row) => ({
        name: row.name,
        slotType: row.slot_type,
        isRequired: row.is_required,
      })),
      subcategories: subcategories.rows,
      materials: materials.rows.map((row) => row.name),
      situations: situations.rows.map((row) => row.name),
      moods: moods.rows.map((row) => row.name),
      weatherConditions: weather.rows.map((row) => row.name),
    };
  }
}
