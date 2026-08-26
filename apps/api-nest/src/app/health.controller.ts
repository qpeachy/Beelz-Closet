import { Controller, Get } from '@nestjs/common';
import { HealthOk, PostgresHealthService } from './postgres-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly postgresHealth: PostgresHealthService) {}

  @Get()
  getHealth(): Promise<HealthOk> {
    return this.postgresHealth.ping();
  }
}
