import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ItemsModule } from './items/items.module';
import { PostgresHealthService } from './postgres-health.service';

@Module({
  imports: [ItemsModule],
  controllers: [AppController, HealthController],
  providers: [AppService, PostgresHealthService],
})
export class AppModule {}
