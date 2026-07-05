from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


def utc_now() -> datetime:
    """Naive UTC timestamp for SQLite columns."""
    return datetime.now(UTC).replace(tzinfo=None)


def parse_kst_wallclock_to_utc_naive(date_yyyymmdd: str, time_hhmmss: str | None = None) -> datetime:
    """KIS/Kiwoom 체결일시(한국 시각) → DB 저장용 naive UTC."""
    d = str(date_yyyymmdd or "").strip()
    if len(d) != 8 or not d.isdigit():
        return utc_now()
    raw_t = "".join(ch for ch in str(time_hhmmss or "120000") if ch.isdigit()).zfill(6)[:6]
    local = datetime.strptime(f"{d}{raw_t}", "%Y%m%d%H%M%S").replace(tzinfo=KST)
    return local.astimezone(UTC).replace(tzinfo=None)


def utc_naive_to_kst_date(dt: datetime) -> date:
    """DB naive UTC → 한국 거래일(날짜)."""
    return dt.replace(tzinfo=UTC).astimezone(KST).date()


def kst_date_start_utc_naive(d: date) -> datetime:
    """KST 자정 → DB naive UTC."""
    local = datetime.combine(d, datetime.min.time()).replace(tzinfo=KST)
    return local.astimezone(UTC).replace(tzinfo=None)


def kst_date_end_exclusive_utc_naive(d: date) -> datetime:
    """KST 다음날 자정(미포함) → DB naive UTC."""
    local = datetime.combine(d + timedelta(days=1), datetime.min.time()).replace(tzinfo=KST)
    return local.astimezone(UTC).replace(tzinfo=None)
