"""Kiwoom Securities REST Open API adapter."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

import httpx

from app.brokers.base import BrokerBalance, BrokerError, BrokerHolding, BrokerTrade
from app.brokers.sync_config import extra_json, parse_extra, parse_sync_config, sync_memo_prefix
from app.config import settings
from app.models import Account, AccountCredential
from app.utils.crypto import decrypt_secret
from app.utils.time import utc_now

KIWOOM_SYNC_MEMO_PREFIX = sync_memo_prefix("kiwoom")
KIWOOM_API_MIN_INTERVAL_SEC = 0.4
ACCOUNT_ENDPOINT = "/api/dostk/acnt"


def _parse_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _int_qty(value) -> int:
    try:
        return int(float(str(value or "0").replace(",", "")))
    except (TypeError, ValueError):
        return 0


def _normalize_stock_code(value: str) -> str:
    code = "".join(ch for ch in str(value or "") if ch.isalnum())
    return code[-6:].zfill(6) if code else ""


def _parse_trade_type(*texts: str) -> str | None:
    joined = " ".join(t for t in texts if t)
    if "매수" in joined:
        return "buy"
    if "매도" in joined:
        return "sell"
    return None


def _parse_trade_datetime(trde_dt: str, proc_tm: str | None = None) -> datetime:
    d = str(trde_dt or "").strip()
    if len(d) != 8 or not d.isdigit():
        return utc_now()
    raw_t = "".join(ch for ch in str(proc_tm or "120000") if ch.isdigit()).zfill(6)[:6]
    return datetime.strptime(f"{d}{raw_t}", "%Y%m%d%H%M%S")


def parse_kt00015_trade_row(item: dict) -> BrokerTrade | None:
    qty = _int_qty(item.get("trde_qty_jwa_cnt"))
    if qty <= 0:
        return None
    trde_dt = str(item.get("trde_dt") or item.get("cntr_dt") or "").strip()
    if len(trde_dt) != 8 or not trde_dt.isdigit():
        return None
    code = _normalize_stock_code(item.get("stk_cd") or "")
    if not code:
        return None
    trade_type = _parse_trade_type(
        str(item.get("rmrk_nm") or ""),
        str(item.get("trde_kind_nm") or ""),
        str(item.get("io_tp_nm") or ""),
        str(item.get("trde_stle") or ""),
    )
    if trade_type is None:
        return None
    price = _parse_decimal(item.get("trde_unit") or 0)
    if price <= 0:
        amount = _parse_decimal(item.get("trde_amt") or 0)
        if amount > 0:
            price = (amount / Decimal(qty)).quantize(Decimal("0.01"))
    if price <= 0:
        return None
    fee = _parse_decimal(item.get("cmsn") or 0)
    tax = _parse_decimal(item.get("incm_resi_tax") or item.get("trde_agri_tax") or item.get("tax_sum_cmsn") or 0)
    name = str(item.get("stk_nm") or code).strip()
    trde_no = str(item.get("trde_no") or item.get("orig_deal_no") or "")
    external_id = f"kt15:{trde_dt}:{trde_no}:{code}:{trade_type}:{qty}:{price}"
    return BrokerTrade(
        stock_code=code,
        stock_name=name,
        trade_type=trade_type,
        quantity=qty,
        price=price.quantize(Decimal("0.01")),
        fee=fee.quantize(Decimal("0.01")),
        tax=tax.quantize(Decimal("0.01")),
        realized_pnl=None,
        traded_at=_parse_trade_datetime(trde_dt, item.get("proc_tm")),
        external_id=external_id,
    )


@dataclass
class KiwoomCredentials:
    app_key: str
    app_secret: str
    account_number: str


class KiwoomBrokerAdapter:
    broker_code = "kiwoom"
    display_name = "키움증권"

    def __init__(self, *, use_virtual: bool | None = None):
        self.use_virtual = settings.KIWOOM_USE_VIRTUAL if use_virtual is None else use_virtual
        self.base_url = "https://mockapi.kiwoom.com" if self.use_virtual else "https://api.kiwoom.com"

    @classmethod
    def build_credentials(cls, credential: AccountCredential, account: Account) -> KiwoomCredentials:
        return KiwoomCredentials(
            app_key=decrypt_secret(credential.app_key_encrypted),
            app_secret=decrypt_secret(credential.app_secret_encrypted),
            account_number=account.account_number or "",
        )

    def _parse_error(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            msg = body.get("return_msg") or body.get("message")
            code = body.get("return_code")
            if msg and code is not None:
                return f"{msg} ({code})"
            return msg or response.text
        except Exception:
            return response.text or f"HTTP {response.status_code}"

    def _parse_api_error(self, data: dict) -> str:
        msg = data.get("return_msg") or "키움 API 오류"
        code = data.get("return_code")
        return f"{msg} ({code})" if code is not None else str(msg)

    def _request_tr(
        self,
        client: httpx.Client,
        *,
        api_id: str,
        body: dict,
        access_token: str,
        cont_yn: str = "N",
        next_key: str = "",
    ) -> tuple[dict, str, str]:
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "authorization": f"Bearer {access_token}",
            "cont-yn": cont_yn,
            "next-key": next_key,
            "api-id": api_id,
        }
        response = client.post(f"{self.base_url}{ACCOUNT_ENDPOINT}", headers=headers, json=body)
        if response.status_code != 200:
            raise BrokerError(
                f"키움 API 호출 실패 ({api_id}): {self._parse_error(response)}",
                status_code=response.status_code,
            )
        data = response.json()
        if str(data.get("return_code", "0")) not in ("0", "00"):
            raise BrokerError(f"키움 API 오류 ({api_id}): {self._parse_api_error(data)}")
        cont = response.headers.get("cont-yn", "N")
        nkey = response.headers.get("next-key", "")
        return data, cont, nkey

    def _parse_token_response(self, response: httpx.Response) -> tuple[str, int]:
        if response.status_code != 200:
            raise BrokerError(
                f"키움 토큰 발급 실패: {self._parse_error(response)}",
                status_code=response.status_code,
            )

        try:
            data = response.json()
        except Exception as exc:
            raise BrokerError(
                f"키움 토큰 응답을 읽을 수 없습니다: {response.text[:200]}"
            ) from exc

        if not isinstance(data, dict):
            raise BrokerError("키움 토큰 응답 형식이 올바르지 않습니다.")

        return_code = data.get("return_code")
        if return_code is not None and str(return_code) not in ("0", "00"):
            raise BrokerError(f"키움 토큰 발급 실패: {self._parse_api_error(data)}")

        token = data.get("token") or data.get("access_token") or data.get("accessToken")
        if not token and isinstance(data.get("body"), dict):
            body = data["body"]
            token = body.get("token") or body.get("access_token") or body.get("accessToken")

        if not token:
            msg = str(data.get("return_msg") or "접근 토큰이 응답에 없습니다.")
            env = "모의투자(mockapi)" if self.use_virtual else "실전투자(api)"
            raise BrokerError(
                f"키움 토큰 발급 실패({env}): {msg}. "
                "APP KEY/SECRET이 맞는지, 키움 개발자센터에서 발급한 환경(실전/모의)과 일치하는지 확인해주세요."
            )

        expires_dt = str(data.get("expires_dt") or "")
        if len(expires_dt) == 14 and expires_dt.isdigit():
            expires_at = datetime.strptime(expires_dt, "%Y%m%d%H%M%S")
            expires_in = max(int((expires_at - utc_now()).total_seconds()), 60)
        else:
            expires_in = int(data.get("expires_in") or 86400)
        return str(token), expires_in

    def issue_token(self, creds: KiwoomCredentials) -> tuple[str, int]:
        url = f"{self.base_url}/oauth2/token"
        payload = {
            "grant_type": "client_credentials",
            "appkey": creds.app_key.strip(),
            "secretkey": creds.app_secret.strip(),
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                url,
                headers={
                    "Content-Type": "application/json;charset=UTF-8",
                    "api-id": "au10001",
                },
                json=payload,
            )
        return self._parse_token_response(response)

    @classmethod
    def issue_token_with_environment(
        cls,
        creds: KiwoomCredentials,
        *,
        prefer_virtual: bool | None = None,
    ) -> tuple[str, int, bool]:
        """Try configured environment first, then the alternate (실전 ↔ 모의)."""
        if prefer_virtual is None:
            candidates = [settings.KIWOOM_USE_VIRTUAL, not settings.KIWOOM_USE_VIRTUAL]
        else:
            candidates = [prefer_virtual, not prefer_virtual]

        errors: list[str] = []
        tried: set[bool] = set()
        for use_virtual in candidates:
            if use_virtual in tried:
                continue
            tried.add(use_virtual)
            adapter = cls(use_virtual=use_virtual)
            try:
                token, expires_in = adapter.issue_token(creds)
                return token, expires_in, use_virtual
            except BrokerError as exc:
                errors.append(str(exc))

        if len(errors) == 1:
            raise BrokerError(errors[0])
        raise BrokerError(" / ".join(errors))

    def verify_credentials(self, creds: KiwoomCredentials) -> str:
        token, _ = self.issue_token(creds)
        self.fetch_domestic_balance(creds, access_token=token)
        return token

    def token_expires_at(self, expires_in: int):
        return utc_now() + timedelta(seconds=max(expires_in - 60, 60))

    def fetch_domestic_balance(self, creds: KiwoomCredentials, *, access_token: str) -> BrokerBalance:
        body = {"qry_tp": "0", "dmst_stex_tp": "KRX"}
        holdings: list[BrokerHolding] = []
        cash = Decimal("0")
        total_eval = Decimal("0")

        with httpx.Client(timeout=30.0) as client:
            cont_yn = "N"
            next_key = ""
            while True:
                data, cont_yn, next_key = self._request_tr(
                    client,
                    api_id="kt00004",
                    body=body,
                    access_token=access_token,
                    cont_yn=cont_yn,
                    next_key=next_key,
                )
                cash = _parse_decimal(data.get("entr") or data.get("d2_entra") or cash)
                total_eval = _parse_decimal(
                    data.get("prsm_dpst_aset_amt") or data.get("aset_evlt_amt") or data.get("tot_est_amt") or total_eval
                )
                rows = data.get("stk_acnt_evlt_prst") or data.get("acnt_evlt_remn_indv_tot") or []
                if isinstance(rows, dict):
                    rows = [rows]
                for item in rows:
                    if not isinstance(item, dict):
                        continue
                    qty = _int_qty(item.get("rmnd_qty"))
                    if qty <= 0:
                        continue
                    code = _normalize_stock_code(item.get("stk_cd") or "")
                    if not code:
                        continue
                    avg = _parse_decimal(item.get("avg_prc") or item.get("pur_pric") or 0)
                    price = _parse_decimal(item.get("cur_prc") or 0)
                    purchase = _parse_decimal(item.get("pur_amt") or 0)
                    if purchase <= 0:
                        purchase = avg * qty
                    evaluation = _parse_decimal(item.get("evlt_amt") or 0)
                    if evaluation <= 0:
                        evaluation = price * qty
                    pnl = _parse_decimal(item.get("pl_amt") or item.get("evltv_prft") or 0) or None
                    ret_raw = item.get("pl_rt") or item.get("prft_rt")
                    ret = _parse_decimal(ret_raw) if ret_raw not in (None, "") else None
                    sellable = _int_qty(item.get("trde_able_qty") or item.get("setl_remn") or qty)
                    holdings.append(
                        BrokerHolding(
                            stock_code=code,
                            stock_name=str(item.get("stk_nm") or code).strip(),
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
                if cont_yn == "Y" and next_key:
                    time.sleep(KIWOOM_API_MIN_INTERVAL_SEC)
                    continue
                break

        if total_eval <= 0:
            stock_value = sum(h.current_price * h.quantity for h in holdings)
            total_eval = cash + stock_value
        if cash <= 0 and holdings:
            cash = max(total_eval - sum(h.current_price * h.quantity for h in holdings), Decimal("0"))

        return BrokerBalance(cash_balance=cash, total_evaluation=total_eval, holdings=holdings, usd_krw_rate=None)

    def fetch_combined_balance(
        self,
        creds: KiwoomCredentials,
        *,
        access_token: str,
        sync_domestic: bool = True,
        sync_us: list[str] | None = None,
    ) -> BrokerBalance:
        if sync_us:
            raise BrokerError("키움증권 API는 미국 주식 동기화를 지원하지 않습니다.")
        if not sync_domestic:
            return BrokerBalance(
                cash_balance=Decimal("0"),
                total_evaluation=Decimal("0"),
                holdings=[],
                usd_krw_rate=None,
            )
        return self.fetch_domestic_balance(creds, access_token=access_token)

    def fetch_domestic_trades(
        self,
        creds: KiwoomCredentials,
        *,
        access_token: str,
        start_date: str,
        end_date: str,
    ) -> list[BrokerTrade]:
        start = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
        end = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
        if start > end:
            return []

        trades: list[BrokerTrade] = []
        seen: set[str] = set()
        body = {
            "strt_dt": start.strftime("%Y%m%d"),
            "end_dt": end.strftime("%Y%m%d"),
            "tp": "3",
            "stk_cd": "",
            "crnc_cd": "",
            "gds_tp": "1",
            "frgn_stex_code": "",
            "dmst_stex_tp": "%",
        }

        with httpx.Client(timeout=60.0) as client:
            cont_yn = "N"
            next_key = ""
            while True:
                data, cont_yn, next_key = self._request_tr(
                    client,
                    api_id="kt00015",
                    body=body,
                    access_token=access_token,
                    cont_yn=cont_yn,
                    next_key=next_key,
                )
                rows = data.get("trst_ovrl_trde_prps_array") or []
                if isinstance(rows, dict):
                    rows = [rows]
                for item in rows:
                    if not isinstance(item, dict):
                        continue
                    parsed = parse_kt00015_trade_row(item)
                    if parsed is None or parsed.external_id in seen:
                        continue
                    if not (start <= parsed.traded_at.date() <= end):
                        continue
                    seen.add(parsed.external_id)
                    trades.append(parsed)
                if cont_yn == "Y" and next_key:
                    time.sleep(KIWOOM_API_MIN_INTERVAL_SEC)
                    continue
                break

        trades.sort(key=lambda t: t.traded_at)
        return trades

    extra_json = staticmethod(extra_json)
    parse_extra = staticmethod(parse_extra)
    parse_sync_config = staticmethod(parse_sync_config)
