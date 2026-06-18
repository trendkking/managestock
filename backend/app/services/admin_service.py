from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Account, Competition, Journal, Trade, User
from app.schemas.admin import AdminStatsResponse, SignupTrendPoint
from app.utils.time import utc_now


def build_admin_stats(db: Session) -> AdminStatsResponse:
    now = utc_now()
    today = now.date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_journals = db.scalar(select(func.count()).select_from(Journal)) or 0
    total_accounts = db.scalar(select(func.count()).select_from(Account)) or 0
    total_trades = db.scalar(select(func.count()).select_from(Trade)) or 0
    total_competitions = db.scalar(select(func.count()).select_from(Competition)) or 0
    active_competitions = (
        db.scalar(select(func.count()).select_from(Competition).where(Competition.status == "active")) or 0
    )

    def count_users_since(since: date) -> int:
        return (
            db.scalar(
                select(func.count())
                .select_from(User)
                .where(func.date(User.created_at) >= since)
            )
            or 0
        )

    new_users_today = count_users_since(today)
    new_users_this_week = count_users_since(week_start)
    new_users_this_month = count_users_since(month_start)

    new_journals_today = (
        db.scalar(
            select(func.count())
            .select_from(Journal)
            .where(Journal.journal_date == today)
        )
        or 0
    )

    trend_start = today - timedelta(days=29)
    rows = db.execute(
        select(func.date(User.created_at).label("d"), func.count(User.id))
        .where(func.date(User.created_at) >= trend_start)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    ).all()
    count_by_date = {str(r[0]): r[1] for r in rows}
    signup_trend: list[SignupTrendPoint] = []
    for i in range(30):
        d = trend_start + timedelta(days=i)
        key = d.isoformat()
        signup_trend.append(SignupTrendPoint(date=key, count=count_by_date.get(key, 0)))

    return AdminStatsResponse(
        total_users=total_users,
        total_journals=total_journals,
        total_accounts=total_accounts,
        total_trades=total_trades,
        total_competitions=total_competitions,
        active_competitions=active_competitions,
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        new_users_this_month=new_users_this_month,
        new_journals_today=new_journals_today,
        signup_trend=signup_trend,
    )
