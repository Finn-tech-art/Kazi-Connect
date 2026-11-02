import re

KENYAN_MOBILE = re.compile(r"^\+254[17]\d{8}$")


def normalize_kenyan_mobile(raw):
    """Turn 0712 345 678, 254712345678 or +254712345678 into +254712345678 (SR-F-ACC-01).

    Returns None if the number is not a Kenyan mobile number.
    """
    number = re.sub(r"[\s\-()]", "", raw or "")
    if number.startswith("0") and len(number) == 10:
        number = "+254" + number[1:]
    elif number.startswith("254"):
        number = "+" + number
    return number if KENYAN_MOBILE.match(number) else None


def mask_phone(phone):
    """+254712345678 -> +254 712 ••• 678, for showing a number without revealing it."""
    return f"{phone[:4]} {phone[4:7]} ••• {phone[-3:]}" if phone else ""
