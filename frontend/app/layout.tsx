import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { AudioLines } from "lucide-react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minutes — meeting summarizer",
  description: "Upload a meeting recording, get a transcript, summary and action items.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="border-b border-line">
            <div className="mx-auto flex h-14 max-w-4xl items-center px-4 sm:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid size-7 place-items-center rounded-md bg-accent text-white">
                  <AudioLines className="size-4" />
                </span>
                Minutes
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
