export default function StudioGlyph({ variant, size = 24, className = "" }: { variant: "discover" | "explore" | "craft" | "deliver" | "plus" | "close"; size?: number; className?: string }) {
  const glyph = variant === "plus" ? "+" : variant === "close" ? "×" : variant === "discover" ? "◉" : variant === "explore" ? "⌕" : variant === "craft" ? "✦" : "✓";
  return <span aria-hidden="true" className={className} style={{ display: "inline-grid", placeItems: "center", width: size, height: size, fontSize: size * 0.7, lineHeight: 1 }}>{glyph}</span>;
}
