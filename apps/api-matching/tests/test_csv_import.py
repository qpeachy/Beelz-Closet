from pathlib import Path

from api_matching.csv_import import import_rows, parse_csv


class _Rows:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row

    def fetchone(self) -> dict[str, object] | None:
        return self._row


class FakeConnection:
    def __init__(self) -> None:
        self.names: dict[tuple[str, str], str] = {}
        self.keys: set[tuple[str, str, str]] = set()
        self.items = 0

    def execute(self, sql: str, params: tuple[object, ...] = ()) -> _Rows:
        if "FROM item_import_keys" in sql:
            key = (str(params[0]), str(params[1]), str(params[2]))
            if key in self.keys:
                return _Rows({"item_id": "existing"})
            return _Rows(None)
        if "INSERT INTO item_import_keys" in sql:
            self.keys.add((str(params[0]), str(params[1]), str(params[2])))
            return _Rows(None)
        if "INSERT INTO items" in sql:
            self.items += 1
            return _Rows({"id": f"item-{self.items}"})
        if "INSERT INTO metrics" in sql:
            return _Rows(None)
        if "FROM categories" in sql or "INSERT INTO categories" in sql:
            return _Rows({"id": self._name("categories", params)})
        if "FROM subcategories" in sql or "INSERT INTO subcategories" in sql:
            return _Rows({"id": self._name("subcategories", params)})
        if "FROM materials" in sql or "INSERT INTO materials" in sql:
            return _Rows({"id": self._name("materials", params)})
        if "FROM situations" in sql or "INSERT INTO situations" in sql:
            return _Rows({"id": self._name("situations", params)})
        if "FROM moods" in sql or "INSERT INTO moods" in sql:
            return _Rows({"id": self._name("moods", params)})
        if "FROM weather_conditions" in sql or "INSERT INTO weather_conditions" in sql:
            return _Rows({"id": self._name("weather", params)})
        raise AssertionError(sql)

    def _name(self, table: str, params: tuple[object, ...]) -> str:
        label = str(params[-1])
        key = (table, label)
        if key not in self.names:
            self.names[key] = f"{table}-{len(self.names) + 1}"
        return self.names[key]


HEADER = "filename,category,recorded_at,situation,mood,weather_condition,temperature"


def _photo(folder: Path, name: str = "a.jpg") -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(b"jpeg-bytes")


def test_missing_file_rejects_the_line_and_keeps_the_valid_one(tmp_path: Path) -> None:
    photos = tmp_path / "photos"
    _photo(photos, "ok.jpg")
    text = (
        f"{HEADER}\n"
        "ok.jpg,haut,2026-06-15,travail,en forme,,\n"
        "missing.jpg,haut,2026-06-15,travail,en forme,,\n"
    )
    rows, report = parse_csv(text)
    import_rows(FakeConnection(), rows, photos, "user", report, tmp_path / "storage")
    assert report.imported == 1
    assert report.rejected == 1
    assert report.weather_missing == 1
    assert report.errors is not None
    assert report.errors[0]["line"] == 3


def test_second_import_of_the_same_file_is_a_duplicate(tmp_path: Path) -> None:
    photos = tmp_path / "photos"
    _photo(photos, "ok.jpg")
    text = f"{HEADER}\nok.jpg,manteau,2026-06-15,travail,en forme,pluie,18\n"
    rows, report = parse_csv(text)
    connection = FakeConnection()
    import_rows(connection, rows, photos, "user", report, tmp_path / "storage")
    again, second = parse_csv(text)
    import_rows(connection, again, photos, "user", second, tmp_path / "storage")
    assert report.imported == 1
    assert ("categories", "manteau") in connection.names
    assert second.duplicates == 1
    assert second.imported == 0
    assert connection.items == 1


def test_bad_date_is_rejected_before_insert() -> None:
    rows, report = parse_csv(f"{HEADER}\nok.jpg,haut,15/06/2026,travail,en forme,,\n")
    assert rows == []
    assert report.rejected == 1


def test_missing_column_fails_the_file() -> None:
    rows, report = parse_csv("filename,category\na.jpg,haut\n")
    assert rows == []
    assert report.errors is not None
    assert report.errors[0]["line"] == 1
