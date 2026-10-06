from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from api_matching.csv_import import import_rows, parse_csv
from api_matching.outfits import SEEDED_USER_ID, OutfitError, open_connection

router = APIRouter()


class ImportIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    csv_path: str = Field(alias="csvPath")
    photos_dir: str = Field(alias="photosDir")


def _user_id(header: str | None) -> str:
    raw = header or SEEDED_USER_ID
    try:
        return str(UUID(raw))
    except ValueError as error:
        raise OutfitError(400, "x-user-id invalide") from error


@router.post("/imports", response_model=None)
def post_import(
    body: ImportIn,
    x_user_id: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    csv_path = Path(body.csv_path).resolve()
    photos = Path(body.photos_dir).resolve()
    if not csv_path.is_file():
        return JSONResponse(status_code=400, content={"message": "CSV introuvable"})
    if not photos.is_dir():
        return JSONResponse(status_code=400, content={"message": "dossier de photos introuvable"})
    rows, report = parse_csv(csv_path.read_text(encoding="utf-8-sig"))
    if report.errors and report.errors[0]["line"] == 1:
        return JSONResponse(status_code=400, content=report.as_dict())
    try:
        user_id = _user_id(x_user_id)
        with open_connection() as connection:
            import_rows(connection, rows, photos, user_id, report)
    except OutfitError as error:
        return JSONResponse(status_code=error.status, content={"message": error.message})
    return JSONResponse(status_code=200, content=report.as_dict())
