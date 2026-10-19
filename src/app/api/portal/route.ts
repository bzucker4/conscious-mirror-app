import { NextResponse } from "next/server";
import { getStripe, siteUrl } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const BEARER_PREFIX = "Bearer ";
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_UNAVAILABLE = 503;
const HTTP_BAD_GATEWAY = 502;

const reply = (body: Record<string, unknown>, status?: number) => NextResponse.json(body, { status });

// Sends a paying member to Stripe's hosted page to cancel, switch plan or update their card.
export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : "";
  if (!token) return reply({ error: "Please sign in." }, HTTP_UNAUTHORIZED);

  const admin = getSupabaseAdmin();
  const stripe = getStripe();
  if (!admin || !stripe) return reply({ error: "Billing is not configured." }, HTTP_UNAVAILABLE);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply({ error: "Your session has expired. Please sign in again." }, HTTP_UNAUTHORIZED);

  const { data: row } = await admin.from("usage").select("stripe_customer_id").eq("user_id", data.user.id).maybeSingle();
  if (!row?.stripe_customer_id) return reply({ error: "No subscription found." }, HTTP_NOT_FOUND);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${siteUrl(req)}/dashboard`,
    });
    return reply({ url: session.url });
  } catch (err) {
    console.error("portal: could not create session:", err instanceof Error ? err.message : "unknown");
    return reply({ error: "We could not open billing. Please try again." }, HTTP_BAD_GATEWAY);
  }
}
