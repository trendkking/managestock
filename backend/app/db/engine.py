from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


def create_app_engine(database_url: str, sqlite_wal: bool = True) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args, echo=False)
