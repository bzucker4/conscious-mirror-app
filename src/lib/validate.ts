import {
  MAX_FIELD_CHARS,
  MAX_TOTAL_CHARS,
  QUESTIONS,
  type AnswerKey,
  type Answers,
} from "./config";

export type ParseResult =
  | { ok: true; answers: Answers }
  | { ok: false; error: string };

function readField(raw: Record<string, unknown>, key: AnswerKey): string {
  const value = raw[key];
  return typeof value === "string" ? value.trim() : "";
}

function fieldError(question: (typeof QUESTIONS)[number], text: string): string | null {
  if (question.required && !text) return `Please answer: ${question.prompt}`;
  if (text.length > MAX_FIELD_CHARS) {
    return `"${question.label}" is too long (max ${MAX_FIELD_CHARS} characters).`;
  }
  return null;
}

export function parseAnswers(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request." };
  }
  const raw = (body as { answers?: unknown }).answers;
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Missing answers." };
  }
  const fields = raw as Record<string, unknown>;

  const entries = QUESTIONS.map((q) => {
    const text = readField(fields, q.key);
    return { key: q.key, text, error: fieldError(q, text) };
  });

  const firstError = entries.find((e) => e.error)?.error;
  if (firstError) return { ok: false, error: firstError };

  const total = entries.reduce((sum, e) => sum + e.text.length, 0);
  if (total > MAX_TOTAL_CHARS) {
    return { ok: false, error: "Your answers are too long overall. Please shorten them." };
  }

  const answers = Object.fromEntries(entries.map((e) => [e.key, e.text])) as Answers;
  return { ok: true, answers };
}
