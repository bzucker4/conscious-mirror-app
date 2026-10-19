import { NextResponse } from "next/server";
import { FREE_LIMIT } from "@/lib/config";
import { buildUserMessage, getModelConfig, getSystemPrompt } from "@/lib/mirror";
import { CRISIS_MESSAGE, detectCrisis } from "@/lib/safety";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseAnswers } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const BEARER_PREFIX = "Bearer ";
const MAX_OUTPUT_TOKENS = 700;
const TEMPERATURE = 0.7;

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;

const STATUS = {
  badRequest: HTTP_BAD_REQUEST,
  unauthorized: HTTP_UNAUTHORIZED,
  limitReached: HTTP_PAYMENT_REQUIRED,
  badGateway: HTTP_BAD_GATEWAY,
  unavailable: HTTP_UNAVAILABLE,
} as const;

const reply = (body: Record<string, unknown>, status?: number) =>
  NextResponse.json(body, { status });

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  return header.slice(BEARER_PREFIX.length) || null;
}

type Quota = { allowed: boolean; remaining: number };

function readQuota(data: unknown): Quota | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (typeof row !== "object" || row === null) return null;
  const { allowed, remaining } = row as { allowed?: unknown; remaining?: unknown };
  if (typeof allowed !== "boolean" || typeof remaining !== "number") return null;
  return { allowed, remaining };
}

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return reply({ error: "Please sign in." }, STATUS.unauthorized);

  const admin = getSupabaseAdmin();
  if (!admin) return reply({ error: "Service is not configured." }, STATUS.unavailable);

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return reply({ error: "Your session has expired. Please sign in again." }, STATUS.unauthorized);
  }
  const userId = authData.user.id;

  const body: unknown = await req.json().catch(() => null);
  const parsed = parseAnswers(body);
  if (!parsed.ok) return reply({ error: parsed.error }, STATUS.badRequest);

  // Safety first: no model call, no storage, and no reflection spent.
  if (detectCrisis(Object.values(parsed.answers).join("\n"))) {
    return reply({ crisis: true, message: CRISIS_MESSAGE });
  }

  // Atomic, server-side free-limit check (see supabase/schema.sql).
  const { data: quotaData, error: quotaError } = await admin.rpc("consume_reflection", {
    p_user: userId,
    p_limit: FREE_LIMIT,
  });
  const quota = quotaError ? null : readQuota(quotaData);
  if (!quota) return reply({ error: "Usage check failed. Please try again." }, STATUS.unavailable);
  if (!quota.allowed) {
    return reply(
      {
        error: "limit",
        message: `You have used your ${FREE_LIMIT} free reflections for this 30-day period.`,
        remaining: 0,
      },
      STATUS.limitReached,
    );
  }

  try {
    const { client, model } = getModelConfig();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: buildUserMessage(parsed.answers) },
      ],
    });

    const reflection = completion.choices[0]?.message?.content?.trim();
    if (!reflection) throw new Error("The model returned an empty response.");

    const { error: saveError } = await admin.from("reflections").insert({
      user_id: userId,
      question: parsed.answers.question,
      answers: parsed.answers,
      reflection,
    });
    // Never log what the person wrote; log only that saving failed.
    if (saveError) console.error("reflect: could not save reflection:", saveError.message);

    return reply({ reflection, remaining: quota.remaining });
  } catch (err) {
    await admin.rpc("refund_reflection", { p_user: userId });
    console.error("reflect: model call failed:", err instanceof Error ? err.message : "unknown");
    return reply(
      { error: "We could not create your reflection. It was not counted against your limit. Please try again." },
      STATUS.badGateway,
    );
  }
}
