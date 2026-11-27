/** Zerocraft mark + wordmark. Plain CSS (see styles/ui.css). */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`zc-mark ${className}`}>
      Z
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="zc-wordmark">
      <Mark />
      <span className="zc-wordmark-text">
        <b>Zerocraft</b>
        <small>Accounts</small>
      </span>
    </span>
  );
}
