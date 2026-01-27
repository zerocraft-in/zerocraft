import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";

interface zcLinkProps {
  href?: string;
  children?: ReactNode;
  title?: ReactNode;
  className?: string;
}

const zcLink: React.FC<zcLinkProps> = ({
  href = "/",
  children,
  title,
  className = "",
}) => {
  return (
    <Link href={href} className={`zc-link ${className}`}>
      <span className="zc-link__title">{title}</span>

      {children}

      <span className="zc-link__icon-wrapper">
        <ArrowUpRight className="zc-link__icon" />
      </span>
    </Link>
  );
};

export default zcLink;
