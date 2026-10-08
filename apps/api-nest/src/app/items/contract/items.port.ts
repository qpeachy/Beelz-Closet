import type { ItemRecord } from '../item-row';

export type LookupLists = {
  categories: { name: string; slotType: 'single' | 'multi'; isRequired: boolean }[];
  subcategories: { category: string; name: string }[];
  materials: string[];
  situations: string[];
  moods: string[];
  weatherConditions: string[];
};

export interface IListLookupsQuery {
  query(): Promise<LookupLists>;
}

export type ResolveItemRefsInput = {
  categoryName: string;
  subcategoryName: string | null;
  materialName: string | null;
  situationName: string | null;
  moodName: string | null;
  weatherConditionName: string | null;
};

export type ResolvedItemRefs =
  | {
      ok: true;
      categoryId: string;
      subcategoryId: string | null;
      materialId: string | null;
      situationId: string | null;
      moodId: string | null;
      weatherConditionId: string | null;
    }
  | { ok: false; reason: string };

export interface IResolveItemRefsQuery {
  query(input: ResolveItemRefsInput): Promise<ResolvedItemRefs>;
}

export interface IListItemsQuery {
  query(userId: string): Promise<ItemRecord[]>;
}

export interface IGetItemQuery {
  query(userId: string, itemId: string): Promise<ItemRecord | null>;
}

export type ItemWrite = {
  userId: string;
  url: string;
  categoryId: string;
  subcategoryId: string | null;
  materialId: string | null;
  dominantColor: string | null;
  temperature: number | null;
  weatherConditionId: string | null;
  situationId: string | null;
  moodId: string | null;
  comment: string | null;
  recordedAt: Date;
};

export interface ICreateItemCommand {
  command(input: ItemWrite): Promise<ItemRecord>;
}

export interface IUpdateItemCommand {
  command(itemId: string, input: ItemWrite): Promise<ItemRecord | null>;
}

export interface ISoftDeleteItemCommand {
  command(userId: string, itemId: string): Promise<boolean>;
}

export type StoredPhoto = {
  mimeType: string;
  bytes: Buffer;
};

export interface IStoreItemFile {
  store(file: StoredPhoto): Promise<string>;
};
