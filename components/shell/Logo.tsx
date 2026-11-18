/** Our own simple mark: a ring with a "Y" (Cost of Yes). Not Sirion's logo. */
export function Logo({ className = 'h-9 w-9', color = 'white' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-label="Cost of Yes" role="img">
      <circle cx="20" cy="20" r="16.5" fill="none" stroke={color} strokeWidth="2.6" />
      <path d="M13.5 12.5 L20 20.5 L26.5 12.5 M20 20.5 V28.5" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
