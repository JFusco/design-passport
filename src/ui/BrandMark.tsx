interface BrandMarkProps {
  className?: string;
  title?: string;
}

const SEGMENT = "M 0 20 L 0 0 L 20 0 L 32 12 L 32 32 L 12 32 L 0 20 Z";

export function BrandMark({ className, title }: BrandMarkProps) {
  const accessible = Boolean(title);
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={accessible ? "img" : undefined}
      aria-label={title}
      aria-hidden={accessible ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        <path d={SEGMENT} />
        <path d={SEGMENT} transform="rotate(90 32 32)" />
        <path d={SEGMENT} transform="rotate(180 32 32)" />
        <path d={SEGMENT} transform="rotate(270 32 32)" />
      </g>
    </svg>
  );
}
