import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { itemFilePath } from './store-item-file';

const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i;

@Controller('files')
export class FilesController {
  @Get(':filename')
  send(@Param('filename') filename: string, @Res() response: Response) {
    if (!FILE_NAME.test(filename) || !existsSync(itemFilePath(filename))) {
      response.status(404).json({ message: 'Fichier introuvable' });
      return;
    }
    response.sendFile(itemFilePath(filename));
  }
}
