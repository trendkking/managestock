"""account snapshot evaluation amount

Revision ID: 008_account_snapshot_evaluation
Revises: 007_journal_entry_side
Create Date: 2026-06-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_account_snapshot_evaluation"
down_revision: Union[str, None] = "007_journal_entry_side"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "account_snapshots",
        sa.Column("evaluation_amount", sa.Numeric(18, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("account_snapshots", "evaluation_amount")
