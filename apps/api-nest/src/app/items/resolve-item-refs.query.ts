import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  IResolveItemRefsQuery,
  ResolveItemRefsInput,
  ResolvedItemRefs,
} from './contract/items.port';
import { PG_POOL } from './pg-pool';

type RefId = string | null | Extract<ResolvedItemRefs, { ok: false }>;
type IdRow = { id: string };
type SubcategoryRow = { id: string; category_id: string };

@Injectable()
export class ResolveItemRefsQuery implements IResolveItemRefsQuery {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async query(input: ResolveItemRefsInput): Promise<ResolvedItemRefs> {
    const category = await this.one(
      `SELECT id FROM categories WHERE name = $1`,
      input.categoryName,
    );
    if (!category) {
      return { ok: false, reason: `Catégorie inconnue : ${input.categoryName}` };
    }

    const subcategoryId = await this.subcategory(
      input.subcategoryName,
      category,
    );
    if (isRefFailure(subcategoryId)) {
      return subcategoryId;
    }

    const materialId = await this.optionalId(
      'materials',
      input.materialName,
      'Matière inconnue',
    );
    if (isRefFailure(materialId)) {
      return materialId;
    }

    const situationId = await this.optionalId(
      'situations',
      input.situationName,
      'Situation inconnue',
    );
    if (isRefFailure(situationId)) {
      return situationId;
    }

    const moodId = await this.optionalId('moods', input.moodName, 'Mood inconnu');
    if (isRefFailure(moodId)) {
      return moodId;
    }

    const weatherConditionId = await this.optionalId(
      'weather_conditions',
      input.weatherConditionName,
      'Condition météo inconnue',
    );
    if (isRefFailure(weatherConditionId)) {
      return weatherConditionId;
    }

    return {
      ok: true,
      categoryId: category,
      subcategoryId,
      materialId,
      situationId,
      moodId,
      weatherConditionId,
    };
  }

  private async subcategory(
    name: string | null,
    categoryId: string,
  ): Promise<RefId> {
    if (!name) {
      return null;
    }
    const found = await this.pool.query<SubcategoryRow>(
      `SELECT id, category_id FROM subcategories WHERE name = $1`,
      [name],
    );
    const match = found.rows.find((row) => row.category_id === categoryId);
    if (match) {
      return match.id;
    }
    if (found.rows.length === 0) {
      return { ok: false, reason: `Sous-catégorie inconnue : ${name}` };
    }
    return {
      ok: false,
      reason: `La sous-catégorie ${name} n'appartient pas à cette catégorie`,
    };
  }

  private async optionalId(
    table: 'materials' | 'situations' | 'moods' | 'weather_conditions',
    name: string | null,
    label: string,
  ): Promise<RefId> {
    if (!name) {
      return null;
    }
    const sql = lookupSql(table);
    const id = await this.one(sql, name);
    if (!id) {
      return { ok: false, reason: `${label} : ${name}` };
    }
    return id;
  }

  private async one(sql: string, name: string): Promise<string | null> {
    const result = await this.pool.query<IdRow>(sql, [name]);
    return result.rows[0]?.id ?? null;
  }
}

function isRefFailure(
  value: RefId,
): value is Extract<ResolvedItemRefs, { ok: false }> {
  return typeof value === 'object' && value !== null && value.ok === false;
}

function lookupSql(
  table: 'materials' | 'situations' | 'moods' | 'weather_conditions',
): string {
  switch (table) {
    case 'materials':
      return 'SELECT id FROM materials WHERE name = $1';
    case 'situations':
      return 'SELECT id FROM situations WHERE name = $1';
    case 'moods':
      return 'SELECT id FROM moods WHERE name = $1';
    case 'weather_conditions':
      return 'SELECT id FROM weather_conditions WHERE name = $1';
    default: {
      const unexpected: never = table;
      return unexpected;
    }
  }
}
