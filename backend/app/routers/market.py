from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.market import (
    DailyPricePoint,
    StockDailyChartResponse,
    StockSearchItem,
    StockSearchResponse,
)
from app.services import market_data_service as market

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/stocks/search", response_model=StockSearchResponse)
def search_stocks(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(20, ge=1, le=50),
) -> StockSearchResponse:
    try:
        items = market.search_stocks(q, limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="종목 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc
    return StockSearchResponse(
        items=[
            StockSearchItem(code=i.code, name=i.name, market=i.market, region=i.region) for i in items
        ],
        total=len(items),
    )


@router.get("/stocks/{stock_code}/daily", response_model=StockDailyChartResponse)
def get_stock_daily_chart(
    stock_code: str,
    from_date: date | None = Query(None, alias="fromDate"),
    to_date: date | None = Query(None, alias="toDate"),
    months: int = Query(3, ge=1, le=24),
) -> StockDailyChartResponse:
    resolved = market.resolve_stock(stock_code)
    if resolved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="종목을 찾을 수 없습니다.")

    if from_date is None or to_date is None:
        from_date, to_date = market.default_chart_range(months)

    try:
        raw = market.get_daily_prices(resolved.code, from_date, to_date)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="시세 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc

    return StockDailyChartResponse(
        stock_code=resolved.code,
        stock_name=resolved.name,
        market=resolved.market,
        region=resolved.region,
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        items=[DailyPricePoint(**p) for p in raw],
    )
