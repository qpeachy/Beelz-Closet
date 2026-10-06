from uuid import UUID

from fastapi.testclient import TestClient

from api_matching.main import app
from api_matching.outfits import OutfitError, OutfitIn, create_outfits, parse_user

HAUT = "11111111-1111-4111-8111-111111111111"
BAS = "22222222-2222-4222-8222-222222222222"
SHOES = "33333333-3333-4333-8333-333333333333"


class _Rows:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows

    def fetchone(self) -> dict[str, object] | None:
        if not self._rows:
            return None
        return self._rows[0]

    def fetchall(self) -> list[dict[str, object]]:
        return self._rows


class FakeConnection:
    def __init__(self, items: list[dict[str, object]]) -> None:
        self._items = items
        self.inserted: list[tuple[object, ...]] = []

    def execute(self, sql: str, params: tuple[object, ...] | None = None) -> _Rows:
        bound = params or ()
        if "FROM situations" in sql:
            return _Rows([{"id": "sit"}] if bound[0] == "travail" else [])
        if "FROM moods" in sql:
            return _Rows([{"id": "mood"}] if bound[0] == "en forme" else [])
        if "FROM weather_conditions" in sql:
            return _Rows([{"id": "weather"}] if bound[0] == "pluie" else [])
        if "FROM categories" in sql:
            return _Rows(
                [{"name": "haut"}, {"name": "bas"}, {"name": "chaussures"}]
            )
        if "FROM items" in sql:
            return _Rows(self._items)
        if "INSERT INTO outfit_recommendations" in sql:
            self.inserted.append(bound)
            return _Rows([{"id": f"outfit-{len(self.inserted)}"}])
        raise AssertionError(sql)


def _piece(item_id: str, category: str) -> dict[str, object]:
    return {
        "id": item_id,
        "url": f"/files/{item_id}.jpg",
        "category": category,
        "slot_type": "single",
        "is_required": True,
        "temperature": None,
        "situation": "travail",
        "mood": "en forme",
        "weather": None,
    }


def test_parse_user_falls_back_to_the_seed() -> None:
    assert parse_user(None) == "a0000000-0000-4000-8000-000000000001"


def test_parse_user_rejects_a_bad_header() -> None:
    try:
        parse_user("nope")
    except OutfitError as error:
        assert error.status == 400
    else:
        raise AssertionError("expected OutfitError")


def test_create_persists_the_chosen_item_ids() -> None:
    connection = FakeConnection(
        [_piece(HAUT, "haut"), _piece(BAS, "bas"), _piece(SHOES, "chaussures")]
    )
    payload = create_outfits(
        connection,
        "a0000000-0000-4000-8000-000000000001",
        OutfitIn(situation="travail", mood="en forme"),
    )
    outfits = payload["outfits"]
    assert isinstance(outfits, list)
    first = outfits[0]
    assert isinstance(first, dict)
    assert first["coherenceScore"] is None
    assert [item["id"] for item in first["items"]] == [HAUT, BAS, SHOES]
    stored = connection.inserted[0][2]
    assert stored == [UUID(HAUT), UUID(BAS), UUID(SHOES)]


def test_unknown_situation_is_rejected() -> None:
    connection = FakeConnection([])
    try:
        create_outfits(
            connection,
            "a0000000-0000-4000-8000-000000000001",
            OutfitIn(situation="mariage", mood="en forme"),
        )
    except OutfitError as error:
        assert error.status == 400
        assert connection.inserted == []
    else:
        raise AssertionError("expected OutfitError")


def test_missing_slot_is_not_persisted() -> None:
    connection = FakeConnection([_piece(BAS, "bas"), _piece(SHOES, "chaussures")])
    try:
        create_outfits(
            connection,
            "a0000000-0000-4000-8000-000000000001",
            OutfitIn(situation="travail", mood="en forme"),
        )
    except OutfitError as error:
        assert error.status == 422
        assert error.missing == ["haut"]
        assert connection.inserted == []
    else:
        raise AssertionError("expected OutfitError")


def test_database_down_returns_message_not_detail(monkeypatch) -> None:
    def boom() -> None:
        raise OutfitError(503, "base indisponible")

    monkeypatch.setattr("api_matching.outfits.open_connection", boom)
    response = TestClient(app).post(
        "/outfits",
        json={"situation": "travail", "mood": "en forme"},
    )
    assert response.status_code == 503
    assert response.json() == {"message": "base indisponible"}
