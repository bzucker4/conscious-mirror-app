import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;
const HTTP_UNAVAILABLE = 503;

// Subscription states that keep access on. Anything else (canceled, unpaid, ...) turns it off.
const ACTIVE_STATES = new Set<string>(["active", "trialing", "past_due"]);

type Change = { userId: string; isPaid: boolean; customerId?: string };

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | undefined {
  if (!customer) return undefined;
  return typeof customer === "string" ? customer : customer.id;
}

function changeFor(event: Stripe.Event): Change | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.client_reference_id) return null;
      return {
        userId: session.client_reference_id,
        isPaid: true,
        customerId: customerIdOf(session.customer),
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (!userId) return null;
      const isPaid = event.type === "customer.subscription.updated" && ACTIVE_STATES.has(sub.status);
      return { userId, isPaid, customerId: customerIdOf(sub.customer) };
    }
    default:
      return null;
  }
}

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

  const change = changeFor(event);
  if (change) {
    const row: Record<string, unknown> = { user_id: change.userId, is_paid: change.isPaid };
    if (change.customerId) row.stripe_customer_id = change.customerId;
    const { error } = await admin.from("usage").upsert(row, { onConflict: "user_id" });
    // A non-2xx makes Stripe retry, so a transient database error is not lost.
    if (error) {
      console.error("stripe-webhook: could not update membership:", error.message);
      return new NextResponse("Database error", { status: HTTP_SERVER_ERROR });
    }
  }
  return NextResponse.json({ received: true });
}
