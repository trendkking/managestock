from pydantic import Field, field_validator, model_validator

from app.brokers.kis import US_EXCHANGE_CODES
from app.schemas.base import CamelModel


class BrokerFieldSchema(CamelModel):
    name: str
    label: str
    type: str = "text"
    required: bool = True
    placeholder: str | None = None
    max_length: int | None = None


class SupportedMarketsSchema(CamelModel):
    domestic: bool = True
    us: list[str] = Field(default_factory=list)


class BrokerOption(CamelModel):
    code: str
    name: str
    connection_mode: str = "api"
    api_connect_available: bool = True
    supported_markets: SupportedMarketsSchema = Field(default_factory=SupportedMarketsSchema)
    fields: list[BrokerFieldSchema]


class BrokerListResponse(CamelModel):
    items: list[BrokerOption]


class KiwoomServerIpResponse(CamelModel):
    public_ip: str | None = None
    register_url: str
    instructions: str


class KisConnectivityTarget(CamelModel):
    environment: str
    host: str
    port: int
    tcp_reachable: bool
    error: str | None = None


class KisConnectivityResponse(CamelModel):
    items: list[KisConnectivityTarget]
    instructions: str


class AccountConnectRequest(CamelModel):
    name: str = Field(min_length=1, max_length=50)
    broker_code: str = Field(min_length=1, max_length=20)
    account_number: str = Field(min_length=8, max_length=12)
    account_product_code: str = Field(default="01", min_length=2, max_length=2)
    app_key: str = Field(min_length=1)
    app_secret: str = Field(min_length=1)
    description: str | None = None
    sync_domestic: bool = True
    sync_us: list[str] = Field(default_factory=list)

    @field_validator("sync_us")
    @classmethod
    def normalize_sync_us(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for item in value:
            code = item.strip().upper()
            if code in US_EXCHANGE_CODES and code not in normalized:
                normalized.append(code)
        return normalized

    @model_validator(mode="after")
    def validate_sync_scope(self) -> "AccountConnectRequest":
        if not self.sync_domestic and not self.sync_us:
            raise ValueError("국내 주식 또는 미국 주식 중 최소 하나를 선택해주세요.")
        return self

    @field_validator("account_number")
    @classmethod
    def normalize_account_number(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) not in (8, 10):
            raise ValueError("계좌번호는 8자리 또는 10자리(종합+상품코드) 숫자여야 합니다.")
        return digits

    @field_validator("account_product_code")
    @classmethod
    def normalize_product_code(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        return (digits or "01").zfill(2)[:2]

    @model_validator(mode="after")
    def split_combined_account_number(self) -> "AccountConnectRequest":
        if len(self.account_number) == 10:
            self.account_product_code = self.account_number[8:]
            self.account_number = self.account_number[:8]
        return self
