// Safe to import from both server and client code (no dependencies).

export const FREE_LIMIT = 3;
export const FREE_PERIOD_DAYS = 30;
// Fair-use cap for paid members, per 30-day window. Keeps model costs bounded.
export const PAID_LIMIT = 60;

export const PRICES = {
  monthly: { label: "Monthly", display: "$12 / month" },
  yearly: { label: "Yearly", display: "$79 / year", note: "Save 45%" },
} as const;
export type Plan = keyof typeof PRICES;

export const MAX_FIELD_CHARS = 2000;
export const MAX_TOTAL_CHARS = 6000;

export const QUESTIONS = [
  {
    key: "question",
    label: "The question",
    prompt: "What is the one question you are bringing?",
    hint: "Say it plainly, in your own words.",
    required: true,
  },
  {
    key: "scene",
    label: "The scene",
    prompt: "Where does this question show up in your life?",
    hint: "A moment, a place, a conversation.",
    required: true,
  },
  {
    key: "story",
    label: "The story",
    prompt: "What story do you tell yourself about it?",
    hint: "What you believe is true here.",
    required: true,
  },
  {
    key: "fear",
    label: "The fear",
    prompt: "What are you afraid it means?",
    hint: "Or what you are protecting by not looking.",
    required: false,
  },
  {
    key: "shift",
    label: "The shift",
    prompt: "If something shifted, what would you notice first?",
    hint: "Small and specific is fine.",
    required: false,
  },
] as const;

export type AnswerKey = (typeof QUESTIONS)[number]["key"];
export type Answers = Record<AnswerKey, string>;

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export type UsageRow = { count: number | null; period_start: string | null; is_paid: boolean | null };

// Reflections left in the current window, for the user's plan.
export function remainingReflections(usage: UsageRow | null, now: Date = new Date()): number {
  const cap = usage?.is_paid ? PAID_LIMIT : FREE_LIMIT;
  if (!usage?.period_start) return cap;
  const windowEnds = new Date(usage.period_start).getTime() + FREE_PERIOD_DAYS * MS_PER_DAY;
  if (now.getTime() >= windowEnds) return cap;
  return Math.max(cap - (usage.count ?? 0), 0);
}
