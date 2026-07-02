// Central switchboard to temporarily hide UI entry points during demos/testing
// without deleting the underlying feature. Flip any flag back to `true` to
// restore that entry point — the routes and logic behind them are untouched.
export const featureFlags = {
  showLabLoginButton: false,
  showMarketplaceNav: false,
  showOrdersNav: false,
  showSettingsNav: false,
  showCartButton: false,
  showDefaultConvatecBranding: false,
} as const;
