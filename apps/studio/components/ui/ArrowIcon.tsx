export default function ArrowIcon({
  size = 16,
  direction = "up-right",
  className = "",
}: {
  direction?: "up-right" | "down" | "up" | "right";
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`arrow-icon arrow-icon--${direction} ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 10.8h-3.6V7.2H18v3.6ZM7.2 14.4V18h3.6v-3.6h3.6v-3.6h-3.6V0H7.2v10.8H3.6v3.6h3.6ZM3.6 10.8V7.2H0v3.6h3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
