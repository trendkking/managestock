"""holdings market type for domestic / us stocks

Revision ID: 003_holdings_market
Revises: 002_broker_credentials
Create Date: 2026-06-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_holdings_market"
down_revision: Union[str, None] = "002_broker_credentials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.add_column(
            sa.Column("market_type", sa.String(length=10), nullable=False, server_default="domestic")
        )
        batch_op.add_column(sa.Column("exchange_code", sa.String(length=10), nullable=True))
        batch_op.alter_column("stock_code", type_=sa.String(length=12), existing_type=sa.String(length=6))
        batch_op.drop_constraint("uq_holdings_account_stock", type_="unique")
        batch_op.create_unique_constraint(
            "uq_holdings_account_market_stock",
            ["account_id", "market_type", "stock_code"],
        )


def downgrade() -> None:
    with op.batch_alter_table("holdings") as batch_op:
        batch_op.drop_constraint("uq_holdings_account_market_stock", type_="unique")
        batch_op.create_unique_constraint("uq_holdings_account_stock", ["account_id", "stock_code"])
        batch_op.alter_column("stock_code", type_=sa.String(length=6), existing_type=sa.String(length=12))
        batch_op.drop_column("exchange_code")
        batch_op.drop_column("market_type")
