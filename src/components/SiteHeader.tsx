import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
      <Link href="/" className="font-serif text-lg">
        The Conscious Mirror
      </Link>
      <nav className="flex gap-5 text-sm text-stone-600">
        <Link href="/reflect">Reflect</Link>
        <Link href="/dashboard">History</Link>
      </nav>
    </header>
  );
}
