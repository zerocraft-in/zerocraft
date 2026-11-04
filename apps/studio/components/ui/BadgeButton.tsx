import Link from "next/link";
import ArrowIcon from "./ArrowIcon";

export default function BadgeButton({ href, text }: { href: string; text: string }) {
  return (
    <Link className="badge-btn" href={href}>
      <span className="badge-btn__text">{text}</span>
      <span className="badge-btn__icon" aria-hidden="true">
        <ArrowIcon direction="up-right" size={14} className="badge-btn__arrow" />
        <ArrowIcon direction="up-right" size={14} className="badge-btn__arrow badge-btn__arrow--incoming" />
      </span>
    </Link>
  );
}
