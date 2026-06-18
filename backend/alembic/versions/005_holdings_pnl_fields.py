"""holdings broker pnl fields

Revision ID: 005_holdings_pnl
Revises: 004_holdings_broker
Create Date: 2026-06-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_holdings_pnl"
down_revision: Union[str, None] = "004_holdings_broker"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.add_column(sa.Column("profit_loss", sa.Numeric(18, 4), nullable=True))
        batch_op.add_column(sa.Column("return_rate", sa.Numeric(12, 4), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.drop_column("return_rate")
        batch_op.drop_column("profit_loss")
