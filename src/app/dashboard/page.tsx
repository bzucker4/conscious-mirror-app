"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UpgradeOptions from "@/components/UpgradeOptions";
import { FREE_LIMIT, PAID_LIMIT, remainingReflections, type UsageRow } from "@/lib/config";
import { openBilling } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

type SavedReflection = {
  id: string;
  question: string | null;
  reflection: string | null;
  created_at: string;
};

const HISTORY_LIMIT = 50;

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedReflection[]>([]);
  const [remaining, setRemaining] = useState<number>(FREE_LIMIT);
  const [isPaid, setIsPaid] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unconfigured">("loading");

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setStatus("unconfigured");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/auth");
        return;
      }
      const [history, usage] = await Promise.all([
        supabase
          .from("reflections")
          .select("id, question, reflection, created_at")
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT),
        supabase.from("usage").select("count, period_start, is_paid").maybeSingle(),
      ]);
      setItems((history.data ?? []) as SavedReflection[]);
      const usageRow = (usage.data ?? null) as UsageRow | null;
      setRemaining(remainingReflections(usageRow));
      setIsPaid(Boolean(usageRow?.is_paid));
      setJustPaid(new URLSearchParams(window.location.search).get("paid") === "1");
      setStatus("ready");
    };
    void load();
  }, [router]);

  const remove = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("reflections").delete().eq("id", id);
    if (!error) setItems(items.filter((item) => item.id !== id));
  };

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    router.push("/");
  };

  if (status === "unconfigured") {
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-stone-600">
        Supabase is not configured. Add the environment variables from .env.example.
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">Your reflections</h1>
          <p className="text-sm text-stone-500 mt-1">
            {isPaid
              ? `${remaining} of ${PAID_LIMIT} reflections left in this period.`
              : `${remaining} of ${FREE_LIMIT} free reflections left in this period.`}
          </p>
        </div>
        <Link href="/reflect" className="rounded-full bg-stone-900 text-white px-6 py-2.5 text-sm">
          New reflection
        </Link>
      </div>

      {justPaid && isPaid && (
        <p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">
          Thank you. Your membership is active.
        </p>
      )}
      {status === "ready" && !isPaid && (
        <div className="mb-8">
          <UpgradeOptions />
        </div>
      )}

      {status === "loading" && <p className="text-stone-500">Loading…</p>}
      {status === "ready" && !items.length && (
        <p className="text-stone-500">Nothing here yet. Your reflections will appear after you begin one.</p>
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="w-full text-left"
            >
              <p className="text-xs text-stone-400">{new Date(item.created_at).toLocaleDateString()}</p>
              <p className="font-serif text-lg mt-1">{item.question || "Untitled question"}</p>
            </button>
            {openId === item.id && (
              <div className="mt-4">
                <p className="whitespace-pre-wrap leading-relaxed text-stone-800">{item.reflection}</p>
                <button onClick={() => remove(item.id)} className="mt-4 text-sm text-red-700 underline">
                  Delete this reflection
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isPaid && (
        <div className="mt-10">
          <button
            onClick={async () => setBillingError((await openBilling()) ?? "")}
            className="text-sm text-stone-600 underline"
          >
            Manage or cancel membership
          </button>
          {billingError && <p className="mt-2 text-sm text-red-700">{billingError}</p>}
        </div>
      )}

      <button onClick={signOut} className="mt-6 block text-sm text-stone-500 underline">
        Sign out
      </button>
    </main>
  );
}
