"""initial schema - 12 tables

Revision ID: 001
Revises:
Create Date: 2026-06-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nickname", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="user"),
        sa.Column("show_nickname_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nickname"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("broker", sa.String(length=50), nullable=False),
        sa.Column("initial_capital", sa.Numeric(18, 2), nullable=False),
        sa.Column("cash_balance", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "holdings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(length=6), nullable=False),
        sa.Column("stock_name", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_price", sa.Numeric(18, 2), nullable=False),
        sa.Column("current_price", sa.Numeric(18, 2), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "stock_code", name="uq_holdings_account_stock"),
    )
    op.create_index("idx_holdings_account_id", "holdings", ["account_id"])

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(length=6), nullable=False),
        sa.Column("stock_name", sa.String(length=100), nullable=False),
        sa.Column("trade_type", sa.String(length=4), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(18, 2), nullable=False),
        sa.Column("fee", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("tax", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("realized_pnl", sa.Numeric(18, 2), nullable=True),
        sa.Column("traded_at", sa.DateTime(), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_trades_account_id", "trades", ["account_id"])
    op.create_index("idx_trades_traded_at", "trades", ["traded_at"])
    op.create_index("idx_trades_stock_code", "trades", ["stock_code"])
    op.create_index("idx_trades_account_traded", "trades", ["account_id", "traded_at"])

    op.create_table(
        "account_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("total_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("return_rate", sa.Numeric(10, 4), nullable=False),
        sa.Column("cash_balance", sa.Numeric(18, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "snapshot_date", name="uq_snapshots_account_date"),
    )
    op.create_index("idx_snapshots_account_date", "account_snapshots", ["account_id", "snapshot_date"])

    op.create_table(
        "journals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("journal_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("reflection", sa.Text(), nullable=True),
        sa.Column("emotion", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_journals_user_id", "journals", ["user_id"])
    op.create_index("idx_journals_journal_date", "journals", ["journal_date"])
    op.create_index("idx_journals_account_id", "journals", ["account_id"])

    op.create_table(
        "journal_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("journal_id", sa.Integer(), nullable=False),
        sa.Column("tag", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(["journal_id"], ["journals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_journal_tags_journal_id", "journal_tags", ["journal_id"])
    op.create_index("idx_journal_tags_tag", "journal_tags", ["tag"])

    op.create_table(
        "journal_stocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("journal_id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(length=6), nullable=False),
        sa.Column("stock_name", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["journal_id"], ["journals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_journal_stocks_journal_id", "journal_stocks", ["journal_id"])
    op.create_index("idx_journal_stocks_code", "journal_stocks", ["stock_code"])

    op.create_table(
        "journal_trades",
        sa.Column("journal_id", sa.Integer(), nullable=False),
        sa.Column("trade_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["journal_id"], ["journals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trade_id"], ["trades.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("journal_id", "trade_id"),
    )

    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="upcoming"),
        sa.Column("min_initial_capital", sa.Numeric(18, 2), nullable=True),
        sa.Column("max_participants", sa.Integer(), nullable=True),
        sa.Column("rules", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_competitions_status", "competitions", ["status"])
    op.create_index("idx_competitions_dates", "competitions", ["start_date", "end_date"])

    op.create_table(
        "competition_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("entry_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("current_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("return_rate", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("final_rank", sa.Integer(), nullable=True),
        sa.Column("final_return_rate", sa.Numeric(10, 4), nullable=True),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("competition_id", "user_id", name="uq_entries_competition_user"),
        sa.UniqueConstraint("competition_id", "account_id", name="uq_entries_competition_account"),
    )
    op.create_index("idx_entries_competition_return", "competition_entries", ["competition_id", "return_rate"])

    op.create_table(
        "competition_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("competition_id", sa.Integer(), nullable=False),
        sa.Column("entry_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("return_rate", sa.Numeric(10, 4), nullable=False),
        sa.Column("total_value", sa.Numeric(18, 2), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["entry_id"], ["competition_entries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entry_id", "snapshot_date", name="uq_comp_snapshots_entry_date"),
    )
    op.create_index("idx_comp_snap_comp_date", "competition_snapshots", ["competition_id", "snapshot_date"])


def downgrade() -> None:
    op.drop_table("competition_snapshots")
    op.drop_table("competition_entries")
    op.drop_table("competitions")
    op.drop_table("journal_trades")
    op.drop_table("journal_stocks")
    op.drop_table("journal_tags")
    op.drop_table("journals")
    op.drop_table("account_snapshots")
    op.drop_table("trades")
    op.drop_table("holdings")
    op.drop_table("accounts")
    op.drop_table("users")
