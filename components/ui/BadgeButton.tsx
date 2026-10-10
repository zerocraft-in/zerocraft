import Link from "next/link";
import ArrowIcon from "@/components/ui/ArrowIcon";

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
        <ArrowIcon direction="right" size={15} className="badge-btn__arrow" />
        <ArrowIcon direction="right" size={15} className="badge-btn__arrow badge-btn__arrow--incoming" />
      </span>
    </Component>
  );
}
