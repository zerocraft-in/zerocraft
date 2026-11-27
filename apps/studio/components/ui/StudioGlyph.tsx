export default function StudioGlyph({
  variant = "plus",
  size = 18,
  className = "",
}: {
  variant?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        fontSize: size,
      }}
    >
      {variant === "close" ? "×" : variant === "plus" ? "+" : variant === "spark" ? "✦" : "·"}
    </span>
  );
}
