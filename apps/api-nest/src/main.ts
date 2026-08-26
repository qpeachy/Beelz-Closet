import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from './app/app.module';

loadEnv();
loadEnv({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.NEST_PORT ?? 3333);
  await app.listen(port);
  Logger.log(`api-nest listening on http://localhost:${port}`);
}

bootstrap();
