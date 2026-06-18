from pydantic import Field

from app.schemas.base import CamelModel


class StockSearchItem(CamelModel):
    code: str
    name: str
    market: str
    region: str = "KR"


class StockSearchResponse(CamelModel):
    items: list[StockSearchItem]
    total: int


class DailyPricePoint(CamelModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int = 0


class StockDailyChartResponse(CamelModel):
    stock_code: str
    stock_name: str
    market: str
    region: str = "KR"
    from_date: str
    to_date: str
    source: str = Field(default="FinanceDataReader (KRX·ETF·US)", description="증권사 API와 무관한 공개 시세")
    items: list[DailyPricePoint]
