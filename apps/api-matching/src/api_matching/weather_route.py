from datetime import UTC, date, datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from api_matching.weather import resolve_weather

router = APIRouter()


class WeatherIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    recorded_at: date | None = Field(default=None, alias="recordedAt")


@router.post("/weather", response_model=None)
def post_weather(body: WeatherIn) -> JSONResponse:
    recorded = body.recorded_at or datetime.now(UTC).date()
    reading, error = resolve_weather(body.latitude, body.longitude, body.city, recorded)
    if reading is None:
        return JSONResponse(
            status_code=200,
            content={"temperature": None, "weatherCondition": None, "error": error},
        )
    return JSONResponse(
        status_code=200,
        content={
            "temperature": reading.temperature,
            "weatherCondition": reading.condition,
            "error": None,
        },
    )
