import Link from "next/link";

export default function BadgeButton({ href, text, className = "" }: { href: string; text: string; className?: string }) {
  return <Link className={`badge-button ${className}`.trim()} href={href}>{text}</Link>;
}
