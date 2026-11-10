import { Spinner } from "@zerocraft/ui/components/spinner";

export default function Loading() {
  return (
    <div
      className="flex min-h-[calc(100vh-7rem)] items-center justify-center"
    >
      <Spinner className="size-6 text-primary" aria-label="Loading Studio" />
    </div>
  );
}
