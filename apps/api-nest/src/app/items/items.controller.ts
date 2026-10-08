import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateItemUc } from './create-item.uc';
import { GetItemQuery } from './get-item.query';
import { ItemExceptionFilter } from './item-exception.filter';
import { ItemNotFoundError } from './item-validation.error';
import { ListItemsQuery } from './list-items.query';
import { ListLookupsQuery } from './list-lookups.query';
import { SEEDED_USER_ID } from './seed-user';
import { SoftDeleteItemCommand } from './soft-delete-item.command';
import { UpdateItemUc, type UpdateItemRequest } from './update-item.uc';

type UploadedPhoto = {
  mimetype: string;
  buffer: Buffer;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
@UseFilters(ItemExceptionFilter)
export class ItemsController {
  constructor(
    private readonly lookups: ListLookupsQuery,
    private readonly listItems: ListItemsQuery,
    private readonly getItem: GetItemQuery,
    private readonly createItem: CreateItemUc,
    private readonly updateItem: UpdateItemUc,
    private readonly softDelete: SoftDeleteItemCommand,
  ) {}

  @Get('lookups')
  listLookups() {
    return this.lookups.query();
  }

  @Get('items')
  list(@Headers('x-user-id') userHeader?: string) {
    return this.listItems.query(userIdFrom(userHeader));
  }

  @Get('items/:id')
  async getOne(
    @Param('id') id: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const item = await this.getItem.query(userIdFrom(userHeader), id);
    if (!item) {
      throw new ItemNotFoundError();
    }
    return item;
  }

  @Post('items')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  create(
    @UploadedFile() file: UploadedPhoto | undefined,
    @Body() body: Record<string, string | undefined>,
    @Headers('x-user-id') userHeader?: string,
  ) {
    return this.createItem.handle({
      userId: userIdFrom(userHeader),
      file: file
        ? { mimeType: file.mimetype, bytes: file.buffer }
        : null,
      categoryName: text(body['category']) ?? '',
      subcategoryName: text(body['subcategory']),
      materialName: text(body['material']),
      dominantColor: text(body['dominantColor']),
      situationName: text(body['situation']),
      moodName: text(body['mood']),
      weatherConditionName: text(body['weatherCondition']),
      temperature: numberField(body['temperature']),
      comment: text(body['comment']),
      recordedAt: dateField(body['recordedAt']),
    });
  }

  @Patch('items/:id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const request: UpdateItemRequest = {
      userId: userIdFrom(userHeader),
      itemId: id,
    };
    assignText(request, 'categoryName', body, 'category');
    assignNullableText(request, 'subcategoryName', body, 'subcategory');
    assignNullableText(request, 'materialName', body, 'material');
    assignNullableText(request, 'dominantColor', body, 'dominantColor');
    assignNullableText(request, 'situationName', body, 'situation');
    assignNullableText(request, 'moodName', body, 'mood');
    assignNullableText(request, 'weatherConditionName', body, 'weatherCondition');
    assignNullableText(request, 'comment', body, 'comment');
    if ('temperature' in body) {
      request.temperature =
        body['temperature'] === null ? null : numberField(String(body['temperature']));
    }
    if ('recordedAt' in body) {
      const recordedAt = dateField(
        body['recordedAt'] === null ? undefined : String(body['recordedAt']),
      );
      if (!recordedAt) {
        throw new BadRequestException('recordedAt invalide');
      }
      request.recordedAt = recordedAt;
    }
    return this.updateItem.handle(request);
  }

  @Delete('items/:id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') userHeader?: string,
  ) {
    const deleted = await this.softDelete.command(userIdFrom(userHeader), id);
    if (!deleted) {
      throw new NotFoundException('Pièce introuvable');
    }
  }
}

function userIdFrom(header?: string): string {
  if (!header) {
    return process.env['DEFAULT_USER_ID'] ?? SEEDED_USER_ID;
  }
  if (!UUID.test(header)) {
    throw new BadRequestException('x-user-id doit être un UUID');
  }
  return header;
}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function numberField(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException('temperature doit être un nombre');
  }
  return parsed;
}

function dateField(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('recordedAt invalide');
  }
  return parsed;
}

function assignText(
  request: UpdateItemRequest,
  key: 'categoryName',
  body: Record<string, unknown>,
  field: string,
): void {
  if (!(field in body) || body[field] === null) {
    return;
  }
  request[key] = String(body[field]);
}

function assignNullableText(
  request: UpdateItemRequest,
  key:
    | 'subcategoryName'
    | 'materialName'
    | 'dominantColor'
    | 'situationName'
    | 'moodName'
    | 'weatherConditionName'
    | 'comment',
  body: Record<string, unknown>,
  field: string,
): void {
  if (!(field in body)) {
    return;
  }
  if (body[field] === null) {
    request[key] = null;
    return;
  }
  const value = String(body[field]).trim();
  request[key] = value ? value : null;
}
