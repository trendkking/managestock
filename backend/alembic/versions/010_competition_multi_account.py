"""Allow multiple accounts per user in a competition."""

from typing import Sequence, Union

from alembic import op

revision: str = "010_competition_multi_account"
down_revision: Union[str, None] = "009_competition_total_value"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("competition_entries") as batch_op:
        batch_op.drop_constraint("uq_entries_competition_user", type_="unique")


def downgrade() -> None:
    with op.batch_alter_table("competition_entries") as batch_op:
        batch_op.create_unique_constraint(
            "uq_entries_competition_user",
            ["competition_id", "user_id"],
        )
