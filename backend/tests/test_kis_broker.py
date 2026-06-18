import json
from unittest.mock import MagicMock, patch

import pytest

from app.brokers.kis import KISBrokerAdapter, KISCredentials


def test_issue_token_uses_token_p_endpoint():
    adapter = KISBrokerAdapter(use_virtual=False)
    assert adapter.token_path == "/oauth2/tokenP"

    creds = KISCredentials(
        app_key="test-key",
        app_secret="test-secret",
        account_number="12345678",
        account_product_code="01",
    )

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {"access_token": "abc", "expires_in": 86400}

    balance_response = MagicMock()
    balance_response.status_code = 200
    balance_response.headers = {"tr_cont": ""}
    balance_response.json.return_value = {
        "rt_cd": "0",
        "output1": [],
        "output2": [{"dnca_tot_amt": "1000000", "tot_evlu_amt": "1000000"}],
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value = token_response
    mock_client.get.return_value = balance_response

    with patch("app.brokers.kis.httpx.Client", return_value=mock_client):
        token, expires = adapter.issue_token(creds)
        balance = adapter.fetch_balance(creds, access_token=token)

    assert token == "abc"
    assert expires == 86400
    assert balance.cash_balance == 1000000

    post_args = mock_client.post.call_args
    assert post_args[0][0].endswith("/oauth2/tokenP")
    body = json.loads(post_args[1]["content"])
    assert body["grant_type"] == "client_credentials"

    get_kwargs = mock_client.get.call_args[1]
    assert get_kwargs["params"]["INQR_DVSN"] == "01"
    assert get_kwargs["params"]["PRCS_DVSN"] == "00"


def test_fetch_us_balance_converts_usd_to_krw():
    adapter = KISBrokerAdapter(use_virtual=False)
    creds = KISCredentials(
        app_key="test-key",
        app_secret="test-secret",
        account_number="12345678",
        account_product_code="01",
    )
    balance_response = MagicMock()
    balance_response.status_code = 200
    balance_response.headers = {"tr_cont": ""}
    balance_response.json.return_value = {
        "rt_cd": "0",
        "output1": [
            {
                "ovrs_pdno": "AAPL",
                "ovrs_item_name": "APPLE INC",
                "ovrs_cblc_qty": "10",
                "pchs_avg_pric": "150.00",
                "now_pric2": "200.00",
                "bass_exrt": "1350.50",
                "ovrs_excg_cd": "NASD",
            }
        ],
        "output2": [
            {
                "crcy_cd": "USD",
                "frcr_dncl_amt_2": "1000.00",
                "tot_evlu_amt": "3000.00",
                "frst_bltn_exrt": "1350.50",
            }
        ],
    }
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.get.return_value = balance_response

    with patch("app.brokers.kis.httpx.Client", return_value=mock_client):
        balance = adapter.fetch_us_balance(creds, access_token="tok", exchange="NASD")

    assert balance.usd_krw_rate == 1350.50
    assert len(balance.holdings) == 1
    h = balance.holdings[0]
    assert h.avg_price == 150.00
    assert h.current_price == 200.00
    assert balance.cash_balance == 1350500.00  # 1000 USD * rate → KRW (계좌 잔고)


def test_fx_rate_from_output2_uses_frst_bltn_exrt():
    from app.brokers.kis import _fx_rate_from_output2
    from decimal import Decimal

    rate = _fx_rate_from_output2(
        [{"crcy_cd": "USD", "frst_bltn_exrt": "1370.10"}, {"crcy_cd": "KRW", "frst_bltn_exrt": "1"}]
    )
    assert rate == Decimal("1370.10")
