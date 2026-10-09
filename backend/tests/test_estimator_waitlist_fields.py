"""Instant-quote estimator: optional lead fields on POST /api/public/waitlist (no network)."""
from __future__ import annotations

import copy
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "est-test")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "est")

from routers import marketing as mk  # noqa: E402


class FakeColl:
    def __init__(self):
        self.docs = []

    async def find_one(self, q):
        return next((copy.deepcopy(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))


class FakeDB:
    def __init__(self):
        self.waitlist = FakeColl()


@pytest.fixture
def client(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(mk, "get_db", lambda: db)
    monkeypatch.setattr(mk, "_IP_RATE", {})

    async def no_email(**kw):
        return None

    import services.email as email_mod
    monkeypatch.setattr(email_mod, "send_email", no_email)
    app = FastAPI()
    app.include_router(mk.router, prefix="/api")
    return TestClient(app), db


def test_estimator_lead_gets_single_website_form_source(client):
    c, db = client
    r = c.post("/api/public/waitlist", json={"email": "a@example.com", "industry": "HVAC",
                                             "note": "estimator; tier=growth", "source_detail": "estimator",
                                             "estimated_tier": "growth"})
    assert r.status_code == 200, r.text
    d = db.waitlist.docs[0]
    assert d["source"] == "website form"
    assert d["source_detail"] == "estimator"
    assert d["estimated_tier"] == "growth"


def test_landing_signup_unchanged(client):
    c, db = client
    assert c.post("/api/public/waitlist", json={"email": "b@example.com"}).status_code == 200
    d = db.waitlist.docs[0]
    assert d["source"] == "landing" and d["source_detail"] == "" and d["estimated_tier"] == ""


@pytest.mark.parametrize("body", [
    {"source_detail": "ads"},                 # only "estimator" allowed (no new sources)
    {"source": "estimator"},                  # client can't set source directly...
    {"estimated_tier": "x" * 41},
    {"estimated_tier": "Growth <script>"},
])
def test_invalid_estimator_fields(client, body):
    c, db = client
    r = c.post("/api/public/waitlist", json={"email": "c@example.com", **body})
    if "source" in body:
        assert r.status_code == 200 and db.waitlist.docs[0]["source"] == "landing"  # ...it is ignored
    else:
        assert r.status_code == 422 and db.waitlist.docs == []
