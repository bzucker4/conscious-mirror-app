import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Conscious Mirror",
  description: "See your question from another angle. A reflection shaped by your own words.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "The Conscious Mirror",
    description: "See your question from another angle. A reflection shaped by your own words.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
