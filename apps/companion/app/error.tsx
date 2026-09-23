"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="centered-state">
      <div className="state-card" role="alert">
        <span className="eyebrow">Workspace unavailable</span>
        <h1>We could not load the companion</h1>
        <p>The local workspace may be busy or unavailable. Your files were not changed by this page load.</p>
        <button className="button primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
