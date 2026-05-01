from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from apps.api.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def _render_default(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def apply_sqlite_additive_migrations():
    """Add missing columns for existing SQLite tables.

    This is a lightweight compatibility layer for local developer databases.
    It only performs additive column migrations and does not try to rewrite or
    drop existing schema.
    """

    if not settings.DATABASE_URL.startswith("sqlite:///"):
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }

            for column in table.columns:
                if column.name in existing_columns:
                    continue

                sql_type = column.type.compile(dialect=engine.dialect)
                statement = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {sql_type}'

                if column.default is not None and getattr(column.default, "is_scalar", False):
                    statement += f" DEFAULT {_render_default(column.default.arg)}"
                elif column.nullable is False:
                    statement += " DEFAULT NULL"

                connection.exec_driver_sql(statement)
