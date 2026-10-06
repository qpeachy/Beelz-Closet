import json
from dataclasses import dataclass
from datetime import UTC, date, datetime
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import urlopen

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
WINDY_KMH = 40.0


@dataclass(frozen=True)
class WeatherReading:
    temperature: float
    condition: str


def condition_name(code: int, wind_kmh: float | None) -> str:
    if code in range(51, 68) or code in (80, 81, 82, 95, 96, 99):
        return "pluie"
    if code in range(71, 78) or code in (85, 86):
        return "neige"
    if code in (0, 1):
        name = "ensoleillé"
    elif code in (2, 3, 45, 48):
        name = "nuageux"
    else:
        name = "nuageux"
    if wind_kmh is not None and wind_kmh >= WINDY_KMH:
        return "venteux"
    return name


def resolve_weather(
    latitude: float | None,
    longitude: float | None,
    city: str | None,
    recorded_on: date,
    today: date | None = None,
    fetch=urlopen,
) -> tuple[WeatherReading | None, str | None]:
    current_day = today or datetime.now(UTC).date()
    if recorded_on > current_day:
        return None, "date future ignorée"
    coords, error = _coordinates(latitude, longitude, city, fetch)
    if error or coords is None:
        return None, error or "lieu inconnu"
    lat, lon = coords
    try:
        if recorded_on == current_day:
            payload = _get(
                fetch,
                f"{FORECAST_URL}?latitude={lat}&longitude={lon}"
                "&current=temperature_2m,weather_code,wind_speed_10m",
            )
            current = payload.get("current")
            if not isinstance(current, dict):
                return None, "réponse Open-Meteo inattendue"
            return _reading(current.get("weather_code"), current.get("temperature_2m"), current.get("wind_speed_10m")), None
        day = recorded_on.isoformat()
        payload = _get(
            fetch,
            f"{ARCHIVE_URL}?latitude={lat}&longitude={lon}"
            f"&start_date={day}&end_date={day}"
            "&daily=weather_code,temperature_2m_mean,wind_speed_10m_max",
        )
        daily = payload.get("daily")
        if not isinstance(daily, dict):
            return None, "réponse Open-Meteo inattendue"
        return _reading(_first(daily.get("weather_code")), _first(daily.get("temperature_2m_mean")), _first(daily.get("wind_speed_10m_max"))), None
    except (OSError, URLError, TimeoutError, TypeError, json.JSONDecodeError, ValueError):
        return None, "Open-Meteo indisponible"


def _coordinates(
    latitude: float | None,
    longitude: float | None,
    city: str | None,
    fetch,
) -> tuple[tuple[float, float] | None, str | None]:
    if latitude is not None and longitude is not None:
        return (latitude, longitude), None
    if not city:
        return None, "lieu absent"
    payload = _get(fetch, f"{GEOCODE_URL}?name={_query(city)}&count=1&language=fr")
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        return None, f"ville introuvable: {city}"
    first = results[0]
    if not isinstance(first, dict):
        return None, f"ville introuvable: {city}"
    return (float(first["latitude"]), float(first["longitude"])), None


def _reading(code: object, temperature: object, wind: object) -> WeatherReading:
    if not isinstance(code, int) or not isinstance(temperature, (int, float)):
        raise TypeError("mesure incomplète")
    wind_kmh = float(wind) if isinstance(wind, (int, float)) else None
    return WeatherReading(float(temperature), condition_name(code, wind_kmh))


def _first(value: object) -> object:
    if isinstance(value, list) and value:
        return value[0]
    return None


def _get(fetch, url: str) -> dict[str, object]:
    with fetch(url, timeout=5) as response:
        body = response.read()
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise TypeError("JSON inattendu")
    return parsed


def _query(city: str) -> str:
    return quote(city)
