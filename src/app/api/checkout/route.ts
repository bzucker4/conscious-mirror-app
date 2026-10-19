import { NextResponse } from "next/server";
import { getStripe, priceIdFor, siteUrl } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const BEARER_PREFIX = "Bearer ";
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_GATEWAY = 502;

const reply = (body: Record<string, unknown>, status?: number) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : "";
  if (!token) return reply({ error: "Please sign in." }, HTTP_UNAUTHORIZED);

  const body: { plan?: unknown } | null = await req.json().catch(() => null);
  const priceId = typeof body?.plan === "string" ? priceIdFor(body.plan) : null;
  if (!priceId) return reply({ error: "Choose monthly or yearly." }, HTTP_BAD_REQUEST);

  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return reply({ error: "Checkout is not configured." }, HTTP_UNAVAILABLE);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply({ error: "Your session has expired. Please sign in again." }, HTTP_UNAUTHORIZED);
  const userId = data.user.id;

  try {
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer_email: data.user.email ?? undefined,
      // Copied onto the subscription so later webhook events can find the user.
      subscription_data: { metadata: { user_id: userId } },
      success_url: `${base}/dashboard?paid=1`,
      cancel_url: `${base}/reflect`,
    });
    return reply({ url: session.url });
  } catch (err) {
    console.error("checkout: could not create session:", err instanceof Error ? err.message : "unknown");
    return reply({ error: "We could not start checkout. Please try again." }, HTTP_BAD_GATEWAY);
  }
}
