import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { DuoNav } from "@/components/duo-nav";
import { MistakesProvider } from "@/components/mistakes-provider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Physics Error Bank",
  description: "Capture mistakes with photos, tag them, and review with stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-[var(--duo-text)]">
        <MistakesProvider>
          <header className="sticky top-0 z-40 border-b-2 border-[var(--duo-border)] bg-white/95 px-4 py-3 backdrop-blur-sm">
            <div className="mx-auto flex max-w-lg items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl border-b-4 border-[var(--duo-green-shadow)] bg-[var(--duo-green)] text-lg text-white"
                aria-hidden
              >
                ⚡
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--duo-green-dark)]">
                  Physics Error Bank
                </p>
                <p className="text-base font-black leading-tight text-[var(--duo-text)]">
                  Physics Error Bank
                </p>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <DuoNav />
        </MistakesProvider>
      </body>
    </html>
  );
}
