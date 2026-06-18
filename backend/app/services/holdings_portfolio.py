from decimal import Decimal



from app.models import Account, Holding





def _holding_currency(h: Holding) -> str:

    if getattr(h, "currency", None):

        return str(h.currency).upper()

    market = getattr(h, "market_type", "domestic") or "domestic"

    return "USD" if market == "us" else "KRW"





def _native_purchase(h: Holding) -> Decimal:

    if h.purchase_amount is not None and h.purchase_amount > 0:

        return Decimal(h.purchase_amount)

    return Decimal(h.quantity) * h.avg_price





def _native_evaluation(h: Holding) -> Decimal:

    if h.evaluation_amount is not None and h.evaluation_amount > 0:

        return Decimal(h.evaluation_amount)

    return Decimal(h.quantity) * h.current_price





def _native_pnl(h: Holding) -> Decimal:

    if h.profit_loss is not None:

        return Decimal(h.profit_loss)

    return _native_evaluation(h) - _native_purchase(h)





def _native_return_rate(h: Holding) -> Decimal:

    if h.return_rate is not None:

        return Decimal(h.return_rate)

    purchase = _native_purchase(h)

    pnl = _native_pnl(h)

    return (pnl / purchase * Decimal("100")) if purchase > 0 else Decimal("0")





def _to_krw(amount: Decimal, currency: str, fx: Decimal | None) -> Decimal:

    if currency == "USD" and fx and fx > 0:

        return (amount * fx).quantize(Decimal("0.01"))

    return amount.quantize(Decimal("0.01"))





def holding_unrealized_pnl_krw(h: Holding, fx: Decimal | None) -> Decimal:

    currency = _holding_currency(h)

    if currency == "USD" and (fx is None or fx <= 0):

        return Decimal("0")

    return _to_krw(_native_pnl(h), currency, fx)





def holdings_unrealized_pnl_krw(holdings: list[Holding], fx: Decimal | None) -> Decimal:

    total = Decimal("0")

    for h in holdings:

        total += holding_unrealized_pnl_krw(h, fx)

    return total.quantize(Decimal("0.01"))





def holding_detail_dict(h: Holding, fx: Decimal | None) -> dict:

    currency = _holding_currency(h)

    purchase = _native_purchase(h)

    evaluation = _native_evaluation(h)

    pnl = _native_pnl(h)

    return_rate = _native_return_rate(h)

    orderable = h.orderable_quantity if h.orderable_quantity is not None else h.quantity

    return {

        "orderable_quantity": orderable,

        "purchase_amount": float(purchase),

        "evaluation_amount": float(evaluation),

        "profit_loss": float(pnl),

        "return_rate": float(return_rate.quantize(Decimal("0.0001"))),

        "currency": currency,

        "purchase_amount_krw": float(_to_krw(purchase, currency, fx)),

        "evaluation_amount_krw": float(_to_krw(evaluation, currency, fx)),

        "profit_loss_krw": float(_to_krw(pnl, currency, fx)),

    }





def portfolio_summary_dict(

    account: Account,

    holdings: list[Holding],

    fx: Decimal | None,

) -> dict:

    cash = Decimal(account.cash_balance)

    eval_krw = Decimal("0")

    purchase_krw = Decimal("0")

    pnl_krw = Decimal("0")

    for h in holdings:

        currency = _holding_currency(h)

        eval_krw += _to_krw(_native_evaluation(h), currency, fx)

        purchase_krw += _to_krw(_native_purchase(h), currency, fx)

        pnl_krw += holding_unrealized_pnl_krw(h, fx)

    return_rate = (pnl_krw / purchase_krw * Decimal("100")) if purchase_krw > 0 else Decimal("0")

    total_assets = cash + eval_krw

    return {

        "total_deposit": float(cash),

        "total_assets": float(total_assets),

        "evaluation_amount": float(eval_krw),

        "purchase_amount": float(purchase_krw),

        "profit_loss": float(pnl_krw),

        "return_rate": float(return_rate.quantize(Decimal("0.0001"))),

    }


