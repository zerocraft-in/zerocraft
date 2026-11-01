import type { HTMLAttributes, PropsWithChildren } from "react";

export default function Reveal({ children, className = "", delay = 0, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>> & { delay?: number }) {
  return <div {...props} className={`reveal ${className}`.trim()} style={{ ...props.style, animationDelay: `${delay}s` }}>{children}</div>;
}
