import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ItemNotFoundError, ItemValidationError } from './item-validation.error';

@Catch(ItemValidationError, ItemNotFoundError)
export class ItemExceptionFilter implements ExceptionFilter {
  catch(exception: ItemValidationError | ItemNotFoundError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof ItemNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
    response.status(status).json({ message: exception.message });
  }
}
