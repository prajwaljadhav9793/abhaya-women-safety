import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import configured_database_url, normalize_database_url


def test_postgres_urls_use_psycopg_driver():
    assert normalize_database_url("postgres://user:pass@host/db") == (
        "postgresql+psycopg://user:pass@host/db"
    )
    assert normalize_database_url("postgresql://user:pass@host/db") == (
        "postgresql+psycopg://user:pass@host/db"
    )


def test_sqlite_url_is_unchanged():
    assert normalize_database_url("sqlite:///abhaya.db") == "sqlite:///abhaya.db"


def test_default_database_remains_local_sqlite():
    database_url = configured_database_url({})
    assert database_url.startswith("sqlite:///")
    assert database_url.endswith("/backend/abhaya.db")


def test_mysql_url_is_unchanged():
    url = "mysql+pymysql://user:pass@host/db"
    assert configured_database_url({"DATABASE_URL": url}) == url
