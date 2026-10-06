import csv
import hashlib
from dataclasses import dataclass
from datetime import date
from io import StringIO
from os import environ
from pathlib import Path
from uuid import uuid4

from psycopg import Connection
from psycopg import Error as PsycopgError

from api_matching.weather import resolve_weather

ALLOWED_EXTENSIONS = {"jpg": "jpg", "jpeg": "jpg", "png": "png", "webp": "webp"}
REQUIRED_COLUMNS = ("filename", "category", "recorded_at", "situation", "mood")


@dataclass(frozen=True)
class CsvLine:
    line: int
    filename: str
    category: str
    recorded_on: date
    situation: str
    mood: str
    subcategory: str | None
    material: str | None
    dominant_color: str | None
    weather_condition: str | None
    temperature: float | None
    latitude: float | None
    longitude: float | None
    comment: str | None


@dataclass
class ImportReport:
    imported: int = 0
    rejected: int = 0
    duplicates: int = 0
    weather_missing: int = 0
    weather_failed: int = 0
    errors: list[dict[str, object]] | None = None

    def as_dict(self) -> dict[str, object]:
        return {
            "imported": self.imported,
            "rejected": self.rejected,
            "duplicates": self.duplicates,
            "weatherMissing": self.weather_missing,
            "weatherFailed": self.weather_failed,
            "errors": self.errors or [],
        }

    def reject(self, line: int, message: str) -> None:
        self.rejected += 1
        if self.errors is None:
            self.errors = []
        self.errors.append({"line": line, "message": message})


def storage_dir() -> Path:
    raw = environ.get("STORAGE_DIR")
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parents[4] / "storage"


def parse_csv(text: str) -> tuple[list[CsvLine], ImportReport]:
    report = ImportReport()
    reader = csv.DictReader(StringIO(text))
    if reader.fieldnames is None:
        report.reject(1, "CSV vide")
        return [], report
    missing = [name for name in REQUIRED_COLUMNS if name not in reader.fieldnames]
    if missing:
        report.reject(1, f"colonnes manquantes: {', '.join(missing)}")
        return [], report
    rows: list[CsvLine] = []
    for index, raw in enumerate(reader, start=2):
        parsed = _parse_line(index, raw, report)
        if parsed is not None:
            rows.append(parsed)
    return rows, report


def import_rows(
    connection: Connection,
    rows: list[CsvLine],
    photos_dir: Path,
    user_id: str,
    report: ImportReport,
    destination: Path | None = None,
) -> ImportReport:
    target = destination or storage_dir()
    target.mkdir(parents=True, exist_ok=True)
    root = photos_dir.resolve()
    for row in rows:
        _import_one(connection, row, root, user_id, report, target)
    return report


def _parse_line(line: int, raw: dict[str, str | None], report: ImportReport) -> CsvLine | None:
    filename = _text(raw.get("filename"))
    category = _text(raw.get("category"))
    situation = _text(raw.get("situation"))
    mood = _text(raw.get("mood"))
    recorded = _text(raw.get("recorded_at"))
    if not filename or not category or not situation or not mood or not recorded:
        report.reject(line, "filename, category, recorded_at, situation et mood sont obligatoires")
        return None
    try:
        recorded_on = date.fromisoformat(recorded)
    except ValueError:
        report.reject(line, f"recorded_at invalide: {recorded}")
        return None
    try:
        temperature = _float(raw.get("temperature"))
        latitude = _float(raw.get("latitude"))
        longitude = _float(raw.get("longitude"))
    except ValueError as error:
        report.reject(line, str(error))
        return None
    return CsvLine(
        line,
        filename,
        category,
        recorded_on,
        situation,
        mood,
        _text(raw.get("subcategory")),
        _text(raw.get("material")),
        _text(raw.get("dominant_color")),
        _text(raw.get("weather_condition")),
        temperature,
        latitude,
        longitude,
        _text(raw.get("comment")),
    )


def _import_one(
    connection: Connection,
    row: CsvLine,
    photos_dir: Path,
    user_id: str,
    report: ImportReport,
    destination: Path,
) -> None:
    photo = _photo_path(photos_dir, row.filename)
    if photo is None or not photo.is_file():
        report.reject(row.line, f"fichier introuvable: {row.filename}")
        return
    extension = ALLOWED_EXTENSIONS.get(photo.suffix.lower().lstrip("."))
    if extension is None:
        report.reject(row.line, f"format refusé: {row.filename}")
        return
    content = photo.read_bytes()
    digest = hashlib.sha256(content).hexdigest()
    filled = False
    existing = connection.execute(
        """
        SELECT item_id::text AS item_id
        FROM item_import_keys
        WHERE user_id = %s AND content_hash = %s AND recorded_on = %s
        """,
        (user_id, digest, row.recorded_on),
    ).fetchone()
    if existing is not None:
        report.duplicates += 1
        return
    try:
        category_id = _ensure_category(connection, row.category)
        subcategory_id = _ensure_subcategory(connection, category_id, row.subcategory)
        material_id = _ensure_name(connection, "materials", row.material)
        situation_id = _ensure_name(connection, "situations", row.situation)
        mood_id = _ensure_name(connection, "moods", row.mood)
        weather_id = _ensure_name(connection, "weather_conditions", row.weather_condition)
        filename = f"{uuid4()}.{extension}"
        (destination / filename).write_bytes(content)
        inserted = connection.execute(
            """
            INSERT INTO items (
              user_id, url, category_id, subcategory_id, material_id, dominant_color
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id::text AS id
            """,
            (
                user_id,
                f"/files/{filename}",
                category_id,
                subcategory_id,
                material_id,
                row.dominant_color,
            ),
        ).fetchone()
        if inserted is None:
            report.reject(row.line, "insertion impossible")
            return
        item_id = str(inserted["id"])
        connection.execute(
            """
            INSERT INTO metrics (
              item_id, temperature, weather_condition_id, situation_id, mood_id, comment, recorded_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                item_id,
                row.temperature,
                weather_id,
                situation_id,
                mood_id,
                row.comment,
                row.recorded_on,
            ),
        )
        connection.execute(
            """
            INSERT INTO item_import_keys (user_id, content_hash, recorded_on, item_id)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, digest, row.recorded_on, item_id),
        )
        filled = _fill_weather(connection, row, item_id)
    except (OSError, PsycopgError, RuntimeError) as error:
        report.reject(row.line, str(error))
        return
    report.imported += 1
    if row.temperature is None and row.weather_condition is None:
        if filled:
            return
        if row.latitude is not None and row.longitude is not None:
            report.weather_failed += 1
        report.weather_missing += 1


def _fill_weather(connection: Connection, row: CsvLine, item_id: str) -> bool:
    if row.temperature is not None or row.weather_condition is not None:
        return False
    if row.latitude is None or row.longitude is None:
        return False
    reading, _error = resolve_weather(row.latitude, row.longitude, None, row.recorded_on)
    if reading is None:
        return False
    weather_id = _ensure_name(connection, "weather_conditions", reading.condition)
    connection.execute(
        """
        UPDATE metrics
        SET temperature = %s, weather_condition_id = %s
        WHERE item_id = %s
        """,
        (reading.temperature, weather_id, item_id),
    )
    return True


def _photo_path(photos_dir: Path, filename: str) -> Path | None:
    candidate = (photos_dir / filename).resolve()
    if not candidate.is_relative_to(photos_dir):
        return None
    return candidate


def _ensure_category(connection: Connection, name: str) -> str:
    found = connection.execute(
        "SELECT id::text AS id FROM categories WHERE name = %s",
        (name,),
    ).fetchone()
    if found is not None:
        return str(found["id"])
    created = connection.execute(
        """
        INSERT INTO categories (name, slot_type, is_required)
        VALUES (%s, 'single', false)
        RETURNING id::text AS id
        """,
        (name,),
    ).fetchone()
    if created is None:
        raise RuntimeError(f"catégorie non créée: {name}")
    return str(created["id"])


def _ensure_subcategory(connection: Connection, category_id: str, name: str | None) -> str | None:
    if name is None:
        return None
    found = connection.execute(
        """
        SELECT id::text AS id FROM subcategories
        WHERE category_id = %s AND name = %s
        """,
        (category_id, name),
    ).fetchone()
    if found is not None:
        return str(found["id"])
    created = connection.execute(
        """
        INSERT INTO subcategories (category_id, name)
        VALUES (%s, %s)
        RETURNING id::text AS id
        """,
        (category_id, name),
    ).fetchone()
    if created is None:
        raise RuntimeError(f"sous-catégorie non créée: {name}")
    return str(created["id"])


def _ensure_name(connection: Connection, table: str, name: str | None) -> str | None:
    if name is None:
        return None
    if table == "materials":
        select = "SELECT id::text AS id FROM materials WHERE name = %s"
        insert = "INSERT INTO materials (name) VALUES (%s) RETURNING id::text AS id"
    elif table == "situations":
        select = "SELECT id::text AS id FROM situations WHERE name = %s"
        insert = "INSERT INTO situations (name) VALUES (%s) RETURNING id::text AS id"
    elif table == "moods":
        select = "SELECT id::text AS id FROM moods WHERE name = %s"
        insert = "INSERT INTO moods (name) VALUES (%s) RETURNING id::text AS id"
    elif table == "weather_conditions":
        select = "SELECT id::text AS id FROM weather_conditions WHERE name = %s"
        insert = "INSERT INTO weather_conditions (name) VALUES (%s) RETURNING id::text AS id"
    else:
        raise RuntimeError(f"table inconnue: {table}")
    found = connection.execute(select, (name,)).fetchone()
    if found is not None:
        return str(found["id"])
    created = connection.execute(insert, (name,)).fetchone()
    if created is None:
        raise RuntimeError(f"valeur non créée: {name}")
    return str(created["id"])


def _text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _float(value: str | None) -> float | None:
    raw = _text(value)
    if raw is None:
        return None
    try:
        return float(raw)
    except ValueError as error:
        raise ValueError(f"nombre invalide: {raw}") from error
