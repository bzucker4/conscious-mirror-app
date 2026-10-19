import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;
const HTTP_UNAVAILABLE = 503;

export async function POST(req: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !admin || !secret) return new NextResponse("Not configured", { status: HTTP_UNAVAILABLE });

  // The signature is computed over the exact raw body, so read text, never JSON.
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: HTTP_BAD_REQUEST });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: HTTP_BAD_REQUEST });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId && session.payment_status === "paid") {
      const { error } = await admin.from("usage").upsert({ user_id: userId, is_paid: true }, { onConflict: "user_id" });
      // A non-2xx makes Stripe retry, so a transient database error is not lost.
      if (error) {
        console.error("stripe-webhook: could not mark user paid:", error.message);
        return new NextResponse("Database error", { status: HTTP_SERVER_ERROR });
      }
    }
  }
  return NextResponse.json({ received: true });
}
