import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CumulativeLogo } from "../../../src/ui/CumulativeLogo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Design Passport Companion", template: "%s · Design Passport" },
  description: "Local tools for Design Passport reference packs and knowledge review.",
};

export const viewport: Viewport = { themeColor: "#f4f1e8" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="topbar">
          <Link className="brand" href="/" aria-label="Design Passport companion home">
            <CumulativeLogo className="cumulative-logo" />
            <strong>Companion</strong>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/packs/new">Reference pack</Link>
            <Link href="/learnings/import">Import</Link>
            <Link href="/review">Review</Link>
          </nav>
          <span className="local-badge">Private · local</span>
        </header>
        {children}
      </body>
    </html>
  );
}
