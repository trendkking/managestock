"""journal rule memos table

Revision ID: 011_journal_rule_memos
Revises: 010_competition_multi_account
Create Date: 2026-07-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_journal_rule_memos"
down_revision: Union[str, None] = "010_competition_multi_account"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "journal_rule_memos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_journal_rule_memos_user_id"),
    )


def downgrade() -> None:
    op.drop_table("journal_rule_memos")
