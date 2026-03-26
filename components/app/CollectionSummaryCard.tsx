"use client";

import { motion } from "framer-motion";
import AppShellCard from "./AppShellCard";
import StatCard from "./StatCard";

type SavedBag = {
  id: number;
  brand: string;
  model: string;
  estimated_low: number;
  estimated_high: number;
};

type CollectionSummaryCardProps = {
  totalLow: number;
  totalHigh: number;
  totalItems: number;
  wishlistCount: number;
  topBrands: string[];
  mostValuableBag: SavedBag | null;
  onDownload: () => void;
  isDownloading: boolean;
  message: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CollectionSummaryCard({
  totalLow,
  totalHigh,
  totalItems,
  wishlistCount,
  topBrands,
  mostValuableBag,
  onDownload,
  isDownloading,
  message,
}: CollectionSummaryCardProps) {
  return (
    <AppShellCard className="p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-[#8B7E72]">
            Collection overview
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            Your archive at a glance
          </h2>

          <p className="mt-3 max-w-xl text-sm text-[#6E645B]">
            A refined summary of your collection, valuation range, and notable pieces.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onDownload}
          disabled={isDownloading}
          className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-sm transition hover:bg-[#F8F3EE] disabled:opacity-60"
        >
          {isDownloading ? "Preparing PDF..." : "Download collection overview"}
        </motion.button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Estimated value"
          value={`${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`}
          subtext="Directional valuation range"
        />

        <StatCard
          label="Pieces"
          value={`${totalItems}`}
          subtext="Total archived items"
        />

        <StatCard
          label="Wishlist"
          value={`${wishlistCount}`}
          subtext="Tracked acquisitions"
        />

        <StatCard
          label="Top brands"
          value={
            topBrands.length > 0
              ? topBrands.slice(0, 2).join(", ")
              : "—"
          }
          subtext="Most represented labels"
        />

        <StatCard
          label="Signature piece"
          value={
            mostValuableBag
              ? `${mostValuableBag.brand}`
              : "—"
          }
          subtext={
            mostValuableBag
              ? mostValuableBag.model
              : "Highest estimated value"
          }
        />

        <StatCard
          label="Market context"
          value="Coming soon"
          subtext="Comparable market data will appear here once available."
        />
      </div>

      {message && (
        <div className="mt-4 text-sm text-[#6E645B]">
          {message}
        </div>
      )}
    </AppShellCard>
  );
}