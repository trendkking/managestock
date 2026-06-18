"""holdings broker detail fields

Revision ID: 004_holdings_broker
Revises: 003_holdings_market
Create Date: 2026-06-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_holdings_broker"
down_revision: Union[str, None] = "003_holdings_market"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.add_column(sa.Column("orderable_quantity", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("purchase_amount", sa.Numeric(18, 2), nullable=True))
        batch_op.add_column(sa.Column("evaluation_amount", sa.Numeric(18, 2), nullable=True))
        batch_op.add_column(sa.Column("currency", sa.String(length=3), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.drop_column("currency")
        batch_op.drop_column("evaluation_amount")
        batch_op.drop_column("purchase_amount")
        batch_op.drop_column("orderable_quantity")
