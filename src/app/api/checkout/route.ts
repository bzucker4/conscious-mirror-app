import { NextResponse } from "next/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const BEARER_PREFIX = "Bearer ";
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_GATEWAY = 502;

const reply = (body: Record<string, unknown>, status?: number) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : "";
  if (!token) return reply({ error: "Please sign in." }, HTTP_UNAUTHORIZED);

  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID_UNLIMITED;
  if (!admin || !stripe || !priceId) return reply({ error: "Checkout is not configured." }, HTTP_UNAVAILABLE);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply({ error: "Your session has expired. Please sign in again." }, HTTP_UNAUTHORIZED);

  try {
    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: data.user.id,
      customer_email: data.user.email ?? undefined,
      success_url: `${base}/dashboard?paid=1`,
      cancel_url: `${base}/reflect`,
    });
    return reply({ url: session.url });
  } catch (err) {
    console.error("checkout: could not create session:", err instanceof Error ? err.message : "unknown");
    return reply({ error: "We could not start checkout. Please try again." }, HTTP_BAD_GATEWAY);
  }
}
