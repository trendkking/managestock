from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        from_attributes=True,
        ser_json_timedelta="iso8601",
    )


def to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def dt_iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.isoformat().replace("+00:00", "Z")


def date_iso(d: date | None) -> str:
    if d is None:
        return ""
    return d.isoformat()
