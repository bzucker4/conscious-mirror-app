"use client";

import { useState } from "react";
import { PAID_LIMIT, PRICES, type Plan } from "@/lib/config";
import { startCheckout } from "@/lib/session";

const PLANS: Plan[] = ["yearly", "monthly"];

export default function UpgradeOptions() {
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  const choose = async (plan: Plan) => {
    setBusy(plan);
    setError("");
    const message = await startCheckout(plan);
    if (message) {
      setError(message);
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <p className="font-serif text-xl">Keep going with your reflections</p>
      <p className="mt-2 text-sm text-stone-600">
        Up to {PAID_LIMIT} reflections every 30 days. Cancel any time from your dashboard.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <button
            key={plan}
            onClick={() => choose(plan)}
            disabled={busy !== null}
            className={`rounded-xl px-5 py-4 text-left disabled:opacity-50 ${
              plan === "yearly" ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-800"
            }`}
          >
            <span className="block font-medium">{PRICES[plan].label}</span>
            <span className="block text-sm opacity-80">
              {PRICES[plan].display}
              {"note" in PRICES[plan] ? ` · ${PRICES[plan].note}` : ""}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
