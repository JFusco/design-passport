import Link from "next/link";

export default function SetupPage() {
  return (
    <main id="main-content" className="centered-state">
      <div className="state-card">
        <span className="eyebrow">Setup required</span>
        <h1>Start the local companion</h1>
        <p>Build the companion, then launch it from the repository so it can open a private local session.</p>
        <code>pnpm companion:build</code>
        <code>pnpm companion knowledge review</code>
        <Link className="text-link" href="/">Check again</Link>
      </div>
    </main>
  );
}
