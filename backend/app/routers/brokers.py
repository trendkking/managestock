from fastapi import APIRouter, Depends

from app.brokers.catalog import BROKER_CATALOG
from app.dependencies import get_current_user
from app.models import User
from app.schemas.broker import BrokerFieldSchema, BrokerListResponse, BrokerOption, SupportedMarketsSchema

router = APIRouter(prefix="/brokers", tags=["brokers"])

_KIS_FIELDS = [
    BrokerFieldSchema(
        name="accountNumber",
        label="계좌번호 (8자리)",
        placeholder="12345678",
        max_length=8,
    ),
    BrokerFieldSchema(
        name="accountProductCode",
        label="계좌상품코드",
        placeholder="01",
        max_length=2,
    ),
    BrokerFieldSchema(name="appKey", label="APP KEY"),
    BrokerFieldSchema(name="appSecret", label="APP SECRET", type="password"),
]


@router.get("", response_model=BrokerListResponse)
def list_brokers(_: User = Depends(get_current_user)) -> BrokerListResponse:
    items: list[BrokerOption] = []
    for entry in BROKER_CATALOG:
        fields = _KIS_FIELDS if entry.code == "kis" else []
        items.append(
            BrokerOption(
                code=entry.code,
                name=entry.name,
                connection_mode="api",
                api_connect_available=entry.api_connect_available,
                supported_markets=SupportedMarketsSchema(
                    domestic=entry.supported_markets.domestic,
                    us=list(entry.supported_markets.us),
                ),
                fields=fields,
            )
        )
    return BrokerListResponse(items=items)
