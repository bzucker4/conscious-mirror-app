import { getSupabase } from "./supabase";

// Returns the signed-in user's access token, or null when signed out
// (or when Supabase is not configured).
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
