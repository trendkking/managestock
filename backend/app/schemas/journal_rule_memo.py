from pydantic import Field

from app.schemas.base import CamelModel, dt_iso


class JournalRuleMemoResponse(CamelModel):
    content: str
    updated_at: str

    @classmethod
    def from_orm(cls, memo) -> "JournalRuleMemoResponse":
        return cls(content=memo.content or "", updated_at=dt_iso(memo.updated_at))


class JournalRuleMemoWriteRequest(CamelModel):
    content: str = Field(default="", max_length=20000)
