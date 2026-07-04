from fastapi import APIRouter, Depends

from app.brokers.kiwoom import fetch_server_public_ip
from app.brokers.catalog import BROKER_CATALOG
from app.dependencies import get_current_user
from app.models import User
from app.schemas.broker import BrokerFieldSchema, BrokerListResponse, BrokerOption, KiwoomServerIpResponse, SupportedMarketsSchema

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

_API_CONNECT_FIELDS: dict[str, list[BrokerFieldSchema]] = {
    "kis": _KIS_FIELDS,
    "kiwoom": [
        BrokerFieldSchema(
            name="accountNumber",
            label="계좌번호",
            placeholder="12345678",
            max_length=10,
        ),
        BrokerFieldSchema(name="appKey", label="APP KEY"),
        BrokerFieldSchema(name="appSecret", label="APP SECRET", type="password"),
    ],
}


@router.get("", response_model=BrokerListResponse)
def list_brokers(_: User = Depends(get_current_user)) -> BrokerListResponse:
    items: list[BrokerOption] = []
    for entry in BROKER_CATALOG:
        fields = _API_CONNECT_FIELDS.get(entry.code, [])
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


@router.get("/kiwoom/server-ip", response_model=KiwoomServerIpResponse)
def kiwoom_server_ip(_: User = Depends(get_current_user)) -> KiwoomServerIpResponse:
    ip = fetch_server_public_ip()
    return KiwoomServerIpResponse(
        public_ip=ip,
        register_url="https://openapi.kiwoom.com",
        instructions=(
            "키움 실전 API 연동 시 openapi.kiwoom.com → API 사용신청 → 계좌 App Key 관리에서 "
            "아래 공인 IP를 등록해주세요. (모의투자 키는 IP 등록이 필요 없습니다.)"
        ),
    )
