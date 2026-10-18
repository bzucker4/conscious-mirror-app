import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Conscious Mirror",
  description: "See your question from another angle. Instant reflective response shaped by your own words.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
