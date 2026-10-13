// Public brand, set at build time. The real brand is ON HOLD until Brann's DBA is registered, so
// the defaults are neutral placeholders. Set REACT_APP_BRAND_NAME / REACT_APP_BRAND_SLOGAN before
// any public launch.
// Kept as plain CommonJS so craco/site-meta.js (Node) and the app share one source of defaults.
const DEFAULT_BRAND_NAME = "Your Business Name";
const DEFAULT_BRAND_SLOGAN = "Your slogan here";

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

function brandConfig(env = process.env) {
  return {
    name: clean(env.REACT_APP_BRAND_NAME) || DEFAULT_BRAND_NAME,
    slogan: clean(env.REACT_APP_BRAND_SLOGAN) || DEFAULT_BRAND_SLOGAN,
  };
}

// CRA inlines process.env.REACT_APP_* only when referenced literally, so read them here directly.
const BRAND = brandConfig({
  REACT_APP_BRAND_NAME: process.env.REACT_APP_BRAND_NAME,
  REACT_APP_BRAND_SLOGAN: process.env.REACT_APP_BRAND_SLOGAN,
});
const BRAND_NAME = BRAND.name;
const BRAND_SLOGAN = BRAND.slogan;

module.exports = { DEFAULT_BRAND_NAME, DEFAULT_BRAND_SLOGAN, brandConfig, BRAND_NAME, BRAND_SLOGAN };
