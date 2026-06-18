from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.brokers.kis import (
    KISBrokerAdapter,
    KISCredentials,
    iter_domestic_ccld_windows,
    parse_domestic_ccld_row,
    parse_period_trade_profit_row,
)


def test_parse_domestic_ccld_row_sell():
    row = {
        "cncl_yn": "N",
        "sll_buy_dvsn_cd": "01",
        "pdno": "005930",
        "prdt_name": "삼성전자",
        "tot_ccld_qty": "10",
        "avg_prvs": "71500",
        "ord_dt": "20250331",
        "ord_tmd": "093000",
        "odno": "12345",
        "rlzt_pfls": "-197200",
        "fees": "200",
        "tax": "150",
    }
    trade = parse_domestic_ccld_row(row)
    assert trade is not None
    assert trade.trade_type == "sell"
    assert trade.stock_code == "005930"
    assert trade.quantity == 10
    assert trade.realized_pnl == Decimal("-197200")
    assert trade.traded_at.strftime("%Y%m%d") == "20250331"


def test_parse_domestic_ccld_row_sell_evlu_pfls_amt2():
    row = {
        "cncl_yn": "N",
        "sll_buy_dvsn_cd": "01",
        "pdno": "005930",
        "prdt_name": "삼성전자",
        "tot_ccld_qty": "5",
        "avg_prvs": "72000",
        "ord_dt": "20250315",
        "odno": "99",
        "evlu_pfls_amt2": "12500",
        "tot_ccld_amt": "360000",
        "pchs_amt": "347500",
        "fees": "100",
        "tax": "50",
    }
    trade = parse_domestic_ccld_row(row)
    assert trade is not None
    assert trade.realized_pnl == Decimal("12500")


def test_parse_domestic_ccld_row_sell_fallback_pchs_amt():
    row = {
        "cncl_yn": "N",
        "sll_buy_dvsn_cd": "01",
        "pdno": "005930",
        "tot_ccld_qty": "2",
        "avg_prvs": "10000",
        "ord_dt": "20250110",
        "odno": "1",
        "tot_ccld_amt": "20000",
        "pchs_amt": "18000",
        "fees": "50",
        "tax": "10",
    }
    trade = parse_domestic_ccld_row(row)
    assert trade is not None
    assert trade.realized_pnl == Decimal("1940")


def test_iter_domestic_ccld_windows_splits_at_three_month_boundary():
    today = date.today()
    cutoff = today - timedelta(days=92)
    start = cutoff - timedelta(days=30)
    windows = iter_domestic_ccld_windows(start, today)
    assert len(windows) >= 2
    assert windows[-1][2] == "inner"
    assert any(w[2] == "before" for w in windows)


def test_parse_period_trade_profit_row_sell():
    row = {
        "trad_dt": "20260527",
        "pdno": "233740",
        "prdt_name": "KODEX 레버리지",
        "sll_qty": "500",
        "sll_pric": "15630",
        "sll_amt": "7815000",
        "rlzt_pfls": "-140328",
        "fee": "1000",
        "tl_tax": "500",
    }
    trade = parse_period_trade_profit_row(row)
    assert trade is not None
    assert trade.trade_type == "sell"
    assert trade.realized_pnl == Decimal("-140328")
    assert trade.quantity == 500


def test_domestic_ccld_tr_id_for_period():
    adapter = KISBrokerAdapter(use_virtual=False)
    assert adapter.domestic_ccld_tr_id_for("inner") == "TTTC8001R"
    assert adapter.domestic_ccld_tr_id_for("before") == "CTSC9115R"
    assert adapter.period_trade_profit_tr_id == "TTTC8715R"


def test_parse_domestic_ccld_row_skips_cancelled():
    row = {"cncl_yn": "Y", "sll_buy_dvsn_cd": "01", "tot_ccld_qty": "1", "pdno": "005930"}
    assert parse_domestic_ccld_row(row) is None


def test_fetch_domestic_trades_pagination():
    adapter = KISBrokerAdapter(use_virtual=False)
    creds = KISCredentials(
        app_key="k",
        app_secret="s",
        account_number="12345678",
        account_product_code="01",
    )
    profit_page = MagicMock()
    profit_page.status_code = 200
    profit_page.headers = {"tr_cont": ""}
    profit_page.json.return_value = {
        "rt_cd": "0",
        "output1": [
            {
                "trad_dt": "20250102",
                "pdno": "005930",
                "prdt_name": "삼성전자",
                "sll_qty": "1",
                "sll_pric": "70000",
                "sll_amt": "70000",
                "rlzt_pfls": "-1000",
                "fee": "10",
                "tl_tax": "5",
            }
        ],
    }
    ccld_page1 = MagicMock()
    ccld_page1.status_code = 200
    ccld_page1.headers = {"tr_cont": "M"}
    ccld_page1.json.return_value = {
        "rt_cd": "0",
        "ctx_area_fk100": "fk",
        "ctx_area_nk100": "nk",
        "output1": [
            {
                "cncl_yn": "N",
                "sll_buy_dvsn_cd": "02",
                "pdno": "005930",
                "prdt_name": "삼성전자",
                "tot_ccld_qty": "1",
                "avg_prvs": "70000",
                "ord_dt": "20250102",
                "odno": "1",
            }
        ],
    }
    ccld_page2 = MagicMock()
    ccld_page2.status_code = 200
    ccld_page2.headers = {"tr_cont": ""}
    ccld_page2.json.return_value = {"rt_cd": "0", "output1": []}

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.side_effect = [profit_page, ccld_page1, ccld_page2]

    with patch("app.brokers.kis.httpx.Client", return_value=mock_client):
        trades = adapter.fetch_domestic_trades(creds, access_token="tok", days_back=30)

    assert len(trades) == 2
    sell = next(t for t in trades if t.trade_type == "sell")
    assert sell.stock_name == "삼성전자"
    assert sell.realized_pnl == Decimal("-1000")
    assert mock_client.get.call_count == 3
    profit_call = mock_client.get.call_args_list[0]
    assert "period-trade-profit" in profit_call.args[0]
    assert profit_call.kwargs["headers"]["tr_id"] == "TTTC8715R"
