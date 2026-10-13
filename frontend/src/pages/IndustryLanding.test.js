// Industry pages: draft copy renders per route/language and pre-fills the waitlist form.
const { TextEncoder, TextDecoder } = require("util");
Object.assign(globalThis, { TextEncoder, TextDecoder });
const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");
const { MemoryRouter } = require("react-router");
jest.mock("react-router-dom", () => jest.requireActual("react-router"));
jest.mock("../components/TurnstileWidget", () => () => null);
jest.mock("../components/DemoCall", () => () => null);
jest.mock("../lib/api", () => ({ api: { get: () => Promise.resolve({ data: [] }), post: () => Promise.resolve({ data: {} }) }, errMessage: (e) => String(e) }));
require("../i18n");
const IndustryLanding = require("./IndustryLanding").default;
const { INDUSTRY_SLUGS, industryPage } = require("../config/industries");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// The pages ship in the waitlist-only build; isWaitlistOnly() reads this at render time.
beforeAll(() => { process.env.REACT_APP_WAITLIST_ONLY = "true"; });
afterAll(() => { delete process.env.REACT_APP_WAITLIST_ONLY; });

function mount(slug, lang) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(<MemoryRouter><IndustryLanding slug={slug} lang={lang} /></MemoryRouter>); });
  return { el, done: () => { act(() => root.unmount()); el.remove(); } };
}

test.each(INDUSTRY_SLUGS.flatMap((s) => [[s, "en"], [s, "es"]]))("%s (%s) renders its copy and the waitlist form", (slug, lang) => {
  const { copy } = industryPage(slug, lang);
  const { el, done } = mount(slug, lang);
  expect(el.querySelector(`[data-testid="industry-page-${slug}"]`).getAttribute("lang")).toBe(lang);
  expect(el.querySelector("h1").textContent).toBe(copy.title);
  expect(el.querySelector('[data-testid="waitlist-form"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="waitlist-industry"]').value).toBe(copy.formIndustry);
  // Only the waitlist claims: product sections (features, demo, FAQ, preview chat) are hidden.
  expect(el.querySelector("#features")).toBeNull();
  expect(el.querySelector("#faq")).toBeNull();
  expect(el.querySelector('[data-testid="industry-points"]').textContent).toContain(copy.points[0]);
  done();
});

test("unknown slug returns no page data", () => {
  expect(industryPage("dental")).toBeNull();
});
