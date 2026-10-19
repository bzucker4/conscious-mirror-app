"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UpgradeOptions from "@/components/UpgradeOptions";
import { PAID_LIMIT, QUESTIONS, type Answers } from "@/lib/config";
import { getAccessToken } from "@/lib/session";

type View =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "result"; reflection: string; remaining: number; paid: boolean }
  | { kind: "notice"; title: string; message: string; upgrade?: boolean };

type ReflectReply = {
  reflection?: string;
  remaining?: number;
  paid?: boolean;
  crisis?: boolean;
  message?: string;
  error?: string;
};

const EMPTY_ANSWERS = Object.fromEntries(QUESTIONS.map((q) => [q.key, ""])) as Answers;
const LAST_STEP = QUESTIONS.length - 1;

function readReply(data: unknown): ReflectReply {
  if (typeof data !== "object" || data === null) return {};
  return data as ReflectReply;
}

function remainingLabel(remaining: number, paid: boolean): string {
  const noun = remaining === 1 ? "reflection" : "reflections";
  return paid
    ? `${remaining} of ${PAID_LIMIT} reflections left in this period.`
    : `${remaining} free ${noun} left in this period.`;
}

export default function ReflectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [view, setView] = useState<View>({ kind: "form" });
  const [error, setError] = useState("");

  useEffect(() => {
    const requireSignIn = async () => {
      const token = await getAccessToken();
      if (!token) router.replace("/auth");
    };
    void requireSignIn();
  }, [router]);

  const question = QUESTIONS[step];
  const canAdvance = !question.required || Boolean(answers[question.key].trim());

  const reset = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep(0);
    setError("");
    setView({ kind: "form" });
  };

  const submit = async () => {
    setError("");
    setView({ kind: "sending" });
    const token = await getAccessToken();
    if (!token) {
      router.replace("/auth");
      return;
    }
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      });
      const data = readReply(await res.json().catch(() => null));

      if (data.crisis) {
        setView({ kind: "notice", title: "Please take care of yourself first", message: data.message ?? "" });
      } else if (data.reflection) {
        setView({ kind: "result", reflection: data.reflection, remaining: data.remaining ?? 0, paid: data.paid ?? false });
      } else if (data.error === "limit") {
        setView({
          kind: "notice",
          title: data.paid ? "You have reached this period's limit" : "You have reached your free limit",
          message: data.message ?? "",
          upgrade: !data.paid,
        });
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
        setView({ kind: "form" });
      }
    } catch {
      setError("Network error. Please try again.");
      setView({ kind: "form" });
    }
  };

  if (view.kind === "sending") {
    return (
      <main className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="font-serif text-2xl">Sitting with your words…</p>
        <p className="mt-3 text-sm text-stone-500">This usually takes a few seconds.</p>
      </main>
    );
  }

  if (view.kind === "notice") {
    return (
      <main className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-3xl mb-5">{view.title}</h1>
        <p className="whitespace-pre-wrap text-stone-700 leading-relaxed">{view.message}</p>
        {view.upgrade && (
          <div className="mt-8">
            <UpgradeOptions />
          </div>
        )}
        <div>
          <button onClick={reset} className="mt-6 text-sm text-stone-500 underline">
            Start over
          </button>
        </div>
      </main>
    );
  }

  if (view.kind === "result") {
    return (
      <main className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-3xl mb-6">Your reflection</h1>
        <div className="whitespace-pre-wrap leading-relaxed text-stone-800 rounded-2xl border border-stone-200 bg-white p-6">
          {view.reflection}
        </div>
        <p className="mt-4 text-sm text-stone-500">{remainingLabel(view.remaining, view.paid)}</p>
        {!view.paid && view.remaining === 1 && (
          <div className="mt-6">
            <UpgradeOptions />
          </div>
        )}
        <p className="mt-2 text-xs text-stone-400">
          A reflection tool, not therapy or advice. You decide what, if anything, is useful.
        </p>
        <div className="mt-8 flex gap-4">
          <button onClick={reset} className="rounded-full bg-stone-900 text-white px-6 py-3">
            Begin another
          </button>
          <Link href="/dashboard" className="rounded-full border border-stone-300 px-6 py-3 text-stone-700">
            View history
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-3">
        {question.label} · {step + 1} of {QUESTIONS.length}
      </p>
      <h1 className="font-serif text-3xl mb-2">{question.prompt}</h1>
      <p className="text-sm text-stone-500 mb-5">{question.hint}</p>
      <textarea
        value={answers[question.key]}
        onChange={(e) => setAnswers({ ...answers, [question.key]: e.target.value })}
        rows={7}
        maxLength={2000}
        className="w-full p-4 border border-stone-300 rounded-xl bg-white leading-relaxed"
        placeholder="Write as much or as little as you like."
      />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={!step}
          className="text-sm text-stone-500 underline disabled:opacity-30"
        >
          Back
        </button>
        {step === LAST_STEP ? (
          <button
            onClick={submit}
            disabled={!canAdvance}
            className="rounded-full bg-stone-900 text-white px-8 py-3 disabled:opacity-40"
          >
            Receive my reflection
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance}
            className="rounded-full bg-stone-900 text-white px-8 py-3 disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}
