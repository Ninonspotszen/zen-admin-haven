export const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/cNi3cn8mf7Ccfp14vfdwc00";

export function portalUrl(email?: string) {
  return email ? `${STRIPE_PORTAL_URL}?prefilled_email=${encodeURIComponent(email)}` : STRIPE_PORTAL_URL;
}
