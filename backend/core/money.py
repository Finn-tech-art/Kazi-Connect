from decimal import ROUND_FLOOR, Decimal


def commission_for(amount_kes, percent):
    """Commission in whole shillings.

    Rounded down, so any odd shilling stays with the provider (SR-F-PAY-08).
    """
    commission = Decimal(amount_kes) * Decimal(percent) / 100
    return int(commission.to_integral_value(rounding=ROUND_FLOOR))
