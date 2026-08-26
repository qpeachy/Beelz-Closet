from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api_matching.main import app


def test_health_returns_503_without_database_url(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 503


def test_health_returns_200_when_select_succeeds(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgres://beelz:beelz@localhost:5432/beelz_closet")
    mock_connection = MagicMock()
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = mock_connection
    mock_cm.__exit__.return_value = None
    with patch("api_matching.main._connect", return_value=mock_cm):
        client = TestClient(app)
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "up"}
    mock_connection.execute.assert_called_once_with("SELECT 1")


def test_health_returns_503_when_connect_fails(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgres://beelz:beelz@localhost:5432/beelz_closet")
    with patch("api_matching.main._connect", side_effect=OSError("refused")):
        client = TestClient(app)
        response = client.get("/health")
    assert response.status_code == 503
