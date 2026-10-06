import type {
  ICreateItemCommand,
  IResolveItemRefsQuery,
  IStoreItemFile,
  ItemWrite,
  ResolvedItemRefs,
} from './contract/items.port';
import { CreateItemUc } from './create-item.uc';
import { ItemValidationError } from './item-validation.error';
import type { ItemRecord } from './item-row';

class ResolveOk implements IResolveItemRefsQuery {
  constructor(private readonly result: ResolvedItemRefs) {}
  query(): Promise<ResolvedItemRefs> {
    return Promise.resolve(this.result);
  }
}

class StoreSpy implements IStoreItemFile {
  calls = 0;
  store(): Promise<string> {
    this.calls += 1;
    return Promise.resolve('/files/photo.jpg');
  }
}

class CreateSpy implements ICreateItemCommand {
  input: ItemWrite | null = null;
  command(input: ItemWrite): Promise<ItemRecord> {
    this.input = input;
    return Promise.resolve(itemRecord());
  }
}

const resolved: ResolvedItemRefs = {
  ok: true,
  categoryId: 'cat',
  subcategoryId: null,
  materialId: null,
  situationId: 'sit',
  moodId: null,
  weatherConditionId: null,
};

function request(overrides: Partial<Parameters<CreateItemUc['handle']>[0]> = {}) {
  return {
    userId: 'user',
    file: { mimeType: 'image/jpeg', bytes: Buffer.from('img') },
    categoryName: 'haut',
    subcategoryName: null,
    materialName: null,
    dominantColor: null,
    situationName: 'travail',
    moodName: null,
    weatherConditionName: null,
    temperature: null,
    comment: null,
    recordedAt: null,
    ...overrides,
  };
}

describe('(unit) CreateItemUc', () => {
  it('refuse une pièce sans photo', async () => {
    const uc = new CreateItemUc(new ResolveOk(resolved), new StoreSpy(), new CreateSpy());
    await expect(uc.handle(request({ file: null }))).rejects.toBeInstanceOf(
      ItemValidationError,
    );
  });

  it('refuse une pièce sans situation ni mood', async () => {
    const store = new StoreSpy();
    const uc = new CreateItemUc(new ResolveOk(resolved), store, new CreateSpy());
    await expect(
      uc.handle(request({ situationName: null, moodName: null })),
    ).rejects.toThrow('situation ou un mood');
    expect(store.calls).toBe(0);
  });

  it('n’écrit pas le fichier si la catégorie est inconnue', async () => {
    const store = new StoreSpy();
    const uc = new CreateItemUc(
      new ResolveOk({ ok: false, reason: 'Catégorie inconnue : haut' }),
      store,
      new CreateSpy(),
    );
    await expect(uc.handle(request())).rejects.toThrow('Catégorie inconnue');
    expect(store.calls).toBe(0);
  });

  it('enregistre la photo puis la pièce, recordedAt par défaut', async () => {
    const store = new StoreSpy();
    const create = new CreateSpy();
    const uc = new CreateItemUc(new ResolveOk(resolved), store, create);
    await uc.handle(request());
    expect(store.calls).toBe(1);
    expect(create.input?.url).toBe('/files/photo.jpg');
    expect(create.input?.recordedAt).toBeInstanceOf(Date);
    expect(create.input?.situationId).toBe('sit');
  });

  it('remplit température et condition avant l’insert quand un lieu est fourni', async () => {
    const create = new CreateSpy();
    const weather = {
      resolve: jest.fn().mockResolvedValue({ temperature: 12, weatherCondition: 'pluie' }),
    };
    const uc = new CreateItemUc(new ResolveOk(resolved), new StoreSpy(), create, weather);
    await uc.handle(request({ latitude: 45.75, longitude: 4.85 }));
    expect(create.input?.temperature).toBe(12);
    expect(weather.resolve).toHaveBeenCalled();
  });

  it('ne demande pas la météo si elle est déjà saisie', async () => {
    const weather = { resolve: jest.fn() };
    const uc = new CreateItemUc(
      new ResolveOk(resolved),
      new StoreSpy(),
      new CreateSpy(),
      weather,
    );
    await uc.handle(request({ weatherConditionName: 'pluie', latitude: 45.75, longitude: 4.85 }));
    expect(weather.resolve).not.toHaveBeenCalled();
  });
});

function itemRecord(): ItemRecord {
  return {
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
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}
