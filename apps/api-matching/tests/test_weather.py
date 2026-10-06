import json
from datetime import date
from typing import Self

from api_matching.weather import condition_name, resolve_weather


class _Body:
    def __init__(self, payload: dict[str, object]) -> None:
        self._raw = json.dumps(payload).encode()

    def read(self) -> bytes:
        return self._raw

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_args: object) -> bool:
        return False


def test_rain_code_stays_rain_even_when_windy() -> None:
    assert condition_name(61, 80) == "pluie"
    assert condition_name(71, None) == "neige"
    assert condition_name(0, 50) == "venteux"
    assert condition_name(0, 10) == "ensoleillé"


def test_today_uses_the_forecast_payload() -> None:
    def fetch(url: str, timeout: int = 5) -> _Body:
        assert "forecast" in url
        assert timeout == 5
        return _Body(
            {"current": {"temperature_2m": 12.5, "weather_code": 61, "wind_speed_10m": 8}}
        )

    reading, error = resolve_weather(
        45.75,
        4.85,
        None,
        date(2026, 6, 15),
        today=date(2026, 6, 15),
        fetch=fetch,
    )
    assert error is None
    assert reading is not None
    assert reading.condition == "pluie"
    assert reading.temperature == 12.5


def test_a_past_day_uses_the_archive() -> None:
    def fetch(url: str, timeout: int = 5) -> _Body:
        assert "archive" in url
        return _Body(
            {
                "daily": {
                    "weather_code": [71],
                    "temperature_2m_mean": [1.5],
                    "wind_speed_10m_max": [10],
                }
            }
        )

    reading, error = resolve_weather(
        45.75,
        4.85,
        None,
        date(2024, 1, 3),
        today=date(2026, 6, 15),
        fetch=fetch,
    )
    assert error is None
    assert reading is not None
    assert reading.condition == "neige"


def test_unreachable_api_does_not_raise() -> None:
    def fetch(url: str, timeout: int = 5) -> _Body:
        raise OSError("down")

    reading, error = resolve_weather(
        45.75,
        4.85,
        None,
        date(2026, 6, 15),
        today=date(2026, 6, 15),
        fetch=fetch,
    )
    assert reading is None
    assert error == "Open-Meteo indisponible"
