import Link from "next/link";
import { IconArrowLeft, IconSearch } from "@/components/store/StoreIcon";

export default function NotFound() {
  return (
    <div className="py-24 min-h-[75vh] flex items-center justify-center text-center">
      <div className="container-site max-w-lg space-y-6">
        <span className="text-label text-lime-600 dark:text-lime-400 block font-mono">
          Error 404
        </span>

        <h1 className="text-6xl sm:text-8xl font-bold tracking-tight font-mono text-neutral-900 dark:text-white">
          404
        </h1>

        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Page Not Found
        </h2>

        <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
          The requested page or handcrafted piece could not be located. It may have been archived or moved to a new collection.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/store"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <IconArrowLeft size={16} /> Return to Store Home
          </Link>
          <Link
            href="/store/shop"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            <IconSearch size={16} /> Browse Shop Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
