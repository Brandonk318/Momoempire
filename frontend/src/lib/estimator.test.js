import { matchPlan, requirementsFrom, standardPlans, formatPrice } from "./estimator";
import { ESTIMATOR_RULES, ESTIMATOR_RULES_STATUS } from "../config/estimatorRules";

// Mirrors DEFAULT_PLANS in backend/routers/plans.py (shape of GET /api/plans).
const PLANS = [
  { key: "trial", name: "Free Trial / Sandbox", price_cents: 0, sort_order: 1,
    limits: { calls: 50, sms: 100, locations: 1, users: 1 } },
  { key: "starter", name: "Starter", price_cents: 1999, sort_order: 10,
    limits: { calls: 150, sms: 300, locations: 1, users: 2 } },
  { key: "growth", name: "Growth", price_cents: 4999, sort_order: 20,
    limits: { calls: 500, sms: 1000, locations: 1, users: 5 } },
  { key: "ai_office", name: "AI Office", price_cents: 9999, sort_order: 30,
    limits: { calls: 1500, sms: 3000, locations: 2, users: 10 } },
  { key: "high_volume", name: "High Volume", price_cents: 19999, sort_order: 40,
    limits: { calls: 4000, sms: 8000, locations: 5, users: 25 } },
  { key: "enterprise", name: "Enterprise", price_cents: 0, interval: "custom", sort_order: 50, limits: {} },
];

const base = { callsBand: "calls_1", smsBand: "sms_1", locations: 1, users: 1, capabilities: [] };
const keyOf = (a, plans = PLANS) => {
  const r = matchPlan({ ...base, ...a }, plans);
  return r.status === "ok" ? r.plan.key : r.status;
};

test("rules file is marked placeholder", () => {
  expect(ESTIMATOR_RULES_STATUS).toMatch(/PLACEHOLDER — Brann to confirm/);
});

test("smallest answers -> Starter (trial and enterprise never matched as standard)", () => {
  expect(keyOf({})).toBe("starter");
  expect(standardPlans(PLANS).map((p) => p.key)).toEqual(["starter", "growth", "ai_office", "high_volume"]);
});

test.each([
  ["calls_1", "starter"], ["calls_2", "growth"], ["calls_3", "ai_office"], ["calls_4", "high_volume"], ["calls_5", "custom"],
])("call band %s -> %s", (band, expected) => {
  expect(keyOf({ callsBand: band })).toBe(expected);
});

test.each([
  ["sms_0", "starter"], ["sms_1", "starter"], ["sms_2", "growth"], ["sms_3", "ai_office"], ["sms_4", "high_volume"], ["sms_5", "custom"],
])("sms band %s -> %s", (band, expected) => {
  expect(keyOf({ smsBand: band })).toBe(expected);
});

test.each([
  [{ users: 2 }, "starter"], [{ users: 3 }, "growth"], [{ users: 5 }, "growth"], [{ users: 6 }, "ai_office"],
  [{ users: 10 }, "ai_office"], [{ users: 11 }, "high_volume"], [{ users: 25 }, "high_volume"], [{ users: 26 }, "custom"],
  [{ locations: 1 }, "starter"], [{ locations: 2 }, "ai_office"], [{ locations: 5 }, "high_volume"], [{ locations: 6 }, "custom"],
])("boundary %o -> %s", (a, expected) => {
  expect(keyOf(a)).toBe(expected);
});

test("Custom only when beyond High Volume on some metric; reports exceeded metrics", () => {
  const atTop = matchPlan({ ...base, callsBand: "calls_4", smsBand: "sms_4", locations: 5, users: 25 }, PLANS);
  expect(atTop.status).toBe("ok");
  expect(atTop.plan.key).toBe("high_volume");
  const beyond = matchPlan({ ...base, users: 26, locations: 6 }, PLANS);
  expect(beyond.status).toBe("custom");
  expect(beyond.plan.key).toBe("enterprise");
  expect(beyond.exceeded.sort()).toEqual(["locations", "users"]);
});

test("capabilities raise the minimum tier (placeholder mapping)", () => {
  expect(keyOf({ capabilities: ["ai_receptionist"] })).toBe("starter");
  expect(keyOf({ capabilities: ["booking"] })).toBe("growth");
  expect(keyOf({ capabilities: ["reviews"] })).toBe("ai_office");
  expect(keyOf({ capabilities: ["sales_intel", "growth_autopilot", "payments"] })).toBe("starter"); // null = any paid plan
  expect(keyOf({ capabilities: ["booking"], users: 11 })).toBe("high_volume");
  expect(keyOf({ capabilities: ["reviews"], users: 26 })).toBe("custom");
});

test("uses runtime limits, not hardcoded numbers", () => {
  const bigger = PLANS.map((p) => (p.key === "starter" ? { ...p, limits: { ...p.limits, users: 50 } } : p));
  expect(keyOf({ users: 40 }, bigger)).toBe("starter");
});

test("missing plan data -> unavailable (no prices, no guess)", () => {
  for (const plans of [undefined, null, [], "oops", [{ key: "trial", price_cents: 0, limits: {} }]]) {
    const r = matchPlan(base, plans);
    expect(r.status).toBe("unavailable");
    expect(r.plan).toBeNull();
  }
});

test("partial plan data: missing tiers skipped with warnings; unknown limit never matched", () => {
  const partial = PLANS.filter((p) => p.key !== "growth");
  const r = matchPlan({ ...base, users: 3 }, partial);
  expect(r.plan.key).toBe("ai_office");
  expect(r.warnings).toContain("missing_plan:growth");
  const noUsersLimit = PLANS.map((p) => (p.key === "starter" ? { ...p, limits: { calls: 150, sms: 300, locations: 1 } } : p));
  expect(keyOf({ users: 1 }, noUsersLimit)).toBe("growth");
  const noEnterprise = PLANS.filter((p) => p.key !== "enterprise");
  const c = matchPlan({ ...base, callsBand: "calls_5" }, noEnterprise);
  expect(c.status).toBe("custom");
  expect(c.plan).toBeNull();
});

test("capability whose min plan is missing from data is ignored with a warning", () => {
  const noAiOffice = PLANS.filter((p) => p.key !== "ai_office");
  const r = matchPlan({ ...base, capabilities: ["reviews"] }, noAiOffice);
  expect(r.plan.key).toBe("starter");
  expect(r.warnings).toContain("capability_plan_missing:reviews");
});

test("requirements parsing ignores junk", () => {
  expect(requirementsFrom({ callsBand: "nope", users: "abc", locations: -2 })).toEqual({
    calls: undefined, sms: undefined, locations: undefined, users: undefined,
  });
});

test("prices are exact, never rounded", () => {
  expect(formatPrice(1999)).toBe("$19.99");
  expect(formatPrice(4999)).toBe("$49.99");
  expect(formatPrice(9999)).toBe("$99.99");
  expect(formatPrice(19999)).toBe("$199.99");
});
