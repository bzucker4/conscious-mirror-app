import Stripe from "stripe";

// Server only. Returns null when Stripe is not configured so routes can answer 503.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function siteUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export function priceIdFor(plan: string): string | null {
  if (plan === "monthly") return process.env.STRIPE_PRICE_ID_MONTHLY || null;
  if (plan === "yearly") return process.env.STRIPE_PRICE_ID_YEARLY || null;
  return null;
}
