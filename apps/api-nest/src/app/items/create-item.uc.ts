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
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
};

export type WeatherFill = {
  temperature: number;
  weatherCondition: string;
};

export interface IFillWeather {
  resolve(input: {
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    recordedAt: Date | null;
  }): Promise<WeatherFill | null>;
}

export class CreateItemUc {
  constructor(
    private readonly resolve: IResolveItemRefsQuery,
    private readonly store: IStoreItemFile,
    private readonly create: ICreateItemCommand,
    private readonly weather: IFillWeather | null = null,
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

    await this.fillWeather(request);

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

  private async fillWeather(request: CreateItemRequest): Promise<void> {
    const hasPlace =
      (request.latitude != null && request.longitude != null) || !!request.city;
    if (
      !this.weather ||
      !hasPlace ||
      request.temperature != null ||
      request.weatherConditionName
    ) {
      return;
    }
    const filled = await this.weather.resolve({
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null,
      city: request.city ?? null,
      recordedAt: request.recordedAt,
    });
    if (!filled) {
      return;
    }
    request.temperature = filled.temperature;
    request.weatherConditionName = filled.weatherCondition;
  }
}
