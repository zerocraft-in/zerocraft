import { cn } from "@/lib/utils";
import "@/styles/wrapper.scss"
const MaxWidthWrapper = ({
  className,
  children,
  id,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("max-wrapper", className)} id={id}>
      {children}
    </div>
  );
};

export default MaxWidthWrapper;
