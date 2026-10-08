import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { IStoreItemFile, StoredPhoto } from './contract/items.port';
import { ItemValidationError } from './item-validation.error';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function itemStorageDir(): string {
  return process.env.STORAGE_DIR
    ? resolve(process.env.STORAGE_DIR)
    : resolve(process.cwd(), 'storage');
}

export function itemFilePath(filename: string): string {
  return join(itemStorageDir(), filename);
}

@Injectable()
export class StoreItemFile implements IStoreItemFile {
  async store(file: StoredPhoto): Promise<string> {
    const extension = EXTENSION_BY_MIME[file.mimeType];
    if (!extension) {
      throw new ItemValidationError('Photo acceptée : JPEG, PNG ou WebP');
    }
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(itemStorageDir(), { recursive: true });
    await writeFile(itemFilePath(filename), file.bytes);
    return `/files/${filename}`;
  }
}
