type ArrowIconProps = {
  direction?: "down" | "right" | "up" | "up-right";
  size?: number;
  className?: string;
};

// The exact mark from public/assets/down.svg, kept inline so it follows text color.
const path = "M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z";
const rotation = { down: 0, right: -90, up: 180, "up-right": 225 };

export default function ArrowIcon({ direction = "down", size = 16, className }: ArrowIconProps) {
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} className={className} aria-hidden="true" focusable="false" fill="currentColor">
      <path d={path} transform={`rotate(${rotation[direction]} 9 9)`} />
    </svg>
  );
}
