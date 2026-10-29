import { PageState } from "@/components/studio/page-state";

export default function NewProductRouteLoading() {
  return <div className="grid min-h-screen place-items-center bg-background p-6"><PageState kind="loading" title="Opening product editor" description="Preparing a new INR catalog product." className="w-full max-w-xl" /></div>;
}
