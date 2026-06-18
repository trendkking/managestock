"""journal entry buy/sell side

Revision ID: 007_journal_entry_side
Revises: 006_journal_entries
Create Date: 2026-06-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_journal_entry_side"
down_revision: Union[str, None] = "006_journal_entries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "journal_entries",
        sa.Column("side", sa.String(length=4), nullable=False, server_default="buy"),
    )


def downgrade() -> None:
    op.drop_column("journal_entries", "side")
