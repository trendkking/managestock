"""account cash flows and competition deposit fields

Revision ID: 009_competition_total_value
Revises: 008_account_snapshot_evaluation
Create Date: 2026-06-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_competition_total_value"
down_revision: Union[str, None] = "008_account_snapshot_evaluation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_cash_flows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("flow_date", sa.Date(), nullable=False),
        sa.Column("flow_type", sa.String(length=10), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_cash_flows_account_date", "account_cash_flows", ["account_id", "flow_date"])

    op.add_column(
        "competition_entries",
        sa.Column("period_deposits", sa.Numeric(18, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "competition_entries",
        sa.Column("period_withdrawals", sa.Numeric(18, 2), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("competition_entries", "period_withdrawals")
    op.drop_column("competition_entries", "period_deposits")
    op.drop_index("idx_cash_flows_account_date", table_name="account_cash_flows")
    op.drop_table("account_cash_flows")
