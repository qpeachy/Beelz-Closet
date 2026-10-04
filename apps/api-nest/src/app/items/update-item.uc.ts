import type {
  IGetItemQuery,
  IResolveItemRefsQuery,
  IUpdateItemCommand,
} from './contract/items.port';
import { ItemNotFoundError, ItemValidationError } from './item-validation.error';
import type { ItemRecord } from './item-row';

export type UpdateItemRequest = {
  userId: string;
  itemId: string;
  categoryName?: string;
  subcategoryName?: string | null;
  materialName?: string | null;
  dominantColor?: string | null;
  situationName?: string | null;
  moodName?: string | null;
  weatherConditionName?: string | null;
  temperature?: number | null;
  comment?: string | null;
  recordedAt?: Date;
};

export class UpdateItemUc {
  constructor(
    private readonly getItem: IGetItemQuery,
    private readonly resolve: IResolveItemRefsQuery,
    private readonly update: IUpdateItemCommand,
  ) {}

  async handle(request: UpdateItemRequest): Promise<ItemRecord> {
    const current = await this.getItem.query(request.userId, request.itemId);
    if (!current) {
      throw new ItemNotFoundError();
    }

    const categoryChanged =
      request.categoryName !== undefined &&
      request.categoryName !== current.category;
    const subcategoryName =
      request.subcategoryName !== undefined
        ? request.subcategoryName
        : categoryChanged
          ? null
          : current.subcategory;
    const situationName =
      request.situationName !== undefined
        ? request.situationName
        : current.situation;
    const moodName =
      request.moodName !== undefined ? request.moodName : current.mood;

    if (!situationName && !moodName) {
      throw new ItemValidationError(
        'Au moins une situation ou un mood est obligatoire',
      );
    }

    const refs = await this.resolve.query({
      categoryName: request.categoryName ?? current.category,
      subcategoryName,
      materialName:
        request.materialName !== undefined
          ? request.materialName
          : current.material,
      situationName,
      moodName,
      weatherConditionName:
        request.weatherConditionName !== undefined
          ? request.weatherConditionName
          : current.weatherCondition,
    });
    if (refs.ok === false) {
      throw new ItemValidationError(refs.reason);
    }

    const updated = await this.update.command(request.itemId, {
      userId: request.userId,
      url: current.url,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      materialId: refs.materialId,
      dominantColor:
        request.dominantColor !== undefined
          ? request.dominantColor
          : current.dominantColor,
      temperature:
        request.temperature !== undefined
          ? request.temperature
          : current.temperature,
      weatherConditionId: refs.weatherConditionId,
      situationId: refs.situationId,
      moodId: refs.moodId,
      comment: request.comment !== undefined ? request.comment : current.comment,
      recordedAt: request.recordedAt ?? new Date(current.recordedAt),
    });
    if (!updated) {
      throw new ItemNotFoundError();
    }
    return updated;
  }
}
