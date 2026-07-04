import json
from unittest.mock import MagicMock, patch

import pytest

from app.brokers.base import BrokerError
from app.brokers.kiwoom import KiwoomBrokerAdapter, KiwoomCredentials, parse_kt00015_trade_row


def test_issue_token_and_fetch_balance():
    adapter = KiwoomBrokerAdapter(use_virtual=False)
    creds = KiwoomCredentials(
        app_key="test-key",
        app_secret="test-secret",
        account_number="12345678",
    )

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {"return_code": 0, "token": "abc", "expires_dt": "20991231235959"}

    balance_response = MagicMock()
    balance_response.status_code = 200
    balance_response.headers = {"cont-yn": "N", "next-key": ""}
    balance_response.json.return_value = {
        "return_code": "0",
        "entr": "1000000",
        "prsm_dpst_aset_amt": "1500000",
        "stk_acnt_evlt_prst": [
            {
                "stk_cd": "005930",
                "stk_nm": "삼성전자",
                "rmnd_qty": "10",
                "avg_prc": "70000",
                "cur_prc": "75000",
                "pur_amt": "700000",
                "evlt_amt": "750000",
            }
        ],
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.side_effect = [token_response, balance_response]

    with patch("app.brokers.kiwoom.httpx.Client", return_value=mock_client):
        token, expires = adapter.issue_token(creds)
        balance = adapter.fetch_domestic_balance(creds, access_token=token)

    assert token == "abc"
    assert expires > 0
    assert balance.cash_balance == 1000000
    assert len(balance.holdings) == 1
    assert balance.holdings[0].stock_code == "005930"

    post_calls = mock_client.post.call_args_list
    assert post_calls[0][0][0].endswith("/oauth2/token")
    body = post_calls[0][1]["json"]
    assert body["grant_type"] == "client_credentials"
    assert post_calls[1][1]["headers"]["api-id"] == "kt00004"


def test_parse_kt00015_trade_row_buy():
    row = {
        "trde_dt": "20240115",
        "proc_tm": "093000",
        "stk_cd": "A005930",
        "stk_nm": "삼성전자",
        "trde_qty_jwa_cnt": "5",
        "trde_unit": "70000",
        "rmrk_nm": "현금매수",
        "ord_no": "12345",
    }
    trade = parse_kt00015_trade_row(row)
    assert trade is not None
    assert trade.trade_type == "buy"
    assert trade.quantity == 5
    assert trade.stock_code == "005930"
    assert trade.external_id


def test_issue_token_reports_return_msg_when_token_missing():
    adapter = KiwoomBrokerAdapter(use_virtual=False)
    creds = KiwoomCredentials(app_key="bad", app_secret="bad", account_number="12345678")

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {
        "return_code": 3,
        "return_msg": "앱키가 올바르지 않습니다",
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value = token_response

    with patch("app.brokers.kiwoom.httpx.Client", return_value=mock_client):
        try:
            adapter.issue_token(creds)
            assert False, "expected BrokerError"
        except BrokerError as exc:
            assert "앱키가 올바르지 않습니다" in str(exc)


def test_issue_token_with_environment_falls_back_to_mock():
    creds = KiwoomCredentials(app_key="k", app_secret="s", account_number="12345678")

    live_fail = MagicMock()
    live_fail.status_code = 200
    live_fail.json.return_value = {"return_code": 1, "return_msg": "live fail"}

    mock_ok = MagicMock()
    mock_ok.status_code = 200
    mock_ok.json.return_value = {
        "return_code": 0,
        "token": "mock-token",
        "expires_dt": "20991231235959",
    }

    def post_side_effect(url, **kwargs):
        if "mockapi.kiwoom.com" in url:
            return mock_ok
        return live_fail

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.side_effect = post_side_effect

    with patch("app.brokers.kiwoom.httpx.Client", return_value=mock_client):
        token, expires, use_virtual = KiwoomBrokerAdapter.issue_token_with_environment(creds)

    assert token == "mock-token"
    assert use_virtual is True
    assert expires > 0


def test_fetch_domestic_trades():
    adapter = KiwoomBrokerAdapter(use_virtual=False)
    creds = KiwoomCredentials(
        app_key="test-key",
        app_secret="test-secret",
        account_number="12345678",
    )

    trades_response = MagicMock()
    trades_response.status_code = 200
    trades_response.headers = {"cont-yn": "N", "next-key": ""}
    trades_response.json.return_value = {
        "return_code": "0",
        "trst_ovrl_trde_prps_array": [
            {
                "trde_dt": "20240115",
                "proc_tm": "093000",
                "stk_cd": "005930",
                "stk_nm": "삼성전자",
                "trde_qty_jwa_cnt": "5",
                "trde_unit": "70000",
                "rmrk_nm": "현금매수",
                "ord_no": "99",
            }
        ],
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value = trades_response

    with patch("app.brokers.kiwoom.httpx.Client", return_value=mock_client):
        trades = adapter.fetch_domestic_trades(
            creds,
            access_token="token",
            start_date="2024-01-01",
            end_date="2024-01-31",
        )

    assert len(trades) == 1
    assert trades[0].trade_type == "buy"
    body = mock_client.post.call_args[1]["json"]
    assert body["tp"] == "3"
    assert body["strt_dt"] == "20240101"
