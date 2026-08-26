import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PostgresHealthService } from './postgres-health.service';

describe('(unit) HealthController', () => {
  let controller: HealthController;
  let postgresHealth: { ping: jest.Mock };

  beforeEach(async () => {
    postgresHealth = { ping: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PostgresHealthService, useValue: postgresHealth },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns ok when postgres ping succeeds', async () => {
    postgresHealth.ping.mockResolvedValue({ status: 'ok', database: 'up' });
    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('propagates 503 when postgres ping fails', async () => {
    postgresHealth.ping.mockRejectedValue(
      new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      }),
    );
    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
