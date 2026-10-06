from collections.abc import Iterator
from contextlib import contextmanager
from os import environ
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from psycopg import Connection, connect
from psycopg import Error as PsycopgError
from psycopg.rows import dict_row
from psycopg.types.json import Json
from pydantic import BaseModel, ConfigDict, Field

from api_matching.compose import Candidate, Context, compose

SEEDED_USER_ID = "a0000000-0000-4000-8000-000000000001"

router = APIRouter()


class OutfitIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    situation: str
    mood: str
    weather_condition: str | None = Field(default=None, alias="weatherCondition")
    temperature: float | None = None


class OutfitError(Exception):
    def __init__(self, status: int, message: str, missing: list[str] | None = None) -> None:
        self.status = status
        self.message = message
        self.missing = missing


@contextmanager
def open_connection() -> Iterator[Connection]:
    url = environ.get("DATABASE_URL")
    if not url:
        raise OutfitError(503, "base indisponible")
    try:
        with connect(url, row_factory=dict_row) as connection:
            yield connection
    except (OSError, PsycopgError) as error:
        raise OutfitError(503, "base indisponible") from error


def parse_user(header: str | None) -> str:
    raw = header or SEEDED_USER_ID
    try:
        return str(UUID(raw))
    except ValueError as error:
        raise OutfitError(400, "x-user-id invalide") from error


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _lookup_id(connection: Connection, table: str, name: str) -> str | None:
    if table == "situations":
        sql = "SELECT id::text AS id FROM situations WHERE name = %s"
    elif table == "moods":
        sql = "SELECT id::text AS id FROM moods WHERE name = %s"
    elif table == "weather_conditions":
        sql = "SELECT id::text AS id FROM weather_conditions WHERE name = %s"
    else:
        raise OutfitError(500, "référentiel inconnu")
    row = connection.execute(sql, (name,)).fetchone()
    if row is None:
        return None
    return str(row["id"])


def resolve_context(connection: Connection, body: OutfitIn) -> Context:
    situation = _blank_to_none(body.situation)
    mood = _blank_to_none(body.mood)
    weather = _blank_to_none(body.weather_condition)
    if situation is None or mood is None:
        raise OutfitError(400, "situation et mood sont obligatoires")
    if _lookup_id(connection, "situations", situation) is None:
        raise OutfitError(400, f"situation inconnue: {situation}")
    if _lookup_id(connection, "moods", mood) is None:
        raise OutfitError(400, f"mood inconnu: {mood}")
    if weather is not None and _lookup_id(connection, "weather_conditions", weather) is None:
        raise OutfitError(400, f"condition météo inconnue: {weather}")
    return Context(situation, mood, weather, body.temperature)


def load_required_names(connection: Connection) -> list[str]:
    rows = connection.execute(
        "SELECT name FROM categories WHERE is_required ORDER BY name"
    ).fetchall()
    return [str(row["name"]) for row in rows]


def load_candidates(connection: Connection, user_id: str) -> list[Candidate]:
    rows = connection.execute(
        """
        SELECT i.id::text AS id, i.url,
               c.name AS category, c.slot_type, c.is_required,
               m.temperature, s.name AS situation, mo.name AS mood, w.name AS weather
        FROM items i
        JOIN categories c ON c.id = i.category_id
        JOIN metrics m ON m.item_id = i.id
        LEFT JOIN situations s ON s.id = m.situation_id
        LEFT JOIN moods mo ON mo.id = m.mood_id
        LEFT JOIN weather_conditions w ON w.id = m.weather_condition_id
        WHERE i.user_id = %s AND i.deleted_at IS NULL
        """,
        (user_id,),
    ).fetchall()
    return [
        Candidate(
            id=str(row["id"]),
            url=str(row["url"]),
            category=str(row["category"]),
            slot_type=str(row["slot_type"]),
            required=bool(row["is_required"]),
            temperature=row["temperature"],
            situation=row["situation"],
            mood=row["mood"],
            weather=row["weather"],
        )
        for row in rows
    ]


def insert_outfit(
    connection: Connection,
    user_id: str,
    snapshot: dict[str, object],
    item_ids: list[str],
) -> str:
    row = connection.execute(
        """
        INSERT INTO outfit_recommendations (user_id, context_snapshot, item_ids)
        VALUES (%s, %s, %s)
        RETURNING id::text AS id
        """,
        (user_id, Json(snapshot), [UUID(item_id) for item_id in item_ids]),
    ).fetchone()
    if row is None:
        raise OutfitError(503, "enregistrement de la tenue impossible")
    return str(row["id"])


def snapshot_of(context: Context) -> dict[str, object]:
    return {
        "situation": context.situation,
        "mood": context.mood,
        "weatherCondition": context.weather,
        "temperature": context.temperature,
    }


def create_outfits(connection: Connection, user_id: str, body: OutfitIn) -> dict[str, object]:
    context = resolve_context(connection, body)
    outfits, missing = compose(
        load_candidates(connection, user_id),
        context,
        load_required_names(connection),
    )
    if missing:
        raise OutfitError(422, "tenue incomplète", missing)
    payload = snapshot_of(context)
    created = []
    for outfit in outfits:
        item_ids = [scored.item.id for scored in outfit]
        outfit_id = insert_outfit(connection, user_id, payload, item_ids)
        created.append(
            {
                "id": outfit_id,
                "items": [
                    {
                        "id": scored.item.id,
                        "url": scored.item.url,
                        "category": scored.item.category,
                        "score": round(scored.score, 4),
                    }
                    for scored in outfit
                ],
                "coherenceScore": None,
            }
        )
    return {"outfits": created}


def list_outfits(connection: Connection, user_id: str) -> dict[str, object]:
    rows = connection.execute(
        """
        SELECT id::text AS id, context_snapshot, item_ids::text[] AS item_ids,
               coherence_score, created_at
        FROM outfit_recommendations
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,),
    ).fetchall()
    return {
        "outfits": [
            {
                "id": str(row["id"]),
                "contextSnapshot": row["context_snapshot"],
                "itemIds": list(row["item_ids"]),
                "coherenceScore": row["coherence_score"],
                "createdAt": row["created_at"].isoformat(),
            }
            for row in rows
        ]
    }


def _error_response(error: OutfitError) -> JSONResponse:
    content: dict[str, object] = {"message": error.message}
    if error.missing:
        content["missing"] = error.missing
    return JSONResponse(status_code=error.status, content=content)


@router.post("/outfits", response_model=None)
def post_outfits(
    body: OutfitIn,
    x_user_id: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    try:
        user_id = parse_user(x_user_id)
        with open_connection() as connection:
            payload = create_outfits(connection, user_id, body)
    except OutfitError as error:
        return _error_response(error)
    return JSONResponse(status_code=201, content=payload)


@router.get("/outfits", response_model=None)
def get_outfits(x_user_id: Annotated[str | None, Header()] = None) -> JSONResponse:
    try:
        user_id = parse_user(x_user_id)
        with open_connection() as connection:
            payload = list_outfits(connection, user_id)
    except OutfitError as error:
        return _error_response(error)
    return JSONResponse(status_code=200, content=payload)
