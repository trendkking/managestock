from app.brokers.base import BrokerError
from app.brokers.kis import KISBrokerAdapter
from app.brokers.kiwoom import KiwoomBrokerAdapter
from app.brokers.sync_config import parse_extra

_ADAPTERS = {
    "kis": KISBrokerAdapter,
    "kiwoom": KiwoomBrokerAdapter,
}


def get_broker_adapter(broker_code: str, *, extra_json_raw: str | None = None):
    factory = _ADAPTERS.get(broker_code)
    if factory is None:
        raise BrokerError(f"지원하지 않는 증권사 코드입니다: {broker_code}")
    if broker_code == "kiwoom":
        extra = parse_extra(extra_json_raw)
        if extra.get("kiwoomUseVirtual") is not None:
            return KiwoomBrokerAdapter(use_virtual=bool(extra["kiwoomUseVirtual"]))
    return factory()


def is_api_broker(broker_code: str) -> bool:
    return broker_code in _ADAPTERS
