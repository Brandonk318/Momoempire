"""Public brand used in emails, invoices and widget text. One central setting.

PROVISIONAL, NOT legally cleared (name and slogan are already used by others). Override with
BRAND_NAME / BRAND_SLOGAN; keep in sync with the frontend's REACT_APP_BRAND_NAME / _SLOGAN.
"""
import os

DEFAULT_BRAND_NAME = "The HVAC Empire AI Office"
DEFAULT_BRAND_SLOGAN = "Never Miss Another Service Call"


def brand_name() -> str:
    return (os.environ.get("BRAND_NAME") or "").strip() or DEFAULT_BRAND_NAME


def brand_slogan() -> str:
    return (os.environ.get("BRAND_SLOGAN") or "").strip() or DEFAULT_BRAND_SLOGAN
