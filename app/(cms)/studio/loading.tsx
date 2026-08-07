import { IconLoader2 } from "@tabler/icons-react";

export default function StudioLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <IconLoader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">
        Loading studio...
      </p>
    </div>
  );
}
