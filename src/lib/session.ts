import { getSupabase } from "./supabase";

// Returns the signed-in user's access token, or null when signed out
// (or when Supabase is not configured).
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// Starts Stripe Checkout and sends the browser there. Returns an error message, or null on redirect.
export async function startCheckout(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return "Please sign in.";
  const res = await fetch("/api/checkout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const data: { url?: string; error?: string } | null = await res.json().catch(() => null);
  if (!data?.url) return data?.error ?? "We could not start checkout.";
  window.location.assign(data.url);
  return null;
}
