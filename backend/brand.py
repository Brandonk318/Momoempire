"""Public brand used in emails, invoices and widget text. One central setting.

Brand ON HOLD until the DBA is registered: defaults are neutral placeholders. Override with
BRAND_NAME / BRAND_SLOGAN; keep in sync with the frontend's REACT_APP_BRAND_NAME / _SLOGAN.
"""
import os

DEFAULT_BRAND_NAME = "Your Business Name"
DEFAULT_BRAND_SLOGAN = "Your slogan here"


def brand_name() -> str:
    return (os.environ.get("BRAND_NAME") or "").strip() or DEFAULT_BRAND_NAME


def brand_slogan() -> str:
    return (os.environ.get("BRAND_SLOGAN") or "").strip() or DEFAULT_BRAND_SLOGAN
