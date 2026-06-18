from dataclasses import dataclass


@dataclass(frozen=True)
class SupportedMarkets:
    domestic: bool
    us: tuple[str, ...]


@dataclass(frozen=True)
class BrokerCatalogEntry:
    code: str
    name: str
    api_connect_available: bool
    supported_markets: SupportedMarkets


BROKER_CATALOG: tuple[BrokerCatalogEntry, ...] = (
    BrokerCatalogEntry(
        code="kis",
        name="한국투자증권",
        api_connect_available=True,
        supported_markets=SupportedMarkets(domestic=True, us=("NASD", "NYSE", "AMEX")),
    ),
    BrokerCatalogEntry(
        code="kiwoom",
        name="키움증권",
        api_connect_available=False,
        supported_markets=SupportedMarkets(domestic=True, us=()),
    ),
    BrokerCatalogEntry(
        code="ls",
        name="LS증권",
        api_connect_available=False,
        supported_markets=SupportedMarkets(domestic=True, us=()),
    ),
    BrokerCatalogEntry(
        code="mirae",
        name="미래에셋증권",
        api_connect_available=False,
        supported_markets=SupportedMarkets(domestic=True, us=("NASD", "NYSE", "AMEX")),
    ),
)


def get_catalog_entry(broker_code: str) -> BrokerCatalogEntry | None:
    for entry in BROKER_CATALOG:
        if entry.code == broker_code:
            return entry
    return None
