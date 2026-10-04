import type {
  IGetItemQuery,
  IResolveItemRefsQuery,
  IUpdateItemCommand,
  ItemWrite,
  ResolvedItemRefs,
} from './contract/items.port';
import type { ItemRecord } from './item-row';
import { ItemValidationError } from './item-validation.error';
import { UpdateItemUc } from './update-item.uc';

const current: ItemRecord = {
  id: 'item',
  userId: 'user',
  url: '/files/photo.jpg',
  categoryId: 'cat',
  category: 'haut',
  subcategoryId: null,
  subcategory: null,
  materialId: null,
  material: null,
  dominantColor: null,
  situationId: 'sit',
  situation: 'travail',
  moodId: null,
  mood: null,
  weatherConditionId: null,
  weatherCondition: null,
  temperature: null,
  comment: null,
  recordedAt: '2026-06-15T00:00:00.000Z',
  createdAt: '2026-06-15T00:00:00.000Z',
};

class GetOk implements IGetItemQuery {
  query(): Promise<ItemRecord | null> {
    return Promise.resolve(current);
  }
}

class ResolveOk implements IResolveItemRefsQuery {
  constructor(private readonly result: ResolvedItemRefs) {}
  query(): Promise<ResolvedItemRefs> {
    return Promise.resolve(this.result);
  }
}

class UpdateSpy implements IUpdateItemCommand {
  command(_itemId: string, input: ItemWrite): Promise<ItemRecord | null> {
    return Promise.resolve({ ...current, comment: input.comment });
  }
}

const resolved: ResolvedItemRefs = {
  ok: true,
  categoryId: 'cat',
  subcategoryId: null,
  materialId: null,
  situationId: null,
  moodId: null,
  weatherConditionId: null,
};

describe('(unit) UpdateItemUc', () => {
  it('refuse de retirer à la fois la situation et le mood', async () => {
    const uc = new UpdateItemUc(new GetOk(), new ResolveOk(resolved), new UpdateSpy());
    await expect(
      uc.handle({
        userId: 'user',
        itemId: 'item',
        situationName: null,
        moodName: null,
      }),
    ).rejects.toBeInstanceOf(ItemValidationError);
  });
});
