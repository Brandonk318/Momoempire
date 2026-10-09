"""EMP-WL-002 — WAITLIST_ONLY mode serves only /api/health and POST /api/public/waitlist.

Each mode runs in a clean subprocess (server.py reads WAITLIST_ONLY at import). Fake DB, no network.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]

_PROBE = r'''
import json, sys
calls = {"seed": 0, "plans": 0}

class Coll:
    def __init__(self): self.docs = []
    async def find_one(self, q, *a, **k):
        return next((d for d in self.docs if all(d.get(x) == y for x, y in q.items())), None)
    async def insert_one(self, d): self.docs.append(dict(d))
    async def create_index(self, *a, **k): return None
    def find(self, *a, **k):
        docs = list(self.docs)
        class Cur:
            def sort(self, *a, **k): return self
            def limit(self, *a, **k): return self
            async def to_list(self, n=None): return docs
        return Cur()

class FakeDB:
    def __init__(self): self.waitlist = Coll()
    async def command(self, *a, **k): return {"ok": 1}
    def __getattr__(self, n):
        if n.startswith("_"): raise AttributeError(n)
        c = Coll(); setattr(self, n, c); return c

FAKE = FakeDB()
import db
db.get_db = lambda: FAKE
async def _noop(): return None
db.close_db = _noop
import seed_data
async def _seed(): calls["seed"] += 1
seed_data.run_all_seeds = _seed
import routers.plans as plans
async def _plans(): calls["plans"] += 1
plans.seed_plans = _plans
import services.email as em
async def _mail(**k): return None
em.send_email = _mail

import server
from fastapi.testclient import TestClient
out = {"startup_handlers": len(server.app.router.on_startup)}
paths = sys.argv[1:]
with TestClient(server.app, raise_server_exceptions=False) as c:   # runs startup/shutdown hooks
    out["health"] = [c.get("/api/health").status_code, c.get("/api/health").json()]
    r = c.post("/api/public/waitlist", json={"email": "wl@example.com"})
    out["waitlist"] = [r.status_code, len(FAKE.waitlist.docs)]
    res = {}
    for spec in paths:
        method, path = spec.split(" ", 1)
        res[spec] = c.request(method, path, json={} if method == "POST" else None).status_code
    out["paths"] = res
out["calls"] = calls
print("RESULT " + json.dumps(out))
'''

BLOCKED = [
    "GET /docs", "GET /redoc", "GET /openapi.json", "GET /api/",
    "POST /api/auth/login", "POST /api/auth/register", "GET /api/auth/me", "POST /api/auth/forgot-password",
    "GET /api/admin/plans", "GET /api/admin/tenants", "GET /api/admin/overview",
    "POST /api/public/demo/start", "POST /api/public/demo/turn",
    "GET /api/plans", "GET /api/industries",                 # used by the /estimate page (PR #12)
    "GET /api/health/deployment",
    "POST /api/cron/followups", "POST /api/cron/overdue-reminders",
    "POST /api/stripe/webhook", "POST /api/stripe/connect-webhook",
    "POST /api/twilio/voice", "POST /api/twilio/sms",
    "GET /api/tenants/me",
]


def _run(waitlist_only: bool):
    env = {k: v for k, v in os.environ.items() if k not in ("WAITLIST_ONLY",)}
    env.update({"JWT_SECRET": "x", "MONGO_URL": "mongodb://localhost:1", "DB_NAME": "x"})
    if waitlist_only:
        env["WAITLIST_ONLY"] = "true"
    p = subprocess.run([sys.executable, "-c", _PROBE, *BLOCKED], cwd=BACKEND, env=env,
                       capture_output=True, text=True, timeout=180)
    assert p.returncode == 0, p.stderr[-3000:]
    line = [l for l in p.stdout.splitlines() if l.startswith("RESULT ")][-1]
    return json.loads(line[len("RESULT "):])


@pytest.fixture(scope="module")
def wl():
    return _run(True)


@pytest.fixture(scope="module")
def full():
    return _run(False)


def test_health_ok_minimal(wl):
    assert wl["health"] == [200, {"status": "ok"}]


def test_waitlist_post_works(wl):
    assert wl["waitlist"] == [200, 1]


@pytest.mark.parametrize("spec", BLOCKED)
def test_everything_else_404(wl, spec):
    assert wl["paths"][spec] == 404, (spec, wl["paths"][spec])


def test_no_seeding_or_startup_hooks(wl):
    assert wl["startup_handlers"] == 0
    assert wl["calls"] == {"seed": 0, "plans": 0}


def test_normal_mode_unchanged_spot_check(full):
    assert full["startup_handlers"] >= 1
    assert full["calls"]["seed"] == 1 and full["calls"]["plans"] == 1  # startup seeding still runs
    assert full["health"][0] == 200 and full["waitlist"] == [200, 1]
    p = full["paths"]
    assert p["GET /openapi.json"] == 200 and p["GET /docs"] == 200
    assert p["GET /api/"] == 200
    assert p["POST /api/public/demo/start"] == 200
    assert p["GET /api/plans"] == 200
    assert p["GET /api/auth/me"] == 401
    assert p["POST /api/auth/login"] == 422   # route exists (empty body fails validation)
    # Every path blocked in waitlist mode is a real route in normal mode (so the 404s are meaningful).
    assert all(code != 404 for code in p.values()), {k: v for k, v in p.items() if v == 404}


def test_flag_parsing(monkeypatch):
    sys.path.insert(0, str(BACKEND))
    import waitlist_mode
    for v, expected in [("true", True), ("1", True), ("ON", True), ("", False), ("false", False), ("no", False)]:
        monkeypatch.setenv("WAITLIST_ONLY", v)
        assert waitlist_mode.waitlist_only_enabled() is expected
    monkeypatch.delenv("WAITLIST_ONLY")
    assert waitlist_mode.waitlist_only_enabled() is False


def test_env_example_name_only():
    ex = (BACKEND / ".env.example").read_text()
    assert "\nWAITLIST_ONLY=\n" in ex
