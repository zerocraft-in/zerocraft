type StudioGlyphProps = {
  variant: "plus" | "close";
  size?: number;
  className?: string;
};

// Five-by-five pixel geometry echoes the square modules in assets/down.svg.
const cells = {
  plus: [
    [2, 0], [2, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    [2, 3], [2, 4],
  ],
  close: [
    [0, 0], [4, 0], [1, 1], [3, 1], [2, 2],
    [1, 3], [3, 3], [0, 4], [4, 4],
  ],
} as const;

export default function StudioGlyph({ variant, size = 18, className }: StudioGlyphProps) {
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} className={className} fill="currentColor" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {cells[variant].map(([column, row]) => (
        <rect key={`${column}-${row}`} x={column * 3.6} y={row * 3.6} width="3.6" height="3.6" />
      ))}
    </svg>
  );
}
