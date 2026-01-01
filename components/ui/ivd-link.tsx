import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";

interface IvdLinkProps {
  href?: string;
  children?: ReactNode;
  title?: ReactNode;
  className?: string;
}

const IvdLink: React.FC<IvdLinkProps> = ({
  href = "/",
  children,
  title,
  className = "",
}) => {
  return (
    <Link
      href={href}
      className={`flex items-center flex-nowrap gap-1 p-2 cursor-pointer group text-sm ${className}`}
    >
      <span className="px-2 text-primary"> {title}</span>
      {children}
      <span className="rounded-full backdrop-blur-md border-primary border bg-accent-primary w-6 h-6 flex items-center justify-center">
        <ArrowUpRight className="w-4 h-4 text-primary  transition-transform duration-300 group-hover:rotate-45" />
      </span>
    </Link>
  );
};

export default IvdLink;
