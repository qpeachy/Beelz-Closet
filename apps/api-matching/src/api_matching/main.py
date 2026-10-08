from collections.abc import Iterator
from contextlib import contextmanager
from os import environ
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from psycopg import Connection, connect
from psycopg import Error as PsycopgError

from api_matching.outfits import router as outfits_router

load_dotenv()
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

app = FastAPI(title="api-matching")
app.include_router(outfits_router)


@contextmanager
def _connect(url: str) -> Iterator[Connection]:
    with connect(url) as connection:
        yield connection


@app.get("/health", response_model=None)
def health() -> dict[str, str] | JSONResponse:
    url = environ.get("DATABASE_URL")
    if not url:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "down"},
        )
    try:
        with _connect(url) as connection:
            connection.execute("SELECT 1")
    except (OSError, PsycopgError):
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "down"},
        )
    return {"status": "ok", "database": "up"}
