from datetime import UTC, datetime


def utc_now() -> datetime:
    """Naive UTC timestamp for SQLite columns."""
    return datetime.now(UTC).replace(tzinfo=None)
