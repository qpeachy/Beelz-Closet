import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { Client } from 'pg';
import { PostgresHealthService } from './postgres-health.service';

jest.mock('pg', () => ({
  Client: jest.fn(),
}));

describe('(unit) PostgresHealthService', () => {
  const ClientMock = Client as unknown as jest.Mock;
  let service: PostgresHealthService;

  beforeEach(async () => {
    ClientMock.mockReset();
    const app = await Test.createTestingModule({
      providers: [PostgresHealthService],
    }).compile();
    service = app.get(PostgresHealthService);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('throws 503 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    await expect(service.ping()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(ClientMock).not.toHaveBeenCalled();
  });

  it('returns ok after SELECT 1', async () => {
    process.env.DATABASE_URL = 'postgres://beelz:beelz@localhost:5432/beelz_closet';
    const connect = jest.fn().mockResolvedValue(undefined);
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const end = jest.fn().mockResolvedValue(undefined);
    ClientMock.mockImplementation(() => ({ connect, query, end }));

    await expect(service.ping()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(end).toHaveBeenCalled();
  });

  it('throws 503 when connect fails', async () => {
    process.env.DATABASE_URL = 'postgres://beelz:beelz@localhost:5432/beelz_closet';
    const connect = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const end = jest.fn().mockResolvedValue(undefined);
    ClientMock.mockImplementation(() => ({ connect, query: jest.fn(), end }));

    await expect(service.ping()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(end).toHaveBeenCalled();
  });
});
