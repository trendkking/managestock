"""account broker api credentials

Revision ID: 002_broker_credentials
Revises: 001_initial_schema
Create Date: 2026-06-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_broker_credentials"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("broker_code", sa.String(length=20), nullable=False, server_default="manual"))
    op.add_column("accounts", sa.Column("account_number", sa.String(length=20), nullable=True))
    op.add_column("accounts", sa.Column("connection_mode", sa.String(length=20), nullable=False, server_default="manual"))
    op.add_column("accounts", sa.Column("sync_status", sa.String(length=20), nullable=False, server_default="manual"))
    op.add_column("accounts", sa.Column("last_synced_at", sa.DateTime(), nullable=True))
    op.add_column("accounts", sa.Column("last_sync_error", sa.Text(), nullable=True))

    op.create_table(
        "account_credentials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("app_key_encrypted", sa.Text(), nullable=False),
        sa.Column("app_secret_encrypted", sa.Text(), nullable=False),
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("extra_json", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )


def downgrade() -> None:
    op.drop_table("account_credentials")
    op.drop_column("accounts", "last_sync_error")
    op.drop_column("accounts", "last_synced_at")
    op.drop_column("accounts", "sync_status")
    op.drop_column("accounts", "connection_mode")
    op.drop_column("accounts", "account_number")
    op.drop_column("accounts", "broker_code")
