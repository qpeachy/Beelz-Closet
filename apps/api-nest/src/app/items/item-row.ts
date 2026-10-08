import type { PoolClient } from 'pg';

export type ItemRecord = {
  id: string;
  userId: string;
  url: string;
  categoryId: string;
  category: string;
  subcategoryId: string | null;
  subcategory: string | null;
  materialId: string | null;
  material: string | null;
  dominantColor: string | null;
  situationId: string | null;
  situation: string | null;
  moodId: string | null;
  mood: string | null;
  weatherConditionId: string | null;
  weatherCondition: string | null;
  temperature: number | null;
  comment: string | null;
  recordedAt: string;
  createdAt: string;
};

export type DbItemRow = {
  id: string;
  user_id: string;
  url: string;
  category_id: string;
  category: string;
  subcategory_id: string | null;
  subcategory: string | null;
  material_id: string | null;
  material: string | null;
  dominant_color: string | null;
  situation_id: string | null;
  situation: string | null;
  mood_id: string | null;
  mood: string | null;
  weather_condition_id: string | null;
  weather_condition: string | null;
  temperature: number | string | null;
  comment: string | null;
  recorded_at: Date;
  created_at: Date;
};

export const ITEM_SELECT = `
SELECT
  i.id,
  i.user_id,
  i.url,
  c.id AS category_id,
  c.name AS category,
  sc.id AS subcategory_id,
  sc.name AS subcategory,
  mat.id AS material_id,
  mat.name AS material,
  i.dominant_color,
  sit.id AS situation_id,
  sit.name AS situation,
  mo.id AS mood_id,
  mo.name AS mood,
  wc.id AS weather_condition_id,
  wc.name AS weather_condition,
  met.temperature,
  met.comment,
  met.recorded_at,
  i.created_at
FROM items i
JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories sc ON sc.id = i.subcategory_id
LEFT JOIN materials mat ON mat.id = i.material_id
JOIN metrics met ON met.item_id = i.id
LEFT JOIN situations sit ON sit.id = met.situation_id
LEFT JOIN moods mo ON mo.id = met.mood_id
LEFT JOIN weather_conditions wc ON wc.id = met.weather_condition_id
`;

export async function readActiveItem(
  client: PoolClient,
  userId: string,
  itemId: string,
): Promise<ItemRecord | null> {
  const result = await client.query<DbItemRow>(
    `${ITEM_SELECT}
     WHERE i.user_id = $1 AND i.id = $2 AND i.deleted_at IS NULL`,
    [userId, itemId],
  );
  const row = result.rows[0];
  return row ? mapItemRow(row) : null;
}

export function mapItemRow(row: DbItemRow): ItemRecord {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    categoryId: row.category_id,
    category: row.category,
    subcategoryId: row.subcategory_id,
    subcategory: row.subcategory,
    materialId: row.material_id,
    material: row.material,
    dominantColor: row.dominant_color,
    situationId: row.situation_id,
    situation: row.situation,
    moodId: row.mood_id,
    mood: row.mood,
    weatherConditionId: row.weather_condition_id,
    weatherCondition: row.weather_condition,
    temperature:
      row.temperature === null ? null : Number(row.temperature),
    comment: row.comment,
    recordedAt: row.recorded_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}
