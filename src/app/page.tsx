import Link from "next/link";
import { FREE_LIMIT } from "@/lib/config";

const STEPS = [
  { title: "Bring one question", body: "Say it plainly. It does not need to be neat." },
  { title: "Sit with a short guided form", body: "Five prompts, in your own words, at your own pace." },
  { title: "Receive a reflection", body: "A written response shaped only by what you wrote. Not a diagnosis, not advice." },
] as const;

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-6">
      <section className="py-20 md:py-28 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-5">The Conscious Mirror</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-tight">
          The questions beneath who you think you are.
        </h1>
        <p className="mt-6 text-lg text-stone-600 leading-relaxed">
          Bring one question. Sit with a guided form. Receive a written reflection shaped by your own
          words. Not a diagnosis, not a guru, not a book.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/reflect" className="rounded-full bg-stone-900 text-white px-8 py-3.5 font-medium">
            Begin a reflection
          </Link>
          <Link href="/auth" className="rounded-full border border-stone-300 px-8 py-3.5 text-stone-700">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          {FREE_LIMIT} free reflections every 30 days.
        </p>
      </section>

      <section className="pb-16">
        <ol className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Step {i + 1}</p>
              <h2 className="font-serif text-xl mb-2">{step.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pb-24 text-center text-sm text-stone-500 leading-relaxed">
        <p>
          The Conscious Mirror is a reflection tool. It is not therapy, medical advice, or a crisis
          service. If you are in danger or thinking about ending your life, call or text 988 (US) or
          visit findahelpline.com.
        </p>
      </section>
    </div>
  );
}
