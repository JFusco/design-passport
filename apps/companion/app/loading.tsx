import { LoadingSignal } from "./components/LoadingSignal";

export default function Loading() {
  return (
    <main id="main-content" className="centered-state loading-screen">
      <div className="loading-status" role="status">
        <LoadingSignal large />
        <span>Preparing your workspace…</span>
      </div>
    </main>
  );
}
