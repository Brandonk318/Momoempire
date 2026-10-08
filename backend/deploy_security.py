"""CORS origin validation for Cloudflare-2 deployments."""
import os
from urllib.parse import urlsplit


def cors_options():
    environment = os.getenv("APP_ENV", "development").lower()
    strict = environment in ("production", "staging")
    configured = os.getenv("CORS_ORIGINS", "").strip()
    if not configured or configured == "*":
        if strict:
            raise RuntimeError("Explicit CORS_ORIGINS required")
        return {"allow_origins": ["*"], "allow_credentials": False,
                "allow_methods": ["*"], "allow_headers": ["*"]}
    origins = list(dict.fromkeys(s.strip().rstrip("/") for s in configured.split(",") if s.strip()))
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or "*" in origin:
            raise ValueError("Invalid CORS origin")
        if strict and parsed.scheme != "https":
            raise ValueError("HTTPS required for staging and production")
    return {"allow_origins": origins, "allow_credentials": True,
            "allow_methods": ["*"], "allow_headers": ["*"]}
