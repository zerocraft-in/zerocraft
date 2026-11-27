import { PageState } from "@/components/commerce/page-state";

export default function ProductRouteLoading() {
  return <div className="grid min-h-screen place-items-center bg-background p-6"><PageState kind="loading" title="Opening product" description="Preparing product details and inventory." className="w-full max-w-xl" /></div>;
}
