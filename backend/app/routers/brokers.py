from fastapi import APIRouter, Depends

from app.brokers.kiwoom import fetch_server_public_ip
from app.brokers.kis import kis_host_port, probe_kis_tcp
from app.brokers.catalog import BROKER_CATALOG
from app.dependencies import get_current_user
from app.models import User
from app.schemas.broker import (
    BrokerFieldSchema,
    BrokerListResponse,
    BrokerOption,
    KisConnectivityResponse,
    KisConnectivityTarget,
    KiwoomServerIpResponse,
    SupportedMarketsSchema,
)

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


@router.get("/kis/connectivity", response_model=KisConnectivityResponse)
def kis_connectivity(_: User = Depends(get_current_user)) -> KisConnectivityResponse:
    items: list[KisConnectivityTarget] = []
    for use_virtual, label in ((False, "실전투자"), (True, "모의투자(VTS)")):
        host, port = kis_host_port(use_virtual)
        ok, err = probe_kis_tcp(use_virtual)
        items.append(
            KisConnectivityTarget(
                environment=label,
                host=host,
                port=port,
                tcp_reachable=ok,
                error=err,
            )
        )
    return KisConnectivityResponse(
        items=items,
        instructions=(
            "bullslong 서버에서 한국투자증권 API로 나가는 연결 상태입니다. "
            "tcpReachable이 false이면 EC2 보안그룹 outbound 또는 증권사 방화벽 문제일 수 있습니다. "
            "App Key가 모의투자용이면 모의투자(VTS) 환경이 연결되어야 합니다."
        ),
    )
