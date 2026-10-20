export default function ArrowIcon({ direction = "right", size = 16, className = "" }: { direction?: "right" | "up-right" | "down"; size?: number; className?: string }) {
  const glyph = direction === "up-right" ? "↗" : direction === "down" ? "↓" : "→";
  return <span aria-hidden="true" className={className} style={{ fontSize: size, lineHeight: 1 }}>{glyph}</span>;
}
