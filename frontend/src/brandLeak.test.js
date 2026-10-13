// The internal project name must never reach users. Public sources are always checked; if a
// build exists (e.g. after `REACT_APP_WAITLIST_ONLY=true yarn build`), the bundle is checked too.
const fs = require("fs");
const path = require("path");
const { findLeaks, PATTERN } = require("../scripts/check-brand-leak");
const { DEFAULT_BRAND_NAME, DEFAULT_BRAND_SLOGAN, brandConfig } = require("./config/brand");

const root = path.resolve(__dirname, "..");

test("public HTML and translations never mention the internal name", () => {
  const files = ["public/index.html", ...fs.readdirSync(path.join(root, "src/i18n/locales")).map((f) => `src/i18n/locales/${f}`)];
  const leaks = files.filter((f) => PATTERN.test(fs.readFileSync(path.join(root, f), "utf8")));
  expect(leaks).toEqual([]);
});

test("built bundle (if present) never mentions the internal name", () => {
  const build = path.join(root, "build");
  if (!fs.existsSync(build)) return;
  expect(findLeaks(build)).toEqual([]);
});

test("brand comes from env with the provisional defaults", () => {
  expect(brandConfig({})).toEqual({ name: DEFAULT_BRAND_NAME, slogan: DEFAULT_BRAND_SLOGAN });
  expect(brandConfig({ REACT_APP_BRAND_NAME: " Acme ", REACT_APP_BRAND_SLOGAN: "Hi" })).toEqual({ name: "Acme", slogan: "Hi" });
});
