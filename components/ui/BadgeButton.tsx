import Link from "next/link";

// Inline path from public/assets/down.svg, rotated toward the destination.
const arrowPath = "M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z";

interface BadgeButtonProps {
  href: string;
  text: string;
  className?: string;
  target?: string;
}

export default function BadgeButton({ href, text, className = "", target }: BadgeButtonProps) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const Component = external ? "a" : Link;
  return (
    <Component href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={`badge-btn ${className}`}>
      <span className="badge-btn__text">{text}</span>
      <span className="badge-btn__icon" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor" className="badge-btn__arrow"><path d={arrowPath} transform="rotate(-90 9 9)" /></svg>
        <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor" className="badge-btn__arrow badge-btn__arrow--incoming"><path d={arrowPath} transform="rotate(-90 9 9)" /></svg>
      </span>
    </Component>
  );
}
