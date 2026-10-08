import type {
  ICreateItemCommand,
  IResolveItemRefsQuery,
  IStoreItemFile,
  StoredPhoto,
} from './contract/items.port';
import { ItemValidationError } from './item-validation.error';
import type { ItemRecord } from './item-row';

export type CreateItemRequest = {
  userId: string;
  file: StoredPhoto | null;
  categoryName: string;
  subcategoryName: string | null;
  materialName: string | null;
  dominantColor: string | null;
  situationName: string | null;
  moodName: string | null;
  weatherConditionName: string | null;
  temperature: number | null;
  comment: string | null;
  recordedAt: Date | null;
};

export class CreateItemUc {
  constructor(
    private readonly resolve: IResolveItemRefsQuery,
    private readonly store: IStoreItemFile,
    private readonly create: ICreateItemCommand,
  ) {}

  async handle(request: CreateItemRequest): Promise<ItemRecord> {
    if (!request.file) {
      throw new ItemValidationError('Une photo est obligatoire (JPEG, PNG ou WebP)');
    }
    if (!request.categoryName.trim()) {
      throw new ItemValidationError('La catégorie est obligatoire');
    }
    if (!request.situationName && !request.moodName) {
      throw new ItemValidationError(
        'Au moins une situation ou un mood est obligatoire',
      );
    }

    const refs = await this.resolve.query({
      categoryName: request.categoryName.trim(),
      subcategoryName: request.subcategoryName,
      materialName: request.materialName,
      situationName: request.situationName,
      moodName: request.moodName,
      weatherConditionName: request.weatherConditionName,
    });
    if (refs.ok === false) {
      throw new ItemValidationError(refs.reason);
    }

    const url = await this.store.store(request.file);
    return this.create.command({
      userId: request.userId,
      url,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      materialId: refs.materialId,
      dominantColor: request.dominantColor,
      temperature: request.temperature,
      weatherConditionId: refs.weatherConditionId,
      situationId: refs.situationId,
      moodId: refs.moodId,
      comment: request.comment,
      recordedAt: request.recordedAt ?? new Date(),
    });
  }
}
