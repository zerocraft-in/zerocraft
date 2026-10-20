import type { HTMLAttributes, PropsWithChildren } from "react";

export default function Container({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div className={`container-site ${className}`.trim()} {...props}>{children}</div>;
}
