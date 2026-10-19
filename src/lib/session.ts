import { getSupabase } from "./supabase";

// Returns the signed-in user's access token, or null when signed out
// (or when Supabase is not configured).
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function goToStripe(path: string, body?: Record<string, unknown>): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return "Please sign in.";
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: { url?: string; error?: string } | null = await res.json().catch(() => null);
  if (!data?.url) return data?.error ?? "Something went wrong. Please try again.";
  window.location.assign(data.url);
  return null;
}

// Each returns an error message, or null when the browser is being redirected.
export const startCheckout = (plan: "monthly" | "yearly") => goToStripe("/api/checkout", { plan });
export const openBilling = () => goToStripe("/api/portal");
