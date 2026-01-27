
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
    <div className={`max-wrapper ${className}`} id={id}>
      {children}
    </div>
  );
};

export default MaxWidthWrapper;
