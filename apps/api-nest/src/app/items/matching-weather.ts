import { Injectable } from '@nestjs/common';
import type { IFillWeather, WeatherFill } from './create-item.uc';

@Injectable()
export class MatchingWeather implements IFillWeather {
  async resolve(input: {
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    recordedAt: Date | null;
  }): Promise<WeatherFill | null> {
    const base = process.env['MATCHING_URL'] ?? 'http://localhost:8000';
    try {
      const response = await fetch(`${base}/weather`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          latitude: input.latitude,
          longitude: input.longitude,
          city: input.city,
          recordedAt: input.recordedAt?.toISOString().slice(0, 10) ?? null,
        }),
      });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as {
        temperature: number | null;
        weatherCondition: string | null;
      };
      if (body.temperature === null || !body.weatherCondition) {
        return null;
      }
      return {
        temperature: body.temperature,
        weatherCondition: body.weatherCondition,
      };
    } catch {
      return null;
    }
  }
}
