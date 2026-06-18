"""journal entries table

Revision ID: 006_journal_entries
Revises: 005_holdings_pnl
Create Date: 2026-06-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_journal_entries"
down_revision: Union[str, None] = "005_holdings_pnl"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("journal_date", sa.Date(), nullable=False),
        sa.Column("stock_code", sa.String(length=12), nullable=False),
        sa.Column("stock_name", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_journal_entries_user_id", "journal_entries", ["user_id"])
    op.create_index("idx_journal_entries_journal_date", "journal_entries", ["journal_date"])
    op.create_index("idx_journal_entries_stock_code", "journal_entries", ["stock_code"])


def downgrade() -> None:
    op.drop_index("idx_journal_entries_stock_code", table_name="journal_entries")
    op.drop_index("idx_journal_entries_journal_date", table_name="journal_entries")
    op.drop_index("idx_journal_entries_user_id", table_name="journal_entries")
    op.drop_table("journal_entries")
