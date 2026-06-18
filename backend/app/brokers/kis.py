import json
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

import httpx

from app.brokers.base import BrokerBalance, BrokerError, BrokerHolding, BrokerTrade
from app.config import settings
from app.utils.time import utc_now

US_EXCHANGE_CODES = frozenset({"NASD", "NYSE", "AMEX"})
US_EXCHANGE_LABELS = {
    "NASD": "나스닥",
    "NYSE": "뉴욕",
    "AMEX": "아멕스",
}
DEFAULT_SYNC_CONFIG = {"domestic": True, "us": []}
KIS_SYNC_MEMO_PREFIX = "kis-sync|"
DOMESTIC_CCLD_INNER_DAYS = 92
DOMESTIC_CCLD_CHUNK_DAYS = 90
DOMESTIC_CCLD_MAX_RANGE_DAYS = 365
KIS_API_MIN_INTERVAL_SEC = 0.4


def _parse_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _parse_optional_decimal(value) -> Decimal | None:
    if value is None or (isinstance(value, str) and not str(value).strip()):
        return None
    return _parse_decimal(value)


def _extract_usd_krw_rate(row: dict) -> Decimal | None:
    for key in (
        "frst_bltn_exrt",
        "bass_exrt",
        "exrt",
        "std_xcrt",
        "fxrt",
        "stck_xpr",
        "whol_stln_exrt",
    ):
        rate = _parse_decimal(row.get(key))
        if rate > 0:
            return rate
    return None


def _fx_rate_from_output2(summary) -> Decimal | None:
    if summary is None:
        return None
    rows = summary if isinstance(summary, list) else [summary]
    fallback: Decimal | None = None
    for row in rows:
        if not isinstance(row, dict):
            continue
        rate = _extract_usd_krw_rate(row)
        if rate is None:
            continue
        crcy = str(row.get("crcy_cd") or row.get("tr_crcy_cd") or "").upper()
        if crcy == "USD":
            return rate
        if fallback is None:
            fallback = rate
    return fallback


def _derive_fx_rate_from_holding(item: dict) -> Decimal | None:
    qty = int(float(item.get("ovrs_cblc_qty") or item.get("hldg_qty") or 0))
    if qty <= 0:
        return None
    price_usd = _parse_decimal(item.get("now_pric2") or item.get("ovrs_now_pric1") or item.get("prpr") or 0)
    if price_usd <= 0:
        return None
    usd_value = price_usd * qty
    for key in ("ovrs_stck_evlu_amt", "frcr_evlu_amt2", "evlu_amt", "wcrc_evlu_amt"):
        krw_eval = _parse_decimal(item.get(key))
        if krw_eval > 0:
            return (krw_eval / usd_value).quantize(Decimal("1"))
    avg_usd = _parse_decimal(item.get("pchs_avg_pric") or item.get("avg_unpr3") or 0)
    krw_purchase = _parse_decimal(item.get("pchs_rmnd_wcrc_amt") or item.get("frcr_pchs_amt1") or 0)
    if avg_usd > 0 and krw_purchase > 0:
        return (krw_purchase / (avg_usd * qty)).quantize(Decimal("1"))
    return None


def _quantize_usd(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"))


def _int_qty(value) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _parse_kis_trade_datetime(ord_dt: str, ord_tmd: str | None = None) -> datetime:
    d = str(ord_dt or "").strip()
    if len(d) != 8 or not d.isdigit():
        return utc_now()
    raw_t = "".join(ch for ch in str(ord_tmd or "120000") if ch.isdigit()).zfill(6)[:6]
    return datetime.strptime(f"{d}{raw_t}", "%Y%m%d%H%M%S")


def _first_decimal(item: dict, keys: tuple[str, ...]) -> Decimal | None:
    for key in keys:
        val = _parse_optional_decimal(item.get(key))
        if val is not None:
            return val
    return None


def _sell_realized_pnl(item: dict, *, price: Decimal, qty: int, fee: Decimal, tax: Decimal) -> Decimal | None:
    """KIS 일별체결 output1에서 매도 실현손익 추출."""
    for key in (
        "rlzt_pfls_amt",
        "rlzt_pfls",
        "rlzt_erng_amt",
        "evlu_pfls_amt2",
        "evlu_pfls_amt",
        "pfls_amt",
        "tfht_evlu_pfls_amt",
    ):
        val = _parse_optional_decimal(item.get(key))
        if val is not None:
            return val

    proceeds = _first_decimal(item, ("tot_ccld_amt", "ccld_amt", "ccld_amt_smtl1"))
    if proceeds is None and price > 0:
        proceeds = price * Decimal(qty)

    purchase_amt = _first_decimal(item, ("pchs_amt", "tot_pchs_amt", "pchs_amt_smtl1"))
    if purchase_amt is not None and proceeds is not None:
        return proceeds - purchase_amt - fee - tax

    cost_price = _first_decimal(
        item,
        ("pchs_avg_pric", "pchs_unpr", "avg_pchs_unpr", "bfdy_pchs_avg_pric"),
    )
    if cost_price is not None and cost_price > 0 and proceeds is not None:
        return proceeds - cost_price * Decimal(qty) - fee - tax
    if cost_price is not None and cost_price > 0:
        return (price - cost_price) * Decimal(qty) - fee - tax
    return None


def iter_domestic_ccld_windows(start: date, end: date) -> list[tuple[date, date, str]]:
    """KIS 일별체결 조회 구간 — 최대 90일·3개월 경계별 pd_dv 분리."""
    if start > end:
        return []
    today = utc_now().date()
    cutoff = today - timedelta(days=DOMESTIC_CCLD_INNER_DAYS)
    windows: list[tuple[date, date, str]] = []
    cursor = start
    while cursor <= end:
        chunk_end = min(cursor + timedelta(days=DOMESTIC_CCLD_CHUNK_DAYS - 1), end)
        if cursor < cutoff <= chunk_end:
            if cursor < cutoff:
                windows.append((cursor, cutoff - timedelta(days=1), "before"))
            cursor = cutoff
            continue
        pd_dv = "inner" if chunk_end >= cutoff else "before"
        windows.append((cursor, chunk_end, pd_dv))
        cursor = chunk_end + timedelta(days=1)
    return windows


def parse_period_trade_profit_row(item: dict) -> BrokerTrade | None:
    """KIS 기간별매매손익현황 output1 1건 → 매도 체결(실현손익 포함)."""
    qty = _int_qty(item.get("sll_qty") or 0)
    if qty <= 0:
        return None
    trad_dt = str(item.get("trad_dt") or "").strip()
    if len(trad_dt) != 8 or not trad_dt.isdigit():
        return None
    code = str(item.get("pdno") or "").strip().zfill(6)
    if not code or code == "000000":
        return None
    name = str(item.get("prdt_name") or code).strip()
    price = _parse_decimal(item.get("sll_pric") or 0)
    if price <= 0:
        sll_amt = _parse_decimal(item.get("sll_amt") or 0)
        if sll_amt > 0:
            price = (sll_amt / Decimal(qty)).quantize(Decimal("0.01"))
    if price <= 0:
        return None
    fee = _parse_decimal(item.get("fee") or 0)
    tax = _parse_decimal(item.get("tl_tax") or 0)
    realized = _parse_optional_decimal(item.get("rlzt_pfls"))
    sll_amt = _parse_decimal(item.get("sll_amt") or 0)
    external_id = f"profit:{trad_dt}:{code}:{qty}:{price}:{sll_amt}"
    return BrokerTrade(
        stock_code=code,
        stock_name=name,
        trade_type="sell",
        quantity=qty,
        price=price.quantize(Decimal("0.01")),
        fee=fee.quantize(Decimal("0.01")),
        tax=tax.quantize(Decimal("0.01")),
        realized_pnl=realized.quantize(Decimal("0.01")) if realized is not None else None,
        traded_at=_parse_kis_trade_datetime(trad_dt, "150000"),
        external_id=external_id,
    )


def parse_domestic_ccld_row(item: dict) -> BrokerTrade | None:
    """KIS 주식일별주문체결 output1 1건 → BrokerTrade."""
    if str(item.get("cncl_yn") or "N").upper() == "Y":
        return None
    qty = _int_qty(item.get("tot_ccld_qty") or item.get("ccld_qty") or item.get("ccld_qty_smtl1"))
    if qty <= 0:
        return None
    side = str(item.get("sll_buy_dvsn_cd") or "").strip()
    if side == "01":
        trade_type = "sell"
    elif side == "02":
        trade_type = "buy"
    else:
        return None
    ord_dt = str(item.get("ord_dt") or item.get("ccld_dt") or "").strip()
    if not ord_dt:
        return None
    code = str(item.get("pdno") or "").strip().zfill(6)
    if not code or code == "000000":
        return None
    name = str(item.get("prdt_name") or item.get("item_name") or code).strip()
    price = _parse_decimal(item.get("avg_prvs") or item.get("ccld_unpr") or item.get("ord_unpr") or 0)
    if price <= 0:
        return None
    traded_at = _parse_kis_trade_datetime(ord_dt, item.get("ord_tmd") or item.get("ccld_tmd"))
    fee = _parse_decimal(item.get("fees") or item.get("fee") or item.get("ord_fee") or 0)
    tax = _parse_decimal(item.get("tax") or item.get("tax_amt") or item.get("stmp_tax") or 0)
    realized: Decimal | None = None
    if trade_type == "sell":
        realized = _sell_realized_pnl(item, price=price, qty=qty, fee=fee, tax=tax)
    odno = str(item.get("odno") or item.get("orgn_odno") or "")
    external_id = f"{ord_dt}:{odno}:{code}:{side}:{qty}:{price}"
    return BrokerTrade(
        stock_code=code,
        stock_name=name,
        trade_type=trade_type,
        quantity=qty,
        price=price.quantize(Decimal("0.01")),
        fee=fee.quantize(Decimal("0.01")),
        tax=tax.quantize(Decimal("0.01")),
        realized_pnl=realized.quantize(Decimal("0.01")) if realized is not None else None,
        traded_at=traded_at,
        external_id=external_id,
    )


def _to_krw(amount_usd: Decimal, rate: Decimal) -> Decimal:
    if rate <= 0:
        return amount_usd.quantize(Decimal("0.01"))
    return (amount_usd * rate).quantize(Decimal("0.01"))


@dataclass
class KISCredentials:
    app_key: str
    app_secret: str
    account_number: str
    account_product_code: str = "01"


class KISBrokerAdapter:
    broker_code = "kis"
    display_name = "한국투자증권"

    def __init__(self, *, use_virtual: bool | None = None):
        self.use_virtual = settings.KIS_USE_VIRTUAL if use_virtual is None else use_virtual
        if self.use_virtual:
            self.base_url = "https://openapivts.koreainvestment.com:29443"
            self.token_path = "/oauth2/tokenP"
            self.balance_tr_id = "VTTC8434R"
            self.us_balance_tr_id = "VTTS3012R"
            self.us_present_balance_tr_id = "VTRP6504R"
        else:
            self.base_url = "https://openapi.koreainvestment.com:9443"
            self.token_path = "/oauth2/tokenP"
            self.balance_tr_id = "TTTC8434R"
            self.us_balance_tr_id = "TTTS3012R"
            self.us_present_balance_tr_id = "CTRP6504R"

    def domestic_ccld_tr_id_for(self, pd_dv: str) -> str:
        """3개월 이내(inner) / 이전(before) TR ID."""
        inner = pd_dv == "inner"
        if self.use_virtual:
            return "VTTC8001R" if inner else "VTSC9115R"
        return "TTTC8001R" if inner else "CTSC9115R"

    @property
    def period_trade_profit_tr_id(self) -> str:
        return "VTTC8715R" if self.use_virtual else "TTTC8715R"

    def _parse_error(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            msg = body.get("msg1") or body.get("error_description") or body.get("message")
            code = body.get("msg_cd") or body.get("error_code")
            if msg and code:
                return f"{msg} ({code})"
            return msg or code or response.text
        except Exception:
            return response.text or f"HTTP {response.status_code}"

    def _parse_api_error(self, data: dict) -> str:
        msg = data.get("msg1") or "KIS API 오류"
        code = data.get("msg_cd")
        return f"{msg} ({code})" if code else str(msg)

    def issue_token(self, creds: KISCredentials) -> tuple[str, int]:
        url = f"{self.base_url}{self.token_path}"
        payload = {
            "grant_type": "client_credentials",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
        }
        headers = {"content-type": "application/json; charset=UTF-8"}
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, content=json.dumps(payload), headers=headers)
        if response.status_code != 200:
            raise BrokerError(f"KIS 토큰 발급 실패: {self._parse_error(response)}", status_code=response.status_code)
        data = response.json()
        token = data.get("access_token")
        if not token:
            raise BrokerError("KIS 토큰 응답에 access_token이 없습니다.")
        expires_in = int(data.get("expires_in", 86400))
        return token, expires_in

    def verify_credentials(self, creds: KISCredentials) -> str:
        token, _ = self.issue_token(creds)
        self.fetch_domestic_balance(creds, access_token=token)
        return token

    def fetch_domestic_balance(self, creds: KISCredentials, *, access_token: str) -> BrokerBalance:
        url = f"{self.base_url}/uapi/domestic-stock/v1/trading/inquire-balance"
        params = {
            "CANO": creds.account_number,
            "ACNT_PRDT_CD": creds.account_product_code,
            "AFHR_FLPR_YN": "N",
            "OFL_YN": "",
            "INQR_DVSN": "01",
            "UNPR_DVSN": "01",
            "FUND_STTL_ICLD_YN": "N",
            "FNCG_AMT_AUTO_RDPT_YN": "N",
            "PRCS_DVSN": "00",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": "",
        }
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {access_token}",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
            "tr_id": self.balance_tr_id,
            "custtype": "P",
        }
        holdings: list[BrokerHolding] = []
        cash = Decimal("0")
        total_eval = Decimal("0")

        with httpx.Client(timeout=30.0) as client:
            while True:
                response = client.get(url, params=params, headers=headers)
                if response.status_code != 200:
                    raise BrokerError(
                        f"KIS 잔고 조회 실패: {self._parse_error(response)}",
                        status_code=response.status_code,
                    )
                data = response.json()
                if str(data.get("rt_cd")) not in ("0", "00"):
                    raise BrokerError(f"KIS 잔고 조회 실패: {self._parse_api_error(data)}")

                summary = data.get("output2")
                if isinstance(summary, list) and summary:
                    row = summary[0]
                    cash = Decimal(str(row.get("dnca_tot_amt") or row.get("nxdy_excc_amt") or 0))
                    total_eval = Decimal(str(row.get("tot_evlu_amt") or row.get("nass_amt") or cash))
                elif isinstance(summary, dict):
                    cash = Decimal(str(summary.get("dnca_tot_amt") or summary.get("nxdy_excc_amt") or 0))
                    total_eval = Decimal(str(summary.get("tot_evlu_amt") or summary.get("nass_amt") or cash))

                for item in data.get("output1") or []:
                    qty = _int_qty(item.get("hldg_qty"))
                    if qty <= 0:
                        continue
                    code = str(item.get("pdno") or "").zfill(6)
                    avg = _parse_decimal(item.get("pchs_avg_pric") or 0)
                    price = _parse_decimal(item.get("prpr") or 0)
                    purchase = _parse_decimal(item.get("pchs_amt") or 0)
                    if purchase <= 0:
                        purchase = avg * qty
                    evaluation = _parse_decimal(item.get("evlu_amt") or 0)
                    if evaluation <= 0:
                        evaluation = price * qty
                    sellable = _int_qty(item.get("ord_psbl_qty"))
                    pnl = _parse_optional_decimal(item.get("evlu_pfls_amt"))
                    ret = _parse_optional_decimal(item.get("evlu_pfls_rt"))
                    holdings.append(
                        BrokerHolding(
                            stock_code=code,
                            stock_name=str(item.get("prdt_name") or code),
                            quantity=qty,
                            avg_price=avg,
                            current_price=price,
                            market_type="domestic",
                            orderable_quantity=sellable if sellable > 0 else qty,
                            purchase_amount=purchase.quantize(Decimal("1")),
                            evaluation_amount=evaluation.quantize(Decimal("1")),
                            profit_loss=pnl,
                            return_rate=ret,
                            currency="KRW",
                        )
                    )

                tr_cont = response.headers.get("tr_cont", "")
                if tr_cont in ("M", "F"):
                    params["CTX_AREA_FK100"] = data.get("ctx_area_fk100") or ""
                    params["CTX_AREA_NK100"] = data.get("ctx_area_nk100") or ""
                    headers["tr_cont"] = "N"
                    continue
                break

        if total_eval <= 0:
            stock_value = sum(h.current_price * h.quantity for h in holdings)
            total_eval = cash + stock_value
        if cash <= 0 and holdings:
            cash = max(total_eval - sum(h.current_price * h.quantity for h in holdings), Decimal("0"))

        return BrokerBalance(cash_balance=cash, total_evaluation=total_eval, holdings=holdings, usd_krw_rate=None)

    def _fetch_domestic_ccld_window(
        self,
        client: httpx.Client,
        creds: KISCredentials,
        *,
        access_token: str,
        start_dt: str,
        end_dt: str,
        pd_dv: str,
        seen: set[str],
        trades: list[BrokerTrade],
    ) -> None:
        url = f"{self.base_url}/uapi/domestic-stock/v1/trading/inquire-daily-ccld"
        params = {
            "CANO": creds.account_number,
            "ACNT_PRDT_CD": creds.account_product_code,
            "INQR_STRT_DT": start_dt,
            "INQR_END_DT": end_dt,
            "SLL_BUY_DVSN_CD": "00",
            "INQR_DVSN": "00",
            "PDNO": "",
            "CCLD_DVSN": "01",
            "ORD_GNO_BRNO": "",
            "ODNO": "",
            "INQR_DVSN_3": "00",
            "INQR_DVSN_1": "",
            "INQR_DVSN_2": "",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": "",
        }
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {access_token}",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
            "tr_id": self.domestic_ccld_tr_id_for(pd_dv),
            "custtype": "P",
        }

        while True:
            response = client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                raise BrokerError(
                    f"KIS 국내 체결내역 조회 실패: {self._parse_error(response)}",
                    status_code=response.status_code,
                )
            data = response.json()
            if str(data.get("rt_cd")) not in ("0", "00"):
                raise BrokerError(f"KIS 국내 체결내역 조회 실패: {self._parse_api_error(data)}")

            for item in data.get("output1") or []:
                if not isinstance(item, dict):
                    continue
                parsed = parse_domestic_ccld_row(item)
                if parsed is None or parsed.trade_type != "buy" or parsed.external_id in seen:
                    continue
                seen.add(parsed.external_id)
                trades.append(parsed)

            tr_cont = response.headers.get("tr_cont", "")
            if tr_cont in ("M", "F"):
                params["CTX_AREA_FK100"] = data.get("ctx_area_fk100") or ""
                params["CTX_AREA_NK100"] = data.get("ctx_area_nk100") or ""
                headers["tr_cont"] = "N"
                time.sleep(KIS_API_MIN_INTERVAL_SEC)
                continue
            break

    def _fetch_domestic_period_trade_profit(
        self,
        client: httpx.Client,
        creds: KISCredentials,
        *,
        access_token: str,
        start_dt: str,
        end_dt: str,
        seen: set[str],
        trades: list[BrokerTrade],
    ) -> None:
        """기간별매매손익현황 — 매도 실현손익(rlzt_pfls) 포함."""
        url = f"{self.base_url}/uapi/domestic-stock/v1/trading/inquire-period-trade-profit"
        params = {
            "CANO": creds.account_number,
            "ACNT_PRDT_CD": creds.account_product_code,
            "INQR_STRT_DT": start_dt,
            "INQR_END_DT": end_dt,
            "SORT_DVSN": "00",
            "PDNO": "",
            "CBLC_DVSN": "00",
            "CTX_AREA_FK100": "",
            "CTX_AREA_NK100": "",
        }
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {access_token}",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
            "tr_id": self.period_trade_profit_tr_id,
            "custtype": "P",
        }

        while True:
            response = client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                raise BrokerError(
                    f"KIS 매매손익 조회 실패: {self._parse_error(response)}",
                    status_code=response.status_code,
                )
            data = response.json()
            if str(data.get("rt_cd")) not in ("0", "00"):
                raise BrokerError(f"KIS 매매손익 조회 실패: {self._parse_api_error(data)}")

            for item in data.get("output1") or []:
                if not isinstance(item, dict):
                    continue
                parsed = parse_period_trade_profit_row(item)
                if parsed is None or parsed.external_id in seen:
                    continue
                seen.add(parsed.external_id)
                trades.append(parsed)

            tr_cont = response.headers.get("tr_cont", "")
            if tr_cont in ("M", "F"):
                params["CTX_AREA_FK100"] = data.get("ctx_area_fk100") or ""
                params["CTX_AREA_NK100"] = data.get("ctx_area_nk100") or ""
                headers["tr_cont"] = "N"
                time.sleep(KIS_API_MIN_INTERVAL_SEC)
                continue
            break

    def fetch_domestic_trades(
        self,
        creds: KISCredentials,
        *,
        access_token: str,
        start_date: str | None = None,
        end_date: str | None = None,
        days_back: int = DOMESTIC_CCLD_INNER_DAYS,
    ) -> list[BrokerTrade]:
        """국내 매매 — 매도는 기간별매매손익(실현손익), 매수는 일별체결. 최대 1년."""
        today = utc_now().date()
        if end_date:
            end_d = datetime.strptime(end_date.replace("-", "")[:8], "%Y%m%d").date()
        else:
            end_d = today
        if start_date:
            start_d = datetime.strptime(start_date.replace("-", "")[:8], "%Y%m%d").date()
        else:
            start_d = today - timedelta(days=days_back)
        if start_d > end_d:
            return []
        if (end_d - start_d).days > DOMESTIC_CCLD_MAX_RANGE_DAYS:
            raise BrokerError(
                f"조회 기간은 최대 {DOMESTIC_CCLD_MAX_RANGE_DAYS}일(약 1년)입니다.",
            )

        trades: list[BrokerTrade] = []
        seen: set[str] = set()
        with httpx.Client(timeout=30.0) as client:
            self._fetch_domestic_period_trade_profit(
                client,
                creds,
                access_token=access_token,
                start_dt=start_d.strftime("%Y%m%d"),
                end_dt=end_d.strftime("%Y%m%d"),
                seen=seen,
                trades=trades,
            )
            time.sleep(KIS_API_MIN_INTERVAL_SEC)
            for win_start, win_end, pd_dv in iter_domestic_ccld_windows(start_d, end_d):
                self._fetch_domestic_ccld_window(
                    client,
                    creds,
                    access_token=access_token,
                    start_dt=win_start.strftime("%Y%m%d"),
                    end_dt=win_end.strftime("%Y%m%d"),
                    pd_dv=pd_dv,
                    seen=seen,
                    trades=trades,
                )
                time.sleep(KIS_API_MIN_INTERVAL_SEC)

        trades.sort(key=lambda t: t.traded_at)
        return trades

    def fetch_balance(self, creds: KISCredentials, *, access_token: str) -> BrokerBalance:
        """Backward-compatible alias for domestic balance."""
        return self.fetch_domestic_balance(creds, access_token=access_token)

    def fetch_usd_krw_rate(self, creds: KISCredentials, *, access_token: str) -> Decimal | None:
        """해외 체결기준 잔고 API에서 USD 기준환율 조회 (inquire-balance fallback)."""
        url = f"{self.base_url}/uapi/overseas-stock/v1/trading/inquire-present-balance"
        params = {
            "CANO": creds.account_number,
            "ACNT_PRDT_CD": creds.account_product_code,
            "WCRC_FRCR_DVSN_CD": "02",
            "NATN_CD": "840",
            "TR_MKET_CD": "00",
            "INQR_DVSN_CD": "00",
        }
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {access_token}",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
            "tr_id": self.us_present_balance_tr_id,
            "custtype": "P",
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params, headers=headers)
        if response.status_code != 200:
            return None
        data = response.json()
        if str(data.get("rt_cd")) not in ("0", "00"):
            return None
        rate = _fx_rate_from_output2(data.get("output2"))
        if rate is not None:
            return rate
        for item in data.get("output1") or []:
            rate = _extract_usd_krw_rate(item)
            if rate is not None:
                return rate
        return None

    def fetch_us_balance(
        self,
        creds: KISCredentials,
        *,
        access_token: str,
        exchange: str,
        fx_rate_hint: Decimal | None = None,
    ) -> BrokerBalance:
        if exchange not in US_EXCHANGE_CODES:
            raise BrokerError(f"지원하지 않는 미국 거래소 코드입니다: {exchange}")

        url = f"{self.base_url}/uapi/overseas-stock/v1/trading/inquire-balance"
        params = {
            "CANO": creds.account_number,
            "ACNT_PRDT_CD": creds.account_product_code,
            "OVRS_EXCG_CD": exchange,
            "TR_CRCY_CD": "USD",
            "CTX_AREA_FK200": "",
            "CTX_AREA_NK200": "",
        }
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {access_token}",
            "appkey": creds.app_key,
            "appsecret": creds.app_secret,
            "tr_id": self.us_balance_tr_id,
            "custtype": "P",
        }
        holdings: list[BrokerHolding] = []
        cash_usd = Decimal("0")
        total_eval_usd = Decimal("0")
        fx_rate: Decimal | None = fx_rate_hint if fx_rate_hint and fx_rate_hint > 0 else None

        with httpx.Client(timeout=30.0) as client:
            while True:
                response = client.get(url, params=params, headers=headers)
                if response.status_code != 200:
                    raise BrokerError(
                        f"KIS 미국주식 잔고 조회 실패({US_EXCHANGE_LABELS.get(exchange, exchange)}): "
                        f"{self._parse_error(response)}",
                        status_code=response.status_code,
                    )
                data = response.json()
                if str(data.get("rt_cd")) not in ("0", "00"):
                    raise BrokerError(
                        f"KIS 미국주식 잔고 조회 실패({US_EXCHANGE_LABELS.get(exchange, exchange)}): "
                        f"{self._parse_api_error(data)}"
                    )

                summary = data.get("output2")
                if fx_rate is None:
                    fx_rate = _fx_rate_from_output2(summary)
                if isinstance(summary, list) and summary:
                    row = summary[0]
                    cash_usd = _parse_decimal(row.get("frcr_buy_amt_smtl") or row.get("frcr_dncl_amt_2") or 0)
                    total_eval_usd = _parse_decimal(row.get("tot_evlu_amt") or row.get("ovrs_tot_pfls") or cash_usd)
                elif isinstance(summary, dict):
                    cash_usd = _parse_decimal(summary.get("frcr_buy_amt_smtl") or summary.get("frcr_dncl_amt_2") or 0)
                    total_eval_usd = _parse_decimal(summary.get("tot_evlu_amt") or summary.get("ovrs_tot_pfls") or cash_usd)

                if fx_rate is None:
                    for item in data.get("output1") or []:
                        fx_rate = _extract_usd_krw_rate(item) or _derive_fx_rate_from_holding(item)
                        if fx_rate is not None:
                            break

                for item in data.get("output1") or []:
                    qty = _int_qty(item.get("ovrs_cblc_qty") or item.get("hldg_qty"))
                    if qty <= 0:
                        continue
                    code = str(item.get("ovrs_pdno") or item.get("pdno") or "").strip().upper()
                    if not code:
                        continue
                    row_rate = _extract_usd_krw_rate(item) or _derive_fx_rate_from_holding(item) or fx_rate
                    if row_rate is not None and row_rate > 0 and (fx_rate is None or fx_rate <= 0):
                        fx_rate = row_rate
                    avg_usd = _parse_decimal(item.get("pchs_avg_pric") or item.get("avg_unpr3") or 0)
                    price_usd = _parse_decimal(item.get("now_pric2") or item.get("ovrs_now_pric1") or item.get("prpr") or 0)
                    purchase_usd = _parse_decimal(
                        item.get("frcr_pchs_amt1") or item.get("frcr_pchs_amt") or 0
                    )
                    if purchase_usd <= 0:
                        purchase_usd = avg_usd * qty
                    eval_usd = _parse_decimal(item.get("ovrs_stck_evlu_amt") or item.get("frcr_evlu_amt2") or 0)
                    if eval_usd <= 0:
                        eval_usd = price_usd * qty
                    sellable = _int_qty(item.get("ord_psbl_qty"))
                    currency = str(item.get("tr_crcy_cd") or "USD").upper() or "USD"
                    pnl = _parse_optional_decimal(
                        item.get("frcr_evlu_pfls_amt")
                        or item.get("evlu_pfls_amt2")
                        or item.get("evlu_pfls_amt")
                    )
                    ret = _parse_optional_decimal(item.get("evlu_pfls_rt1") or item.get("evlu_pfls_rt"))
                    holdings.append(
                        BrokerHolding(
                            stock_code=code,
                            stock_name=str(item.get("ovrs_item_name") or item.get("prdt_name") or code),
                            quantity=qty,
                            avg_price=_quantize_usd(avg_usd),
                            current_price=_quantize_usd(price_usd),
                            market_type="us",
                            exchange_code=str(item.get("ovrs_excg_cd") or exchange),
                            orderable_quantity=sellable if sellable > 0 else qty,
                            purchase_amount=_quantize_usd(purchase_usd),
                            evaluation_amount=_quantize_usd(eval_usd),
                            profit_loss=_quantize_usd(pnl) if pnl is not None else None,
                            return_rate=ret,
                            currency=currency,
                        )
                    )

                tr_cont = response.headers.get("tr_cont", "")
                if tr_cont in ("M", "F"):
                    params["CTX_AREA_FK200"] = data.get("ctx_area_fk200") or ""
                    params["CTX_AREA_NK200"] = data.get("ctx_area_nk200") or ""
                    headers["tr_cont"] = "N"
                    continue
                break

        if fx_rate is None or fx_rate <= 0:
            fx_rate = self.fetch_usd_krw_rate(creds, access_token=access_token)

        needs_fx = cash_usd > 0 or total_eval_usd > 0 or bool(holdings)
        if needs_fx and (fx_rate is None or fx_rate <= 0):
            raise BrokerError(
                f"KIS 미국주식 환율 정보를 확인할 수 없습니다 ({US_EXCHANGE_LABELS.get(exchange, exchange)}). "
                "잠시 후 다시 동기화해 주세요."
            )

        if fx_rate and fx_rate > 0:
            cash = _to_krw(cash_usd, fx_rate)
            if total_eval_usd <= 0:
                stock_value_krw = sum(_to_krw(h.current_price * h.quantity, fx_rate) for h in holdings)
                total_eval = cash + stock_value_krw
            else:
                total_eval = _to_krw(total_eval_usd, fx_rate)
        else:
            cash = _quantize_usd(cash_usd)
            total_eval = _quantize_usd(total_eval_usd) if total_eval_usd > 0 else Decimal("0")

        return BrokerBalance(
            cash_balance=cash,
            total_evaluation=total_eval,
            holdings=holdings,
            usd_krw_rate=fx_rate,
        )

    def fetch_combined_balance(
        self,
        creds: KISCredentials,
        *,
        access_token: str,
        sync_domestic: bool,
        sync_us: list[str],
    ) -> BrokerBalance:
        holdings: list[BrokerHolding] = []
        cash = Decimal("0")
        total_eval = Decimal("0")

        if sync_domestic:
            domestic = self.fetch_domestic_balance(creds, access_token=access_token)
            holdings.extend(domestic.holdings)
            cash += domestic.cash_balance
            total_eval += domestic.total_evaluation

        seen_us: set[str] = set()
        usd_krw_rate: Decimal | None = None
        fx_rate_hint = self.fetch_usd_krw_rate(creds, access_token=access_token)
        us_cash_added = False
        for exchange in sync_us:
            us_balance = self.fetch_us_balance(
                creds,
                access_token=access_token,
                exchange=exchange,
                fx_rate_hint=fx_rate_hint or usd_krw_rate,
            )
            if us_balance.usd_krw_rate and us_balance.usd_krw_rate > 0:
                usd_krw_rate = us_balance.usd_krw_rate
            if not us_cash_added:
                cash += us_balance.cash_balance
                us_cash_added = True
            for item in us_balance.holdings:
                key = item.stock_code
                if key in seen_us:
                    continue
                seen_us.add(key)
                holdings.append(item)

        rate = usd_krw_rate or Decimal("0")
        holdings_krw = Decimal("0")
        for h in holdings:
            line = h.current_price * h.quantity
            if h.market_type == "us" and rate > 0:
                holdings_krw += _to_krw(line, rate)
            else:
                holdings_krw += line
        total_eval = cash + holdings_krw

        return BrokerBalance(
            cash_balance=cash,
            total_evaluation=total_eval,
            holdings=holdings,
            usd_krw_rate=usd_krw_rate,
        )

    @staticmethod
    def token_expires_at(expires_in: int):
        return utc_now() + timedelta(seconds=max(expires_in - 60, 60))

    @staticmethod
    def extra_json(
        account_product_code: str,
        *,
        sync_domestic: bool = True,
        sync_us: list[str] | None = None,
        usd_krw_rate: Decimal | None = None,
        stats_baseline_v: int = 2,
    ) -> str:
        us_codes = [code for code in (sync_us or []) if code in US_EXCHANGE_CODES]
        payload: dict = {
            "accountProductCode": account_product_code,
            "sync": {"domestic": sync_domestic, "us": us_codes},
            "statsBaselineV": stats_baseline_v,
        }
        if usd_krw_rate and usd_krw_rate > 0:
            payload["usdKrwRate"] = float(usd_krw_rate)
        return json.dumps(payload)

    @staticmethod
    def parse_extra(extra_json: str | None) -> dict:
        if not extra_json:
            return {"accountProductCode": "01", "sync": dict(DEFAULT_SYNC_CONFIG)}
        try:
            data = json.loads(extra_json)
        except json.JSONDecodeError:
            return {"accountProductCode": "01", "sync": dict(DEFAULT_SYNC_CONFIG)}
        sync = data.get("sync") or {}
        us_codes = [code for code in sync.get("us", []) if code in US_EXCHANGE_CODES]
        usd_krw_rate = _parse_decimal(data.get("usdKrwRate"))
        try:
            stats_baseline_v = int(data.get("statsBaselineV", 1))
        except (TypeError, ValueError):
            stats_baseline_v = 1
        return {
            "accountProductCode": str(data.get("accountProductCode", "01")),
            "sync": {
                "domestic": bool(sync.get("domestic", True)),
                "us": us_codes,
            },
            "usdKrwRate": usd_krw_rate if usd_krw_rate > 0 else None,
            "statsBaselineV": stats_baseline_v,
        }

    @staticmethod
    def parse_sync_config(extra_json: str | None) -> tuple[bool, list[str]]:
        extra = KISBrokerAdapter.parse_extra(extra_json)
        sync = extra.get("sync", DEFAULT_SYNC_CONFIG)
        domestic = bool(sync.get("domestic", True))
        us_codes = list(sync.get("us", []))
        return domestic, us_codes
