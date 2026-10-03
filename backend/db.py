from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from config import get_settings

settings = get_settings()

if settings.database_url.startswith("sqlite:///"):
    Path(settings.database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

# check_same_thread=False: background tasks run in a different thread
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
