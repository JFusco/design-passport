export function LoadingSignal({ large = false }: { large?: boolean }) {
  return (
    <svg className={large ? "loading-signal large" : "loading-signal"} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle className="signal-track" cx="32" cy="32" r="28" />
      <circle className="signal-orbit" cx="32" cy="32" r="28" pathLength="100" />
      <g transform="translate(13.55 13.55) scale(2)">
        <path d="M12.3007.275391 9.22554 3.35057h6.15036v6.15036l3.0752-3.07518V.275391Z" />
        <path d="M6.15036.275391H0v6.15036l3.07518 3.07518h6.15036V3.35057Z" />
        <path d="M3.07518 9.50093 0 12.5761v6.1504h6.15036l3.07518-3.0752H3.07518Z" />
        <path d="M15.3759 9.50093H9.22554v6.15037l3.07516 3.0752h6.1504v-6.1504Z" />
      </g>
    </svg>
  );
}
