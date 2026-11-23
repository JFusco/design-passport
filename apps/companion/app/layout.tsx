import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CumulativeLogo } from "../../../src/ui/CumulativeLogo";
import "./globals.css";
import { ContentMotion } from "./components/ContentMotion";

export const metadata: Metadata = {
  title: { default: "Design Passport Companion", template: "%s · Design Passport" },
  description: "Local tools for Design Passport reference packs and knowledge review.",
};

export const viewport: Viewport = { themeColor: "#0e0453" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const fontDirectory = join(process.cwd(), "public", "fonts");
  const hasLocalFonts = ["AeonikVF-Regular.ttf", "AeonikFonoVF-Regular.ttf"]
    .every((file) => existsSync(join(fontDirectory, file)));
  return (
    <html lang="en">
      <body>
        {hasLocalFonts && <link rel="stylesheet" href="/fonts/aeonik.css" precedence="default" />}
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
            <Link href="/history/audit">Audits</Link>
            <Link href="/history/learning">Learnings</Link>
          </nav>
          <span className="local-badge">Private · local</span>
        </header>
        {children}
        <ContentMotion />
      </body>
    </html>
  );
}
