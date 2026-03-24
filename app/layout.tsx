import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
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
        <MistakesProvider>{children}</MistakesProvider>
      </body>
    </html>
  );
}
