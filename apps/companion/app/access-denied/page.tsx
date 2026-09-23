export default function AccessDeniedPage() {
  return (
    <main id="main-content" className="centered-state">
      <div className="state-card">
        <span className="eyebrow">Private local session</span>
        <h1>This link is not authorized</h1>
        <p>Return to the terminal and open the current companion URL. Local access links expire when the companion stops.</p>
      </div>
    </main>
  );
}
